import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  SEM_ASSESSOR,
  filtrarSimulacoesPorAssessor,
  labelAssessor,
  resolverAdvisorId,
} from "@/lib/clientes-filtro-assessor"

describe("resolverAdvisorId", () => {
  it("usa advisor_id da simulação quando existe", () => {
    assert.equal(
      resolverAdvisorId({
        advisor_id: "adv-1",
        clientes: { advisor_id: "adv-cliente" },
      }),
      "adv-1",
    )
  })

  it("cai no advisor_id do cliente objeto", () => {
    assert.equal(
      resolverAdvisorId({
        advisor_id: null,
        clientes: { advisor_id: "adv-cliente" },
      }),
      "adv-cliente",
    )
  })

  it("cai no advisor_id do cliente em array de 1 elemento", () => {
    assert.equal(
      resolverAdvisorId({
        advisor_id: "",
        clientes: [{ advisor_id: "adv-array" }],
      }),
      "adv-array",
    )
  })

  it("devolve null quando nenhum advisor existe", () => {
    assert.equal(resolverAdvisorId({ advisor_id: null, clientes: null }), null)
    assert.equal(resolverAdvisorId({ advisor_id: "  ", clientes: [] }), null)
  })
})

describe("filtrarSimulacoesPorAssessor", () => {
  const rows = [
    { id: "a", advisor_id: "adv-1", clientes: null },
    { id: "b", advisor_id: null, clientes: { advisor_id: "adv-2" } },
    { id: "c", advisor_id: null, clientes: null },
  ]

  it("sem filtro (null ou string vazia) devolve todas", () => {
    assert.equal(filtrarSimulacoesPorAssessor(rows, null).length, 3)
    assert.equal(filtrarSimulacoesPorAssessor(rows, "").length, 3)
  })

  it("filtra pelo uuid do assessor", () => {
    const soAdv1 = filtrarSimulacoesPorAssessor(rows, "adv-1")
    assert.deepEqual(soAdv1.map((r) => r.id), ["a"])
    const soAdv2 = filtrarSimulacoesPorAssessor(rows, "adv-2")
    assert.deepEqual(soAdv2.map((r) => r.id), ["b"])
  })

  it("SEM_ASSESSOR devolve só linhas sem assessor", () => {
    const sem = filtrarSimulacoesPorAssessor(rows, SEM_ASSESSOR)
    assert.deepEqual(sem.map((r) => r.id), ["c"])
  })
})

describe("labelAssessor", () => {
  it("usa singular e plural corretos", () => {
    assert.equal(
      labelAssessor({
        advisorId: "1",
        nome: "Ana",
        email: null,
        totalClientes: 1,
        totalSimulacoes: 2,
      }),
      "Ana · 1 cliente",
    )
    assert.equal(
      labelAssessor({
        advisorId: "2",
        nome: "Bruno",
        email: "b@x.com",
        totalClientes: 3,
        totalSimulacoes: 5,
      }),
      "Bruno · 3 clientes",
    )
  })
})
