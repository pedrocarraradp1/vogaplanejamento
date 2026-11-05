import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { calcularCustoInventario, calcularEspolio, calcularImpactoReforma } from "./calculos.ts"
import {
  gerarParecer,
  montarPerfil,
  montarSimulacoes,
  pacoteConsultoria,
  type PlanoConsultoria,
  type TriagemConsultoria,
} from "./consultoria.ts"
import { calcularEstateTax } from "./estate-tax-eua.ts"
import {
  calcularComparadorHolding,
  DEFAULT_SUCESSAO_HOLDING,
  irpfAluguelNaDeclaracao,
} from "./holding.ts"

const HOJE = new Date("2026-11-05T12:00:00-03:00")

function empresarioSP(): { plano: PlanoConsultoria; triagem: TriagemConsultoria } {
  const imoveis = [1, 2, 3, 4].map((n) => ({
    id: `imo-${n}`,
    tipo: "imobilizado",
    descricao: "Imóvel Investimento",
    valor: 1_500_000,
    valorIrpf: 400_000,
    aluguelMensal: 7_500,
    uf: "SP",
    municipio: "São Paulo",
    tipoImovel: "residencial",
  }))
  return {
    plano: {
      dadosPessoais: {
        nome: "Empresário SP",
        nascimento: "1975-03-10",
        estadoCivil: "casado",
        regime: "Comunhão Parcial de Bens",
        uf: "SP",
        renda: 40_000,
        fontesRenda: [{ tipo: "salario", valorMensal: 40_000 }],
        filhos: [
          { nome: "Ana", dataNascimento: "2002-01-01" },
          { nome: "Bruno", dataNascimento: "2004-06-01" },
        ],
      },
      ativos: [
        ...imoveis,
        {
          id: "emp",
          tipo: "participacao_societaria",
          descricao: "Empresa",
          empresa: "ABC Participações",
          valor: 2_000_000,
        },
        { id: "cx", tipo: "ativo_liquido", descricao: "Ativos Nacionais", valor: 80_000, localizacao: "nacional" },
      ],
      passivos: [],
      seguros: [],
    },
    triagem: {
      testamento: "Não",
      holdingExistente: "Não",
      preocupacaoInventario: "Alta",
      preocupacaoItcmd: "Alta",
      aceitaHolding: true,
      aceitaDoacao: true,
      aceitaSeguro: true,
    },
  }
}

function servidorBSB(): { plano: PlanoConsultoria; triagem: TriagemConsultoria } {
  return {
    plano: {
      dadosPessoais: {
        nome: "Servidor BSB",
        nascimento: "1980-08-20",
        estadoCivil: "solteiro",
        regime: "Separação Total de Bens",
        uf: "DF",
        renda: 25_000,
        fontesRenda: [{ tipo: "salario", valorMensal: 25_000 }],
        filhos: [],
      },
      ativos: [
        {
          id: "liq",
          tipo: "ativo_liquido",
          descricao: "Ativos Nacionais",
          valor: 2_200_000,
          localizacao: "nacional",
        },
      ],
    },
    triagem: {
      testamento: "Sim",
      planejamentoRealizado: "Em andamento",
      preocupacaoInventario: "Baixa",
      aceitaPrevidencia: true,
    },
  }
}

function clienteEUA(): { plano: PlanoConsultoria; triagem: TriagemConsultoria } {
  return {
    plano: {
      dadosPessoais: {
        nome: "Cliente EUA",
        nascimento: "1970-11-11",
        estadoCivil: "casado",
        regime: "Comunhão Parcial de Bens",
        uf: "SP",
        renda: 20_000,
        filhos: [{ nome: "Lia", dataNascimento: "1998-02-02" }],
      },
      ativos: [
        {
          id: "us",
          tipo: "ativo_liquido",
          descricao: "Ativos Internacionais",
          valor: 400_000,
          localizacao: "internacional",
        },
      ],
      sucessao: { simulador: { bensEuaUSD: 400_000, cambio: 5 } },
    },
    triagem: {
      testamento: "Não",
      bensNoExterior: "Sim",
      preocupacaoInventario: "Média",
    },
  }
}

