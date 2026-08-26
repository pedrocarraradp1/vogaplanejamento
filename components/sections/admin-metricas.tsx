"use client"

import { useEffect, useMemo, useState } from "react"
import { type DateRange } from "react-day-picker"
import { ArrowDown, ArrowUp, CalendarDays } from "lucide-react"
import { GraficoBarrasQuantidade } from "@/components/charts/objetivos-charts"
import { CenarioSecaoBox } from "@/components/ui/cenario-secao-box"
import { Calendar } from "@/components/ui/calendar"
import { KpiCard, KpiGrid } from "@/components/ui/kpi-card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  formatarDataHora,
  formatarLabelSerie,
  ordenarAssessores,
  resolverIntervaloPeriodo,
  statusAtividadeAssessor,
  type AdminMetricas,
  type AssessorSortKey,
  type PeriodoPreset,
} from "@/lib/admin-metricas"
import { cn } from "@/lib/utils"

const PRESETS: { id: PeriodoPreset; label: string }[] = [
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "mes", label: "Este mês" },
  { id: "custom", label: "Personalizado" },
]

const COLUNAS: { key: AssessorSortKey; label: string; align: "left" | "right" }[] = [
  { key: "advisor_nome", label: "Assessor", align: "left" },
  { key: "planos_no_periodo", label: "Planejamentos no período", align: "right" },
  { key: "planos_total", label: "Total histórico", align: "right" },
  { key: "ultima_atividade", label: "Última atividade", align: "right" },
  { key: "status", label: "Status", align: "right" },
]

