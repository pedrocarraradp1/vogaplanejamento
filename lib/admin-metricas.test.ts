import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  diasNoIntervalo,
  granularidadeParaIntervalo,
  ordenarAssessores,
  resolverIntervaloPeriodo,
  statusAtividadeAssessor,
} from "./admin-metricas.ts"
import { navGroupsForSession } from "./navegacao-plano.ts"
import { isAdminRole } from "./profile-role.ts"

describe("resolverIntervaloPeriodo", () => {
  const agora = new Date(2026, 7, 26, 15, 0, 0)

  it("últimos 7 dias são inclusivos até hoje", () => {
    const { inicio, fim } = resolverIntervaloPeriodo("7d", { from: null, to: null }, agora)
    assert.equal(inicio.getDate(), 20)
    assert.equal(inicio.getMonth(), 7)
    assert.equal(fim.getDate(), 26)
    assert.equal(diasNoIntervalo(inicio, fim), 7)
  })

  it("últimos 30 dias cobrem 30 dias", () => {
    const { inicio, fim } = resolverIntervaloPeriodo("30d", { from: null, to: null }, agora)
    assert.equal(diasNoIntervalo(inicio, fim), 30)
  })

  it("este mês começa no dia 1", () => {
    const { inicio, fim } = resolverIntervaloPeriodo("mes", { from: null, to: null }, agora)
    assert.equal(inicio.getDate(), 1)
    assert.equal(inicio.getMonth(), 7)
    assert.equal(fim.getDate(), 26)
  })

  it("personalizado inverte se from > to", () => {
    const { inicio, fim } = resolverIntervaloPeriodo(
      "custom",
      { from: new Date(2026, 7, 20), to: new Date(2026, 7, 10) },
      agora,
    )
    assert.ok(inicio.getTime() <= fim.getTime())
    assert.equal(inicio.getDate(), 10)
    assert.equal(fim.getDate(), 20)
  })
})

describe("granularidadeParaIntervalo", () => {
  it("usa dia em janela curta e semana se > 45 dias", () => {
    const curto = resolverIntervaloPeriodo("30d", { from: null, to: null }, new Date(2026, 7, 26))
    assert.equal(granularidadeParaIntervalo(curto.inicio, curto.fim), "dia")
    const longoIni = new Date(2026, 0, 1)
    const longoFim = new Date(2026, 3, 1)
    assert.equal(granularidadeParaIntervalo(longoIni, longoFim), "semana")
  })
})

describe("statusAtividadeAssessor", () => {
  const agora = new Date("2026-08-26T12:00:00-03:00")

  it("ativo / pouco ativo / inativo pelos recortes de 7 e 30 dias", () => {
    assert.equal(statusAtividadeAssessor("2026-08-24T10:00:00-03:00", agora), "ativo")
    assert.equal(statusAtividadeAssessor("2026-08-10T10:00:00-03:00", agora), "pouco_ativo")
    assert.equal(statusAtividadeAssessor("2026-07-01T10:00:00-03:00", agora), "inativo")
    assert.equal(statusAtividadeAssessor(null, agora), "inativo")
  })
})

describe("ordenarAssessores", () => {
  const rows = [
    {
      advisor_id: "a",
      advisor_nome: "Ana",
      planos_no_periodo: 1,
      planos_total: 10,
      ultima_atividade: "2026-08-01T00:00:00Z",
    },
    {
      advisor_id: "b",
      advisor_nome: "Bruno",
      planos_no_periodo: 5,
      planos_total: 5,
      ultima_atividade: "2026-08-25T00:00:00Z",
    },
  ]

  it("padrão: mais planejamentos no período primeiro", () => {
    const sorted = ordenarAssessores(rows, "planos_no_periodo", "desc")
    assert.equal(sorted[0].advisor_nome, "Bruno")
  })
})

describe("aba Admin no menu", () => {
  it("só entra no menu lateral se isAdmin", () => {
    const sem = navGroupsForSession({ isAdmin: false })
    const com = navGroupsForSession({ isAdmin: true })
    assert.equal(sem.some((g) => g.items.some((i) => i.id === "admin")), false)
    assert.equal(com[0].items[0].id, "admin")
    assert.equal(isAdminRole("advisor"), false)
    assert.equal(isAdminRole("admin"), true)
  })
})
