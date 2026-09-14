import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  parseValorMoeda,
  resolveSubcategoriaLiquido,
  sumAtivoTipo,
  normalizeAtivoRecord,
  parsePercentualParticipacaoDigitado,
  formatPercentualParticipacao,
  labelEmpresaParticipacao,
  agruparAtivosPorEmpresa,
  EMPRESA_PARTICIPACAO_NAO_INFORMADA,
  calcularComposicaoLiquidosPorLocalizacao,
} from "./patrimonio-utils.ts"
import type { Ativo } from "./plano-context.tsx"

describe("parseValorMoeda", () => {
  it("preserva centavos em formato pt-BR", () => {
    assert.equal(parseValorMoeda("1500,75"), 1500.75)
    assert.equal(parseValorMoeda("1.500,75"), 1500.75)
  })

  it("preserva centavos em formato com ponto decimal", () => {
    assert.equal(parseValorMoeda("1500.75"), 1500.75)
  })

  it("converte máscara só dígitos (centavos)", () => {
    assert.equal(parseValorMoeda("150075"), 1500.75)
  })
})

describe("Cambial/Dólar na agregação", () => {
  const ativoCambial: Ativo = {
    id: "cambial-1",
    tipo: "ativo_liquido",
    descricao: "Cambial / Dólar",
    subcategoria: "cambial",
    valor: 10_000,
    instituicao: "XP",
    localizacao: "internacional",
  }

  it("resolve subcategoria cambial pelo slug ou rótulo", () => {
    assert.equal(resolveSubcategoriaLiquido(ativoCambial), "cambial")
    assert.equal(
      resolveSubcategoriaLiquido({ descricao: "Cambial / Dólar", subcategoria: undefined }),
      "cambial",
    )
  })

  it("soma no total de ativos líquidos", () => {
    const normalizado = normalizeAtivoRecord(ativoCambial)
    const total = sumAtivoTipo([normalizado], "ativo_liquido")
    assert.equal(total, 10_000)
    assert.equal(normalizado.subcategoria, "cambial")
    assert.equal(normalizado.descricao, "Cambial / Dólar")
  })
})

describe("Participação societária — empresa e percentual", () => {
  it("aceita vírgula e valida 0–100", () => {
    assert.deepEqual(parsePercentualParticipacaoDigitado("12,5"), {
      empty: false,
      valid: true,
      value: 12.5,
    })
    assert.deepEqual(parsePercentualParticipacaoDigitado("0"), {
      empty: false,
      valid: true,
      value: 0,
    })
    assert.deepEqual(parsePercentualParticipacaoDigitado("100"), {
      empty: false,
      valid: true,
      value: 100,
    })
    assert.equal(parsePercentualParticipacaoDigitado("").valid, true)
    assert.equal(parsePercentualParticipacaoDigitado("").empty, true)
    assert.equal(parsePercentualParticipacaoDigitado("101").valid, false)
    assert.equal(parsePercentualParticipacaoDigitado("-1").valid, false)
    assert.equal(parsePercentualParticipacaoDigitado("abc").valid, false)
  })

  it("formata percentual com vírgula", () => {
    assert.equal(formatPercentualParticipacao(12.5), "12,5%")
    assert.equal(formatPercentualParticipacao(12), "12%")
    assert.equal(formatPercentualParticipacao(0), "0%")
  })

  it("usa fallback sem empresa e agrupa por nome", () => {
    assert.equal(labelEmpresaParticipacao(undefined), EMPRESA_PARTICIPACAO_NAO_INFORMADA)
    assert.equal(labelEmpresaParticipacao("  "), EMPRESA_PARTICIPACAO_NAO_INFORMADA)
    assert.equal(labelEmpresaParticipacao("ACME Ltda"), "ACME Ltda")

    const grupos = agruparAtivosPorEmpresa([
      {
        id: "1",
        tipo: "participacao_societaria",
        descricao: "Empresa",
        valor: 100,
        empresa: "ACME",
      },
      {
        id: "2",
        tipo: "participacao_societaria",
        descricao: "Holding",
        valor: 50,
        empresa: "ACME",
      },
      {
        id: "3",
        tipo: "participacao_societaria",
        descricao: "Empresa",
        valor: 10,
      },
    ])
    assert.equal(Object.keys(grupos).length, 2)
    assert.equal(grupos.ACME.length, 2)
    assert.equal(grupos[EMPRESA_PARTICIPACAO_NAO_INFORMADA].length, 1)
  })

  it("preserva campos em ativos novos e ignora em ativos antigos/outros tipos", () => {
    const antigo: Ativo = {
      id: "old",
      tipo: "participacao_societaria",
      descricao: "Empresa",
      valor: 1000,
    }
    const normalizadoAntigo = normalizeAtivoRecord(antigo)
    assert.equal(normalizadoAntigo.empresa, undefined)
    assert.equal(normalizadoAntigo.percentualParticipacao, undefined)
    assert.equal(normalizadoAntigo.valor, 1000)

    const novo = normalizeAtivoRecord({
      id: "new",
      tipo: "participacao_societaria",
      descricao: "Holding",
      valor: 2000,
      empresa: "  Família Silva  ",
      percentualParticipacao: 12.5,
    })
    assert.equal(novo.empresa, "Família Silva")
    assert.equal(novo.percentualParticipacao, 12.5)

    const liquido = normalizeAtivoRecord({
      id: "liq",
      tipo: "ativo_liquido",
      descricao: "Carteira geral",
      subcategoria: "carteira_geral",
      valor: 100,
      empresa: "Não deve ficar",
      percentualParticipacao: 50,
    })
    assert.equal(liquido.empresa, undefined)
    assert.equal(liquido.percentualParticipacao, undefined)
  })
})

