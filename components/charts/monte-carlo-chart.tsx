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
import { LegendaFluxo } from "@/components/charts/fluxo-caixa-charts"

type LinhaMonteCarlo = MonteCarloTrajetoriaAno & {
  faixa90Base: number
  faixa90Span: number
  faixa75Base: number
  faixa75Span: number
}

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
              formatter={(value: number, name: string) => {
                const map: Record<string, string> = {
                  p10: "P10",
                  p25: "P25",
                  p50: "Mediana",
                  p75: "P75",
                  p90: "P90",
                }
                if (!(name in map)) return null
                return [formatarMoedaCompleta(value), map[name]]
              }}
              labelFormatter={(label) => `Idade ${label}`}
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
