"use client"

import { useMemo } from "react"
import {
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "@/lib/chart-tooltip"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
} from "recharts"
import type { DadoFluxoGrafico, DadoRendaGrafico } from "@/lib/projecao-graficos-dados"

const CORES_FLUXO = {
  rendimento: "#378ADD",
  aporte: "var(--accent)",
  objetivos: "#BA7517",
  passivos: "#7C3AED",
  retirada: "#E24B4A",
  metaRenda: "#1D9E75",
} as const

const LEGENDA_FLUXO: Record<string, string> = {
  rendimento: "Rendimento",
  aporte: "Aporte Mensal",
  objetivos: "Objetivos",
  passivos: "Passivos",
  retirada: "Retirada Aposentadoria",
  metaRenda: "Renda Aposentadoria",
}

const CHART_HEIGHT = 280

interface ChartFormatters {
  formatarMoeda: (v: number) => string
  formatarMoedaCompleta: (v: number) => string
}

export function FluxoAnualChart({
  data,
  formatarMoeda,
  formatarMoedaCompleta,
}: { data: DadoFluxoGrafico[] } & ChartFormatters) {
  const dados = data ?? []
  const primeiroAno = dados[0]

  if (dados.length === 0) {
    return null
  }

  return (
    <div className="mt-8 w-full min-w-0 space-y-2">
      <h3 className="text-sm font-medium text-foreground">Fluxo Anual</h3>
      <div className="w-full min-w-0" style={{ height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={dados} margin={{ top: 28, right: 24, left: 8, bottom: 4 }} stackOffset="sign">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="idade"
              stroke="#4A5268"
              tick={{ fill: "#4A5268", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#4A5268"
              tick={{ fill: "#4A5268", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatarMoeda}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]?.payload as DadoFluxoGrafico
                const corLiq = p.fluxoLiquido >= 0 ? "#1D9E75" : "#E24B4A"
                return (
                  <div style={{ ...CHART_TOOLTIP_STYLE, fontSize: 12, minWidth: 200 }}>
                    <p style={{ ...CHART_TOOLTIP_LABEL_STYLE, margin: 0 }}>
                      Ano {p.t} · Idade {p.idade}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, opacity: 0.85, marginTop: 2 }}>
                      Fase: {p.fase}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, marginTop: 8, color: "#7CB9E8" }}>
                      Rendimento: {formatarMoedaCompleta(p.rendimento)}
                    </p>
                    <p style={CHART_TOOLTIP_ITEM_STYLE}>Aporte: {formatarMoedaCompleta(p.aporte)}</p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: "#F5C97A" }}>
                      Objetivos: {formatarMoedaCompleta(Math.abs(p.objetivos))}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: "#C4B5FD" }}>
                      Passivos: {formatarMoedaCompleta(Math.abs(p.passivos))}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: "#F5A5A4" }}>
                      Retirada: {formatarMoedaCompleta(Math.abs(p.retirada))}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: "#7FE0B8" }}>
                      Meta renda (ref.): {formatarMoedaCompleta(p.metaRenda)}
                    </p>
                    <p className="mt-1 font-medium" style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: corLiq, marginTop: 6 }}>
                      Fluxo líquido: {formatarMoedaCompleta(p.fluxoLiquido)}
                    </p>
                  </div>
                )
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value: string) => LEGENDA_FLUXO[value] ?? value}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
            <Bar
              dataKey="rendimento"
              name="rendimento"
              stackId="fluxo"
              fill={CORES_FLUXO.rendimento}
            />
            <Bar dataKey="aporte" name="aporte" stackId="fluxo" fill={CORES_FLUXO.aporte} />
            <Bar
              dataKey="objetivos"
              name="objetivos"
              stackId="fluxo"
              fill={CORES_FLUXO.objetivos}
            />
            <Bar
              dataKey="passivos"
              name="passivos"
              stackId="fluxo"
              fill={CORES_FLUXO.passivos}
            />
            <Bar
              dataKey="retirada"
              name="retirada"
              stackId="fluxo"
              fill={CORES_FLUXO.retirada}
            />
            <Line
              type="monotone"
              dataKey="metaRenda"
              name="metaRenda"
              stroke={CORES_FLUXO.metaRenda}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
            {primeiroAno && (
              <ReferenceDot
                x={primeiroAno.idade}
                y={primeiroAno.fluxoLiquido}
                r={0}
                label={{
                  value: formatarMoedaCompleta(primeiroAno.fluxoLiquido),
                  position: primeiroAno.fluxoLiquido >= 0 ? "top" : "bottom",
                  fill: primeiroAno.fluxoLiquido >= 0 ? "#1D9E75" : "#E24B4A",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function RendaCarteiraChart({
  data,
  displayMode,
  formatarMoeda,
  formatarMoedaCompleta,
}: { data: DadoRendaGrafico[]; displayMode: "nominal" | "real" } & ChartFormatters) {
  const dados = data ?? []

  const areaIndependencia = useMemo(() => {
    const first = dados.find((d) => d.acimaMeta)
    if (!first) return null
    const last = dados[dados.length - 1]
    return { x1: first.idade, x2: last?.idade ?? first.idade }
  }, [dados])

  if (dados.length === 0) {
    return null
  }

  return (
    <div className="mt-8 w-full min-w-0 space-y-2">
      <h3 className="text-sm font-medium text-foreground">Renda Real da Carteira</h3>
      <div className="w-full min-w-0" style={{ height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={dados} margin={{ top: 16, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="idade"
              stroke="#4A5268"
              tick={{ fill: "#4A5268", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#4A5268"
              tick={{ fill: "#4A5268", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatarMoeda}
            />
            {areaIndependencia && (
              <ReferenceArea
                x1={areaIndependencia.x1}
                x2={areaIndependencia.x2}
                fill="rgba(34,199,135,0.08)"
                strokeOpacity={0}
              />
            )}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]?.payload as DadoRendaGrafico
                const status = p.acimaMeta ? "Acima da meta" : "Abaixo da meta"
                const corStatus = p.acimaMeta ? "#22C787" : "#EF4444"
                return (
                  <div style={{ ...CHART_TOOLTIP_STYLE, fontSize: 12 }}>
                    <p style={{ ...CHART_TOOLTIP_LABEL_STYLE, margin: 0 }}>Idade {p.idade}</p>
                    {displayMode === "nominal" ? (
                      <>
                        <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, marginTop: 6 }}>
                          Renda nominal: {formatarMoedaCompleta(p.rendaNominal)}
                        </p>
                        <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, opacity: 0.85 }}>
                          Poder de compra (hoje): {formatarMoedaCompleta(p.rendaPoderCompra)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, marginTop: 6 }}>
                          Renda real (Fisher): {formatarMoedaCompleta(p.rendaReal)}
                        </p>
                        <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, opacity: 0.85 }}>
                          Renda nominal (ref.): {formatarMoedaCompleta(p.rendaNominal)}
                        </p>
                      </>
                    )}
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, opacity: 0.85 }}>
                      Meta: {formatarMoedaCompleta(p.meta)}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, fontWeight: 500, color: corStatus, marginTop: 6 }}>
                      {status}
                    </p>
                  </div>
                )
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {displayMode === "nominal" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="rendaNominal"
                  name="Renda nominal"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="rendaPoderCompra"
                  name="Poder de compra (hoje)"
                  stroke="#4A9EFF"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="rendaReal"
                name="Renda real (Fisher)"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="meta"
              name="Meta aposentadoria"
              stroke="#EF4444"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
