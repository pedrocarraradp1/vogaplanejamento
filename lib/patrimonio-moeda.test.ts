import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  parseValorMoeda,
  resolveSubcategoriaLiquido,
  sumAtivoTipo,
  normalizeAtivoRecord,
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
