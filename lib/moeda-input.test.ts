import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  centavosParaValorDecimal,
  extrairCentavos,
  formatarMoedaCentavos,
  parseValorDecimalDigitado,
  valorDecimalParaCentavos,
} from "./moeda-input.ts"

describe("extrairCentavos", () => {
  it("interpreta dígitos como centavos (estilo caixa eletrônico)", () => {
    assert.equal(extrairCentavos("5000000050"), 5_000_000_050)
    assert.equal(extrairCentavos("150075"), 150_075)
    assert.equal(extrairCentavos("50.000.000,50"), 5_000_000_050)
  })
})

describe("formatarMoedaCentavos", () => {
  it("formata com separador de milhar e centavos", () => {
    assert.equal(formatarMoedaCentavos(5_000_000_050), "50.000.000,50")
    assert.equal(formatarMoedaCentavos(150_075), "1.500,75")
  })
})

describe("conversão decimal", () => {
  it("preserva centavos ao converter ida e volta", () => {
    assert.equal(valorDecimalParaCentavos(1500.75), 150_075)
    assert.equal(centavosParaValorDecimal(150_075), 1500.75)
    assert.equal(parseValorDecimalDigitado("150075"), 1500.75)
  })
})
