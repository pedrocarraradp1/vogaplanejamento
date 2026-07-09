"use client"

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
  Tooltip,
} from "recharts"
import type { MonteCarloTrajetoriaAno } from "@/lib/engine"
import { CHART_TOOLTIP_ITEM_STYLE, CHART_TOOLTIP_LABEL_STYLE, CHART_TOOLTIP_STYLE } from "@/lib/chart-tooltip"
import { LegendaFluxo } from "@/components/charts/fluxo-caixa-charts"

type LinhaMonteCarlo = MonteCarloTrajetoriaAno & {
  faixa90Base: number
  faixa90Span: number
  faixa75Base: number
  faixa75Span: number
}

const TOOLTIP_METRICAS: {
  key: keyof Pick<MonteCarloTrajetoriaAno, "min" | "p10" | "p25" | "p50" | "p75" | "p90" | "max">
  label: string
}[] = [
  { key: "min", label: "Mínimo simulado" },
  { key: "p10", label: "Percentil 10 (pior)" },
  { key: "p25", label: "Percentil 25" },
  { key: "p50", label: "Mediana (p50)" },
  { key: "p75", label: "Percentil 75" },
  { key: "p90", label: "Percentil 90 (melhor)" },
  { key: "max", label: "Máximo simulado" },
]

export function MonteCarloChart({
  data,
  idadeApos,
  formatarMoeda,
  formatarMoedaCompleta,
}: {
  data: MonteCarloTrajetoriaAno[]
  idadeApos: number
  formatarMoeda: (v: number) => string
  formatarMoedaCompleta: (v: number) => string
}) {
  const linhas: LinhaMonteCarlo[] = data.map((d) => ({
    ...d,
    faixa90Base: d.p10,
    faixa90Span: d.p90 - d.p10,
    faixa75Base: d.p25,
    faixa75Span: d.p75 - d.p25,
  }))

  return (
    <div className="space-y-3">
      <LegendaFluxo
        itens={[
          { id: "faixa90", label: "Faixa P10-P90", fill: "rgba(16,102,218,0.10)" },
          { id: "faixa75", label: "Faixa P25-P75", fill: "rgba(16,102,218,0.22)" },
          { id: "mediana", label: "Mediana", fill: "#01121E" },
        ]}
      />
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={linhas} margin={{ top: 10, right: 24, left: 12, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis
              dataKey="idade"
              tick={{ fill: "var(--text-label)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "var(--text-label)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatarMoeda}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const row = payload[0]?.payload as LinhaMonteCarlo | undefined
                if (!row) return null

                return (
                  <div style={{ ...CHART_TOOLTIP_STYLE, fontSize: 12, minWidth: 240 }}>
                    <p style={{ ...CHART_TOOLTIP_LABEL_STYLE, margin: 0 }}>Idade {label}</p>
                    {TOOLTIP_METRICAS.map((metrica, index) => (
                      <p
                        key={metrica.key}
                        style={{
                          ...CHART_TOOLTIP_ITEM_STYLE,
                          marginTop: index === 0 ? 8 : 4,
                          fontWeight: metrica.key === "p50" ? 600 : 400,
                        }}
                      >
                        {metrica.label}: {formatarMoedaCompleta(row[metrica.key])}
                      </p>
                    ))}
                  </div>
                )
              }}
            />
            <ReferenceLine
              x={idadeApos}
              stroke="#1066DA"
              strokeDasharray="6 4"
              label={{ value: "Aposentadoria", position: "insideTopRight", fill: "#1066DA", fontSize: 11 }}
            />
            <Area
              type="monotone"
              dataKey="faixa90Base"
              stackId="faixa90"
              stroke="transparent"
              fill="transparent"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="faixa90Span"
              stackId="faixa90"
              stroke="transparent"
              fill="rgba(16,102,218,0.10)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="faixa75Base"
              stackId="faixa75"
              stroke="transparent"
              fill="transparent"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="faixa75Span"
              stackId="faixa75"
              stroke="transparent"
              fill="rgba(16,102,218,0.22)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="p50"
              stroke="#01121E"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