function assertOrigem(plano: PlanoConsultoria, triagem: TriagemConsultoria) {
  const parecer = gerarParecer(plano, triagem, { agora: HOJE })
  const perfil = montarPerfil(plano, HOJE)
  const sim = montarSimulacoes(plano, perfil, triagem)
  const espolio = calcularEspolio({
    domicilioUF: perfil.uf,
    modalidade: "causa_mortis",
    bens: perfil.bensEspolio,
  })
  assert.equal(parecer.simulacoes.espolio.imposto, espolio.imposto)
  assert.equal(parecer.simulacoes.espolio.patrimonio, espolio.patrimonio)
  const inv = calcularCustoInventario({
    uf: perfil.uf,
    patrimonio: espolio.patrimonio,
    via: sim.via,
    honorariosPct: 0.06,
    custasPct: 0.015,
    diasAteAbertura: 30,
  })
  assert.equal(parecer.simulacoes.inventario.total, inv.total)
  assert.equal(parecer.simulacoes.inventario.itcmd, inv.itcmd)
  const reforma = calcularImpactoReforma({
    uf: perfil.uf,
    patrimonio: espolio.patrimonio,
    holding: perfil.participacoes,
    imoveis: perfil.imoveis,
    previdencia: perfil.previdenciaPGBL + perfil.previdenciaVGBL,
    exterior: perfil.euaUSD,
  })
  assert.equal(parecer.simulacoes.reforma.aumento, reforma.aumento)
  assert.equal(parecer.simulacoes.reforma.impostoHoje, reforma.impostoHoje)
  if (perfil.euaUSD > 0) {
    const estate = calcularEstateTax(perfil.euaUSD, 5)
    assert.ok(parecer.simulacoes.estate)
    assert.equal(parecer.simulacoes.estate?.imposto, estate.imposto)
  } else {
    assert.equal(parecer.simulacoes.estate, null)
  }
  if (parecer.simulacoes.holding) {
    const h = calcularComparadorHolding({
      ...DEFAULT_SUCESSAO_HOLDING,
      imoveis: perfil.imoveisHolding,
      herdeiros: perfil.herdeiros,
      ufDomicilio: perfil.uf,
      regimeBens: perfil.regimeBens,
      outrosRendimentosAnuais: perfil.outrosRendimentosAnuais,
      viaInventario: sim.via,
      honorariosPct: 6,
      custasPct: 1.5,
      diasAteAbertura: 30,
    })
    assert.equal(parecer.simulacoes.holding.vpl, h.vpl)
    assert.equal(parecer.simulacoes.holding.economiaAnos, h.economiaAnos)
    assert.equal(parecer.fiscal.irpfAluguelPF, parecer.simulacoes.holding.anos[0]?.pfIrpf)
  }
  if (perfil.aluguelMensal > 0) {
    const ir = irpfAluguelNaDeclaracao(perfil.aluguelMensal * 12, perfil.outrosRendimentosAnuais)
    assert.equal(parecer.fiscal.irpfAluguelPF, ir)
  }
  const liquidez = inv.total > 0 ? Math.round((perfil.liquidos / inv.total) * 100) / 100 : null
  if (liquidez != null && parecer.simulacoes.liquidez != null) {
    assert.equal(parecer.simulacoes.liquidez, liquidez)
  }
  const json = JSON.parse(JSON.stringify(parecer))
  assert.equal(json.recomendacao.primeira, parecer.recomendacao.primeira)
  const pacote = pacoteConsultoria(parecer, triagem)
  assert.equal(pacote.geradoEm, parecer.geradoEm)
  return parecer
}

describe("Consultoria — empresário SP", () => {
  it("estratégia nº 1 é o plano holding + liquidez (e números batem com a origem)", () => {
    const { plano, triagem } = empresarioSP()
    const parecer = assertOrigem(plano, triagem)
    assert.equal(parecer.recomendacao.primeira, "holding_doacao_seguro")
    assert.equal(parecer.perfil.imoveisAlugados, 4)
    assert.equal(parecer.perfil.filhos.length, 2)
    assert.ok(parecer.fiscal.irpfAluguelPF > 0)
    assert.ok(parecer.diagnostico.riscos.length > 0)
  })
})

describe("Consultoria — servidor BSB", () => {
  it("estratégia nº 1 é previdência sucessória (sem empresa) e números batem", () => {
    const { plano, triagem } = servidorBSB()
    const parecer = assertOrigem(plano, triagem)
    assert.equal(parecer.recomendacao.primeira, "previdencia_vgbl_pgbl")
    assert.equal(parecer.perfil.participacoes, 0)
    assert.equal(parecer.simulacoes.holding, null)
  })
})

describe("Consultoria — ações nos EUA", () => {
  it("estratégia nº 1 é testamento e o estate tax replica calcularEstateTax", () => {
    const { plano, triagem } = clienteEUA()
    const parecer = assertOrigem(plano, triagem)
    assert.equal(parecer.recomendacao.primeira, "testamento")
    assert.ok((parecer.simulacoes.estate?.imposto ?? 0) > 0)
    const estateRisco = parecer.diagnostico.riscos.find((r) => r.id === "estate-tax")
    assert.ok(estateRisco)
    assert.equal(estateRisco?.fonte, "calcularEstateTax")
  })
})