function BadgeStatus({ status }: { status: ReturnType<typeof statusAtividadeAssessor> }) {
  const map = {
    ativo: { label: "Ativo", cls: "bg-[#DFF0D1] text-[#1F6D3E]" },
    pouco_ativo: { label: "Pouco ativo", cls: "bg-[#FBF3CC] text-[#7A5C00]" },
    inativo: { label: "Inativo", cls: "bg-muted text-muted-foreground" },
  } as const
  const item = map[status]
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${item.cls}`}>
      {item.label}
    </span>
  )
}

export function AdminMetricas() {
  const [preset, setPreset] = useState<PeriodoPreset>("30d")
  const [customRange, setCustomRange] = useState<DateRange | undefined>()
  const [sortKey, setSortKey] = useState<AssessorSortKey>("planos_no_periodo")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metricas, setMetricas] = useState<AdminMetricas | null>(null)

  const intervalo = useMemo(
    () =>
      resolverIntervaloPeriodo(preset, {
        from: customRange?.from ?? null,
        to: customRange?.to ?? customRange?.from ?? null,
      }),
    [preset, customRange],
  )

  useEffect(() => {
    let cancelled = false
    const inicio = intervalo.inicio.toISOString()
    const fim = intervalo.fim.toISOString()
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const res = await fetch(
          `/api/admin/metricas?inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`,
        )
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(
            typeof body?.error === "string" ? body.error : "Não foi possível carregar as métricas.",
          )
        }
        if (!cancelled) setMetricas(body as AdminMetricas)
      } catch (e) {
        if (!cancelled) {
          setMetricas(null)
          setError(e instanceof Error ? e.message : "Erro ao carregar.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [intervalo.inicio, intervalo.fim])

  const assessores = useMemo(() => {
    if (!metricas?.assessores) return []
    return ordenarAssessores(metricas.assessores, sortKey, sortDir)
  }, [metricas, sortKey, sortDir])

  const pontosGrafico = useMemo(() => {
    const serie = metricas?.serie ?? []
    const gran = metricas?.granularidade ?? "dia"
    const step = serie.length > 14 ? Math.ceil(serie.length / 8) : 1
    return serie.map((p, i) => ({
      id: p.periodo,
      label: formatarLabelSerie(p.periodo, gran),
      valor: Number(p.quantidade) || 0,
      mostrarLabel: i === 0 || i === serie.length - 1 || i % step === 0,
    }))
  }, [metricas])

  function onSort(key: AssessorSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDir(key === "advisor_nome" ? "asc" : "desc")
  }

  const customLabel =
    customRange?.from && customRange?.to
      ? `${customRange.from.toLocaleDateString("pt-BR")} – ${customRange.to.toLocaleDateString("pt-BR")}`
      : "Escolher datas"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="clientes-title">
          <span className="text-[var(--text-primary)]">Painel</span>
          <span className="text-[var(--accent)]"> Admin</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Uso da ferramenta por assessor. Contagens sobre todos os planejamentos salvos.
        </p>
      </div>

      <div className="section-card">
        <p className="field-label mb-3">Período</p>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                preset === p.id
                  ? "bg-[#1066DA] text-white"
                  : "bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] hover:border-[#1066DA]/40",
              )}
            >
              {p.id === "custom" ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {p.label}
                </span>
              ) : (
                p.label
              )}
            </button>
          ))}
          {preset === "custom" ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-sm text-[var(--text-primary)]"
                >
                  {customLabel}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={setCustomRange}
                  numberOfMonths={2}
                  defaultMonth={customRange?.from}
                />
              </PopoverContent>
            </Popover>
          ) : null}
        </div>
      </div>

      <KpiGrid>
        <KpiCard
          label="Planejamentos no período"
          value={loading ? "…" : String(metricas?.planos_periodo ?? 0)}
          valueColor="#1066DA"
          background="#FFFFFF"
        />
        <KpiCard
          label="Total histórico"
          value={loading ? "…" : String(metricas?.planos_total ?? 0)}
          hint="Todos os tempos, sem filtro"
          background="#FFFFFF"
        />
        <KpiCard
          label="Assessores ativos"
          value={loading ? "…" : String(metricas?.assessores_ativos ?? 0)}
          hint="Criaram ou editaram no período"
          valueColor="#1F6D3E"
          background="#FFFFFF"
        />
        <KpiCard
          label="Planejamentos realizados"
          value={loading ? "…" : String(metricas?.planos_realizados ?? 0)}
          // TODO: sem status de conclusão no schema — tratando criação como conclusão
          hint="Criação = conclusão (sem status no schema)"
          background="#FFFFFF"
        />
      </KpiGrid>

      {error ? (
        <div className="section-card">
          <p className="text-sm font-semibold text-destructive">Não foi possível carregar as métricas</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
        </div>
      ) : null}

      <CenarioSecaoBox
        title="Evolução de planejamentos"
        description={
          metricas?.granularidade === "semana"
            ? "Quantidade criada por semana no intervalo"
            : "Quantidade criada por dia no intervalo"
        }
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando gráfico…</p>
        ) : pontosGrafico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum planejamento no período.</p>
        ) : (
          <GraficoBarrasQuantidade pontos={pontosGrafico} />
        )}
      </CenarioSecaoBox>

      <CenarioSecaoBox title="Atividade por assessor">
        <div className="overflow-x-auto rounded-lg border border-border/40 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.06em] text-[#5F85B8] border-b border-border/50">
                {COLUNAS.map((col) => {
                  const active = sortKey === col.key
                  return (
                    <th
                      key={col.key}
                      className={cn(
                        "px-3 py-2.5 font-medium cursor-pointer select-none",
                        col.align === "right" && "text-right",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onSort(col.key)}
                        className={cn(
                          "inline-flex items-center gap-1",
                          col.align === "right" && "w-full justify-end",
                        )}
                      >
                        {col.label}
                        {active ? (
                          sortDir === "asc" ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : null}
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              ) : assessores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-4 text-muted-foreground">
                    Nenhum assessor cadastrado
                  </td>
                </tr>
              ) : (
                assessores.map((row, i) => (
                  <tr key={row.advisor_id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-3 py-2.5 text-foreground">{row.advisor_nome}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-foreground">
                      {row.planos_no_periodo}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums font-medium text-foreground">
                      {row.planos_total}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-foreground">
                      {formatarDataHora(row.ultima_atividade)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <BadgeStatus status={statusAtividadeAssessor(row.ultima_atividade)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CenarioSecaoBox>
    </div>
  )
}
