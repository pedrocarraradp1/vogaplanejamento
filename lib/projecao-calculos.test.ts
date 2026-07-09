import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  calcularKPIs,
  calcularProjecao,
  resolverIdadeLiberdadeFinanceira,
  retiradaLiquidaDoPatrimonio,
} from "./engine.ts"
import { buildBlocosAporte, resolveAporteParaPremissas } from "./renda-utils.ts"

describe("aporte personalizado por bloco de 5 anos", () => {
  const inflacaoPct = 4
  const inf = inflacaoPct / 100
  const blocos = buildBlocosAporte(15)
  const aportesReais = [1000, 2000, 3000]

  const { aportePorAnoNominal } = resolveAporteParaPremissas(
    [],
    [],
    {
      prazo: 30,
      inflacao: inflacaoPct,
      aporteModo: "periodos",
      aportePeriodosReal: aportesReais,
      idadeAtual: 40,
      idadeApos: 55,
    },
    blocos,
  )

  it("indexa aporte nominal por anosDecorridos = t desde o ano 0", () => {
    assert.ok(Math.abs(aportePorAnoNominal[0] - 1000) < 0.01)
    assert.ok(Math.abs(aportePorAnoNominal[4] - 1000 * Math.pow(1 + inf, 4)) < 0.01)
    assert.ok(Math.abs(aportePorAnoNominal[5] - 2000 * Math.pow(1 + inf, 5)) < 0.01)
    assert.ok(Math.abs(aportePorAnoNominal[9] - 2000 * Math.pow(1 + inf, 9)) < 0.01)
    assert.ok(Math.abs(aportePorAnoNominal[10] - 3000 * Math.pow(1 + inf, 10)) < 0.01)
  })

  it("transição entre blocos respeita inflação acumulada desde o ano 0", () => {
    const fimBloco0 = aportePorAnoNominal[4]
    const inicioBloco1 = aportePorAnoNominal[5]
    const esperado = (aportesReais[1] / aportesReais[0]) * (1 + inf)
    assert.ok(Math.abs(inicioBloco1 / fimBloco0 - esperado) < 0.0001)
  })

  it("mantém crescimento nominal dentro de cada bloco", () => {
    assert.ok(Math.abs(aportePorAnoNominal[6] / aportePorAnoNominal[5] - (1 + inf)) < 0.000001)
    assert.ok(Math.abs(aportePorAnoNominal[11] / aportePorAnoNominal[10] - (1 + inf)) < 0.000001)
  })

  it("não gera salto abrupto na curva de patrimônio entre blocos consecutivos", () => {
    const proj = calcularProjecao(
      {
        saldoInicial: 500_000,
        aporteM: 1000,
        rendimento: 9,
        inflacao: inflacaoPct,
        idadeAtual: 40,
        prazo: 15,
        idadeApos: 65,
        retiradaMensal: 0,
        rendaAposentadoria: 0,
        novaEntrada: 0,
        idadeEntrada: 0,
        aportePorAnoNominal,
      },
      [],
    )

    const delta34 = proj[4].saldoNominal - proj[3].saldoNominal
    const delta45 = proj[5].saldoNominal - proj[4].saldoNominal
    const delta910 = proj[10].saldoNominal - proj[9].saldoNominal
    const delta1011 = proj[11].saldoNominal - proj[10].saldoNominal

    const ratio45 = Math.abs(delta45) / Math.max(1, Math.abs(delta34))
    const ratio1011 = Math.abs(delta1011) / Math.max(1, Math.abs(delta910))

    assert.ok(ratio45 > 0.4 && ratio45 < 4)
    assert.ok(ratio1011 > 0.4 && ratio1011 < 4)
  })
})

describe("Liberdade Financeira e retirada líquida", () => {
  const premissas = {
    saldoInicial: 2_000_000,
    aporteM: 5000,
    rendimento: 10.2,
    inflacao: 4,
    idadeAtual: 45,
    prazo: 40,
    idadeApos: 65,
    retiradaMensal: 50_000,
    rendaAposentadoria: 10_000,
    novaEntrada: 0,
    idadeEntrada: 0,
  }

  it("calcula retirada líquida do patrimônio", () => {
    assert.equal(retiradaLiquidaDoPatrimonio(premissas), 40_000)
  })

  it("nunca exibe idade LF acima da aposentadoria", () => {
    const proj = calcularProjecao(premissas, [])
    const lf = resolverIdadeLiberdadeFinanceira(proj, premissas, [])
    if (lf.idade != null) {
      assert.ok(lf.idade <= premissas.idadeApos)
    }
    if (lf.idadeCalculada != null && lf.idadeCalculada > premissas.idadeApos) {
      assert.equal(lf.travadaNaAposentadoria, true)
      assert.equal(lf.idade, premissas.idadeApos)
      assert.ok(lf.aviso)
    }
  })

  it("usa retirada líquida no patrimônio necessário (KPI)", () => {
    const proj = calcularProjecao(premissas, [])
    const kpis = calcularKPIs(proj, premissas, 80_000, 31_000, [])
    assert.equal(kpis.retiradaLiquidaMensal, 40_000)
    assert.ok(kpis.necessidadeAnualTotal >= 40_000 * 12)
    if (kpis.idadeLF != null) {
      assert.ok(kpis.idadeLF <= premissas.idadeApos)
    }
  })
})
