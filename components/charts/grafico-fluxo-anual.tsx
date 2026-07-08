"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FluxoAnualChart } from "@/components/charts/projecao-extra-charts"
import { CORES_FLUXO_ANUAL } from "@/lib/voga-tokens"
import type { DadoFluxoGrafico } from "@/lib/projecao-graficos-dados"

const PAINEL_BG = "var(--surface-1, #F5F5F5)"

const PRESETS = [
  { label: "5 anos", anos: 5 as const },
  { label: "10 anos", anos: 10 as const },
  { label: "25 anos", anos: 25 as const },
  { label: "Todos", anos: "todos" as const },
]

function ToggleNominalReal({
  value,
  onChange,
}: {
  value: "real" | "nominal"
  onChange: (v: "real" | "nominal") => void
}) {
  return (
    <div className="inline-flex rounded-lg bg-white p-1 border border-border/60">
      {(
        [
          { id: "real" as const, label: "Real" },
          { id: "nominal" as const, label: "Nominal" },
        ] as const
      ).map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            value === opt.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export interface GraficoFluxoAnualProps {
  title: string
  data: DadoFluxoGrafico[]
  formatarMoeda: (v: number) => string
  formatarMoedaCompleta: (v: number) => string
  /** Ano-calendário do t=0 (padrão: ano corrente). */
  anoBase?: number
  /** Último ano-calendário do plano (t = prazo). */
  anoPlanoFim?: number
  displayMode: "real" | "nominal"
  onDisplayModeChange: (mode: "real" | "nominal") => void
  /** Se false, renderiza só o conteúdo (sem Card). Default: true. */
  asCard?: boolean
  className?: string
}

/**
 * Gráfico de fluxo anual unificado (Projeção + Fluxo de Caixa):
 * mesmo painel, seletor de período, paleta e legenda — sem linha de meta renda.
 */
export function GraficoFluxoAnual({
  title,
  data,
  formatarMoeda,
  formatarMoedaCompleta,
  anoBase: anoBaseProp,
  anoPlanoFim: anoPlanoFimProp,
  displayMode,
  onDisplayModeChange,
  asCard = true,
  className,
}: GraficoFluxoAnualProps) {
  const anoCorrente = anoBaseProp ?? new Date().getFullYear()
  const prazoMaxT = useMemo(() => {
    if (!data.length) return 0
    return Math.max(0, ...data.map((d) => Number(d.t) || 0))
  }, [data])
  const anoPlanoFim = anoPlanoFimProp ?? anoCorrente + prazoMaxT

  const [periodoInicio, setPeriodoInicio] = useState(anoCorrente)
  const [periodoFim, setPeriodoFim] = useState(anoPlanoFim)

  useEffect(() => {
    setPeriodoInicio((prev) => Math.max(anoCorrente, Math.min(prev, anoPlanoFim)))
    setPeriodoFim((prev) => Math.min(anoPlanoFim, Math.max(prev, anoCorrente)))
  }, [anoCorrente, anoPlanoFim])

  const aplicarPresetPeriodo = (anos: number | "todos") => {
    const inicio = anoCorrente
    const fim = anos === "todos" ? anoPlanoFim : Math.min(inicio + anos - 1, anoPlanoFim)
    setPeriodoInicio(inicio)
    setPeriodoFim(fim)
  }

  const body = (
    <>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs bg-white"
              onClick={() => aplicarPresetPeriodo(preset.anos)}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 12, color: "#5F85B8" }}>De</label>
          <Input
            type="number"
            min={anoCorrente}
            max={periodoFim}
            value={periodoInicio}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!Number.isNaN(v)) {
                setPeriodoInicio(Math.max(anoCorrente, Math.min(v, periodoFim)))
              }
            }}
            className="h-8 w-[88px] text-sm bg-white"
          />
          <label style={{ fontSize: 12, color: "#5F85B8" }}>até</label>
          <Input
            type="number"
            min={periodoInicio}
            max={anoPlanoFim}
            value={periodoFim}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              if (!Number.isNaN(v)) {
                setPeriodoFim(Math.min(anoPlanoFim, Math.max(v, periodoInicio)))
              }
            }}
            className="h-8 w-[88px] text-sm bg-white"
          />
        </div>
      </div>

      <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
        {data.length > 0 ? (
          <FluxoAnualChart
            data={data}
            periodoInicioAno={periodoInicio}
            periodoFimAno={periodoFim}
            anoBase={anoCorrente}
            formatarMoeda={formatarMoeda}
            formatarMoedaCompleta={formatarMoedaCompleta}
            cores={CORES_FLUXO_ANUAL}
            hideTitle
            hideMetaRenda
          />
        ) : (
          <p className="text-sm text-muted-foreground">Sem dados de fluxo para o período.</p>
        )}
      </div>
    </>
  )

  if (!asCard) {
    return <div className={`space-y-4 ${className ?? ""}`}>{body}</div>
  }

  return (
    <Card className={`form-card ${className ?? ""}`}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        <ToggleNominalReal value={displayMode} onChange={onDisplayModeChange} />
      </CardHeader>
      <CardContent className="space-y-4">{body}</CardContent>
    </Card>
  )
}
