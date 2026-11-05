import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  calcularCustoInventario,
  calcularEspolio,
  calcularImpactoReforma,
  calcularItcmd,
  diagnosticoSinaisAlerta,
} from "./calculos.ts"
import { calcularEstateTax } from "./estate-tax-eua.ts"

describe("calcularItcmd SP causa mortis", () => {
  it("SP causa mortis R$ 3.000.000 → R$ 120.000 (4%)", () => {
    const r = calcularItcmd({
      uf: "SP",
      modalidade: "causa_mortis",
      tipoAtivo: "outros",
      valor: 3_000_000,
    })
    assert.equal(r.imposto, 120_000)
    assert.equal(r.aliquotaEfetiva, 0.04)
    assert.equal(r.liquido, 2_880_000)
  })
})

describe("calcularEspolio SP+RJ", () => {
  it("imóvel SP 2M, imóvel RJ 1,5M, quotas 3M, dinheiro 500k, domicílio SP → R$ 325.000 (4,64%)", () => {
    const r = calcularEspolio({
      domicilioUF: "SP",
      modalidade: "causa_mortis",
      bens: [
        { tipo: "imovel", valor: 2_000_000, uf: "SP" },
        { tipo: "imovel", valor: 1_500_000, uf: "RJ" },
        { tipo: "quotas", valor: 3_000_000 },
        { tipo: "dinheiro", valor: 500_000 },
      ],
    })
    assert.equal(r.imposto, 325_000)
    assert.ok(Math.abs(r.aliquotaConsolidada * 100 - 4.64) < 0.01)
    assert.equal(r.patrimonio, 7_000_000)
    assert.equal(r.liquido, 6_675_000)
  })
})

describe("calcularEstateTax", () => {
  it("US$ 1.000.000 → US$ 332.800 (33,28%)", () => {
    const r = calcularEstateTax(1_000_000)
    assert.equal(r.imposto, 332_800)
    assert.ok(Math.abs(r.aliquotaEfetiva * 100 - 33.28) < 0.01)
    assert.equal(r.liquidoUSD, 667_200)
    assert.equal(r.credito, 13_000)
  })
})

describe("calcularCustoInventario", () => {
  it("SP 3M extrajudicial 6%/1,5%/120 dias → R$ 357.000 (11,90%)", () => {
    const r = calcularCustoInventario({
      uf: "SP",
      patrimonio: 3_000_000,
      via: "extrajudicial",
      honorariosPct: 0.06,
      custasPct: 0.015,
      diasAteAbertura: 120,
    })
    assert.equal(r.itcmd, 120_000)
    assert.equal(r.multa, 12_000)
    assert.equal(r.honorarios, 180_000)
    assert.equal(r.custas, 45_000)
    assert.equal(r.total, 357_000)
    assert.ok(Math.abs(r.percentualPatrimonio * 100 - 11.9) < 0.01)
    assert.equal(r.liquidoHerdeiros, 2_643_000)
    assert.equal(r.mito20.valor, 600_000)
    assert.equal(r.mito20.diferenca, 243_000)
  })
})

describe("calcularImpactoReforma", () => {
  it("SP 8M (3M holding, 4M imóveis, 1M previdência) → base 8.650.000, hoje 346.000, projeção 661.500", () => {
    const r = calcularImpactoReforma({
      uf: "SP",
      patrimonio: 8_000_000,
      holding: 3_000_000,
      imoveis: 4_000_000,
      previdencia: 1_000_000,
    })
    assert.equal(r.baseAjustada, 8_650_000)
    assert.equal(r.impostoHoje, 346_000)
    assert.equal(r.impostoProjecao, 661_500)
    assert.equal(r.aumento, 315_500)
  })
})

describe("diagnosticoSinaisAlerta", () => {
  it("20 sinais em 4 frentes com pontuação e nível", () => {
    const respostas = Array.from({ length: 20 }, (_, i) => i < 5 || i === 15)
    const r = diagnosticoSinaisAlerta(respostas)
    assert.equal(r.sinais.length, 20)
    assert.equal(r.porFrente.sucessorio.pontos, 5)
    assert.equal(r.porFrente.sucessorio.nivel, "alto")
    assert.equal(r.porFrente.juridico.pontos, 0)
    assert.equal(r.porFrente.internacional.pontos, 1)
    assert.equal(r.frentePrioritaria, "sucessorio")
    assert.ok(r.perguntaAbertura.length > 0)
    assert.ok(r.proximoPasso.length > 0)
  })
})
