/** Utilitários compartilhados entre /clientes e /clientes/[id]. */

import { calcularProjecao, type Premissas } from "@/lib/engine"
import { computeTotaisAtivos } from "@/lib/patrimonio-utils"
import { getFontesRenda, resolveAporteParaPremissas } from "@/lib/renda-utils"

export type Moeda = "BRL" | "USD"

export function patrimonioTotalFromDados(dados: unknown): number {
  const d = dados as { ativos?: unknown[]; passivos?: unknown[] } | null | undefined
  const ativos = Array.isArray(d?.ativos) ? d.ativos : []
  const passivos = Array.isArray(d?.passivos) ? d.passivos : []
  const totalAtivos = ativos.reduce((s: number, a: any) => s + (Number(a?.valor) || 0), 0)
  const totalPassivos = passivos.reduce((s: number, p: any) => {
    const saldo = Number(p?.saldoDevedor)
    return s + (saldo > 0 ? saldo : Number(p?.valor) || 0)
  }, 0)
  return totalAtivos - totalPassivos
}

/**
 * Patrimônio projetado na aposentadoria a partir do snapshot do cenário.
 *
 * Caminhos (nessa ordem):
 * 1) `dados.kpis.patrimonioApos` (snapshot legado, se persistido)
 * 2) `dados.projecao` (série já salva)
 * 3) Recálculo ao vivo via `calcularProjecao` a partir do PlanoState salvo
 *    (ativos/premissas/aportes) — caminho principal, porque o save grava
 *    o estado do plano sem kpis/projecao.
 */
export function patrimonioProjetadoFromDados(dados: unknown): number {
  const d = dados as {
    kpis?: { patrimonioApos?: number }
    projecao?: Array<{ idade?: number; saldoNominal?: number }>
    premissas?: Partial<Premissas>
    dadosPessoais?: {
      nascimento?: string
      despesa?: number
      fontesRenda?: unknown
      renda?: number
    }
    ativos?: unknown[]
    passivos?: unknown[]
    objetivos?: unknown[]
  } | null | undefined

  const k = d?.kpis?.patrimonioApos
  if (typeof k === "number" && Number.isFinite(k) && k !== 0) return k

  const proj = Array.isArray(d?.projecao) ? d.projecao : []
  const idadeAposSnap = Number(d?.premissas?.idadeApos) || 0
  if (proj.length > 0) {
    const naApos =
      idadeAposSnap > 0 ? proj.find((p) => Number(p?.idade) === idadeAposSnap) : null
    const ponto = naApos ?? proj[proj.length - 1]
    const v = Number(ponto?.saldoNominal)
    if (Number.isFinite(v) && v !== 0) return v
  }

  try {
    const ativos = Array.isArray(d?.ativos) ? d.ativos : []
    const passivos = Array.isArray(d?.passivos) ? (d.passivos as any[]) : []
    const objetivos = Array.isArray(d?.objetivos) ? (d.objetivos as any[]) : []
    const premissas = (d?.premissas ?? {}) as Premissas
    const dadosPessoais = d?.dadosPessoais ?? {}

    const idadeAtual = (() => {
      const nasc = String(dadosPessoais.nascimento ?? "")
      if (!nasc) return Number(premissas.idadeAtual) || 0
      const nascDate = new Date(nasc)
      if (Number.isNaN(nascDate.getTime())) return Number(premissas.idadeAtual) || 0
      const hoje = new Date()
      let idade = hoje.getFullYear() - nascDate.getFullYear()
      const m = hoje.getMonth() - nascDate.getMonth()
      if (m < 0 || (m === 0 && hoje.getDate() < nascDate.getDate())) idade--
      return Math.max(0, idade)
    })()

    const idadeApos = Number(premissas.idadeApos) || 0
    const saldoInicial = computeTotaisAtivos(ativos as any[]).totalAtivosFinanceiros
    const fontes = getFontesRenda(dadosPessoais as any)
    const despesa = Number(dadosPessoais.despesa) || 0
    const { aporteM, aportePorAnoNominal } = resolveAporteParaPremissas(
      fontes,
      despesa,
      premissas,
    )

    const projLive = calcularProjecao(
      {
        ...premissas,
        saldoInicial,
        aporteM,
        aportePorAnoNominal,
        idadeAtual,
        prazo: Math.max(1, Number(premissas.prazo) || 1),
      },
      objetivos,
      passivos,
    )

    const anoApos = idadeApos > 0 ? projLive.find((p) => p.idade === idadeApos) : null
    const ponto = anoApos ?? projLive[projLive.length - 1]
    return Number(ponto?.saldoNominal) || 0
  } catch {
    return typeof k === "number" ? k : 0
  }
}

export function fmtFull(moeda: Moeda, v: number) {
  return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: moeda === "USD" ? "USD" : "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

export function moedaFromDados(dados: unknown): Moeda {
  const d = dados as { moeda?: string } | null | undefined
  return d?.moeda === "USD" ? "USD" : "BRL"
}
