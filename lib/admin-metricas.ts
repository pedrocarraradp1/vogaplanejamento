export type PeriodoPreset = "7d" | "30d" | "mes" | "custom"
export type GranularidadeSerie = "dia" | "semana"
export type StatusAtividade = "ativo" | "pouco_ativo" | "inativo"

export type AssessorMetricas = {
  advisor_id: string
  advisor_nome: string
  planos_no_periodo: number
  planos_total: number
  ultima_atividade: string | null
}

export type SeriePonto = {
  periodo: string
  quantidade: number
}

export type AdminMetricas = {
  planos_periodo: number
  planos_total: number
  /** TODO: sem status de conclusão no schema — tratando criação como conclusão */
  planos_realizados: number
  assessores_ativos: number
  granularidade: GranularidadeSerie
  serie: SeriePonto[]
  assessores: AssessorMetricas[]
}

export type AssessorSortKey =
  | "advisor_nome"
  | "planos_no_periodo"
  | "planos_total"
  | "ultima_atividade"
  | "status"

function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}

export function resolverIntervaloPeriodo(
  preset: PeriodoPreset,
  custom: { from: Date | null; to: Date | null },
  agora = new Date(),
): { inicio: Date; fim: Date } {
  if (preset === "custom" && custom.from && custom.to) {
    const a = startOfLocalDay(custom.from)
    const b = endOfLocalDay(custom.to)
    return a <= b ? { inicio: a, fim: b } : { inicio: b, fim: endOfLocalDay(custom.from) }
  }

  const fim = endOfLocalDay(agora)

  if (preset === "7d") {
    const inicio = startOfLocalDay(agora)
    inicio.setDate(inicio.getDate() - 6)
    return { inicio, fim }
  }

  if (preset === "mes") {
    const inicio = startOfLocalDay(agora)
    inicio.setDate(1)
    return { inicio, fim }
  }

  const inicio = startOfLocalDay(agora)
  inicio.setDate(inicio.getDate() - 29)
  return { inicio, fim }
}

export function diasNoIntervalo(inicio: Date, fim: Date): number {
  const ms = startOfLocalDay(fim).getTime() - startOfLocalDay(inicio).getTime()
  return Math.max(1, Math.round(ms / 86_400_000) + 1)
}

export function granularidadeParaIntervalo(inicio: Date, fim: Date): GranularidadeSerie {
  return diasNoIntervalo(inicio, fim) > 45 ? "semana" : "dia"
}

const DIA_MS = 86_400_000

export function statusAtividadeAssessor(
  ultimaAtividade: string | Date | null | undefined,
  agora = new Date(),
): StatusAtividade {
  if (!ultimaAtividade) return "inativo"
  const ts = ultimaAtividade instanceof Date ? ultimaAtividade.getTime() : Date.parse(ultimaAtividade)
  if (!Number.isFinite(ts)) return "inativo"
  const dias = (agora.getTime() - ts) / DIA_MS
  if (dias <= 7) return "ativo"
  if (dias <= 30) return "pouco_ativo"
  return "inativo"
}

export function ordenarAssessores(
  rows: AssessorMetricas[],
  key: AssessorSortKey,
  dir: "asc" | "desc",
  agora = new Date(),
): AssessorMetricas[] {
  const mul = dir === "asc" ? 1 : -1
  return [...rows].sort((a, b) => {
    let cmp = 0
    if (key === "advisor_nome") {
      cmp = a.advisor_nome.localeCompare(b.advisor_nome, "pt-BR")
    } else if (key === "planos_no_periodo") {
      cmp = a.planos_no_periodo - b.planos_no_periodo
    } else if (key === "planos_total") {
      cmp = a.planos_total - b.planos_total
    } else if (key === "ultima_atividade") {
      const ta = a.ultima_atividade ? Date.parse(a.ultima_atividade) : 0
      const tb = b.ultima_atividade ? Date.parse(b.ultima_atividade) : 0
      cmp = ta - tb
    } else {
      const rank = { ativo: 0, pouco_ativo: 1, inativo: 2 }
      cmp =
        rank[statusAtividadeAssessor(a.ultima_atividade, agora)] -
        rank[statusAtividadeAssessor(b.ultima_atividade, agora)]
    }
    if (cmp !== 0) return cmp * mul
    return b.planos_no_periodo - a.planos_no_periodo
  })
}

export function formatarLabelSerie(periodoIso: string, granularidade: GranularidadeSerie): string {
  const [y, m, d] = periodoIso.split("-").map(Number)
  if (!y || !m || !d) return periodoIso
  const date = new Date(y, m - 1, d)
  if (granularidade === "semana") {
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

export function formatarDataHora(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
