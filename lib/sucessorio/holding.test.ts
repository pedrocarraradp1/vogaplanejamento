import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  calcularComparadorHolding,
  calcularCustoEntradaHolding,
  irpfAluguelNaDeclaracao,
  tributosLucroPresumidoLocacao,
  type HoldingInput,
} from "./holding.ts"
import { DEFAULT_SUCESSAO_HOLDING } from "./tipos.ts"

function casoReferencia(): HoldingInput {
  const valorMercado = 6_000_000 / 5
  const valorIrpf = 2_500_000 / 5
  const aluguel = 30_000 / 5
  return {
    ...DEFAULT_SUCESSAO_HOLDING,
    imoveis: Array.from({ length: 5 }, (_, i) => ({
      id: `ref-${i}`,
      descricao: `Imóvel ${i + 1}`,
      valorMercado,
      valorIrpf,
      aluguelMensal: aluguel,
      tipo: "residencial" as const,
      uf: "SP",
      municipio: "São Paulo",
    })),
    despesasDedutiveisMensais: 4_000,
    outrosRendimentosAnuais: 300_000,
    herdeiros: 2,
    ufDomicilio: "SP",
    custoMensal: 1_500,
    custoAbertura: 15_000,
    aliquotaItbi: 0.03,
    itbiSobreExcedente: true,
    imunidadeItbi: false,
    integralizacao: "custo",
    distribuicao: "total",
    percentualDistribuicao: 1,
    doacaoUsufruto: true,
    horizonteAnos: 10,
    reajusteAluguel: 0.045,
    taxaDesconto: 0.1,
    anoInicio: 2026,
  }
}

describe("IRPF do aluguel na declaração", () => {
  it("R$ 30 mil/mês − R$ 4 mil de despesas + R$ 300 mil de outros → ≈ R$ 85.800", () => {
    const ir = irpfAluguelNaDeclaracao((30_000 - 4_000) * 12, 300_000)
    assert.equal(ir, 85_800)
  })
})

describe("Lucro presumido de locação", () => {
  it("R$ 360 mil/ano + custo R$ 1.500/mês → federal 40.788, carga 58.788", () => {
    const t = tributosLucroPresumidoLocacao(360_000)
    assert.equal(t.irpj, 17_280)
    assert.equal(t.adicional, 0)
    assert.equal(t.csll, 10_368)
    assert.equal(t.pis, 2_340)
    assert.equal(t.cofins, 10_800)
    assert.equal(t.totalFederal, 40_788)
    assert.equal(round2(t.totalFederal + 1_500 * 12), 58_788)
  })
})

function round2(n: number) {
  return Math.round(n * 100) / 100
}

describe("Custo de entrada (Tema 796 + abertura)", () => {
  it("ITBI 3% só sobre excedente 3,5 mi + R$ 15 mil = R$ 120.000", () => {
    const e = calcularCustoEntradaHolding(casoReferencia())
    assert.equal(e.excedente, 3_500_000)
    assert.equal(e.itbi, 105_000)
    assert.equal(e.ganhoCapital, 0)
    assert.equal(e.abertura, 15_000)
    assert.equal(e.total, 120_000)
  })
})

describe("Comparador — caso de referência", () => {
  it("carga 2026, economia, 10 anos, VPL e payback", () => {
    const r = calcularComparadorHolding(casoReferencia())
    const y1 = r.anos[0]
    assert.ok(y1)
    assert.equal(y1.ano, 2026)
    assert.equal(y1.pfCarga, 85_800)
    assert.equal(y1.holdingCarga, 58_788)
    assert.equal(y1.economia, 27_012)

    assert.equal(Math.round(r.economiaAnos), 480_256)
    assert.equal(Math.round(r.vpl), 160_991)
    assert.equal(r.paybackAnos, 3)
    assert.equal(r.paybackMeses, 2)
    assert.equal(r.veredito.frase, "Compensa a partir do ano 4")
  })
})