describe("calcularComposicaoLiquidosPorLocalizacao", () => {
  const liquido = (
    id: string,
    valor: number,
    localizacao?: string,
  ): Ativo => ({
    id,
    tipo: "ativo_liquido",
    descricao: "Carteira geral",
    subcategoria: "carteira_geral",
    valor,
    localizacao,
  })

  it("divide nacional e internacional sobre o total de líquidos", () => {
    const resultado = calcularComposicaoLiquidosPorLocalizacao([
      liquido("n1", 824),
      liquido("i1", 176, "internacional"),
      { id: "imo", tipo: "imobilizado", descricao: "Casa/Apto Residencial", valor: 9_000 },
      liquido("zero", 0, "internacional"),
    ])
    assert.ok(resultado)
    assert.equal(resultado.nacional, 824)
    assert.equal(resultado.internacional, 176)
    assert.equal(resultado.total, 1_000)
    assert.equal(Number(resultado.percentualNacional.toFixed(1)), 82.4)
    assert.equal(Number(resultado.percentualInternacional.toFixed(1)), 17.6)
  })

  it("ignora filtro: soma sempre o total dos líquidos", () => {
    const resultado = calcularComposicaoLiquidosPorLocalizacao([
      liquido("n1", 80, "nacional"),
      liquido("i1", 20, "internacional"),
    ])
    assert.ok(resultado)
    assert.equal(resultado.total, 100)
    assert.equal(resultado.nacional, 80)
    assert.equal(resultado.internacional, 20)
  })

  it("trata localização vazia ou outros como nacional", () => {
    const resultado = calcularComposicaoLiquidosPorLocalizacao([
      liquido("sem-loc", 50),
      liquido("outros", 25, "outros"),
      liquido("nac", 25, "nacional"),
    ])
    assert.ok(resultado)
    assert.equal(resultado.nacional, 100)
    assert.equal(resultado.internacional, 0)
    assert.equal(resultado.percentualNacional, 100)
  })

  it("devolve null quando não há ativos líquidos com valor positivo", () => {
    assert.equal(calcularComposicaoLiquidosPorLocalizacao([]), null)
    assert.equal(
      calcularComposicaoLiquidosPorLocalizacao([
        { id: "imo", tipo: "imobilizado", descricao: "Terreno", valor: 100 },
        liquido("zero", 0, "nacional"),
      ]),
      null,
    )
  })
})
