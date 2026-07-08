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
import {
  filtrarDadosFluxoPorPeriodo,
  type DadoFluxoGrafico,
  type DadoRendaGrafico,
} from "@/lib/projecao-graficos-dados"
import { formatMoedaSaida } from "@/lib/fluxo-caixa-utils"
import { CORES_FLUXO_PROJECAO } from "@/lib/voga-tokens"

const CORES_FLUXO = CORES_FLUXO_PROJECAO

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
  hideTitle = false,
  hideMetaRenda = false,
  className,
  periodoInicioAno,
  periodoFimAno,
  anoBase,
}: {
  data: DadoFluxoGrafico[]
  hideTitle?: boolean
  /** Oculta linha tracejada e tooltip de meta renda (ex.: Painel 3 do Fluxo de Caixa). */
  hideMetaRenda?: boolean
  className?: string
  /** Ano-calendário inicial do intervalo visível (ex: 2026). */
  periodoInicioAno?: number
  /** Ano-calendário final do intervalo visível (ex: 2076). */
  periodoFimAno?: number
  /** Ano-calendário do t=0 da projeção — normalmente o ano corrente. */
  anoBase?: number
} & ChartFormatters) {
  const dadosVisiveis = useMemo(() => {
    const all = data ?? []
    if (
      periodoInicioAno == null ||
      periodoFimAno == null ||
      anoBase == null
    ) {
      return all
    }
    return filtrarDadosFluxoPorPeriodo(all, anoBase, periodoInicioAno, periodoFimAno)
  }, [data, periodoInicioAno, periodoFimAno, anoBase])

  const primeiroAno = dadosVisiveis[0]
  const chartKey = `${periodoInicioAno ?? "all"}-${periodoFimAno ?? "all"}-${dadosVisiveis.length}-${dadosVisiveis[0]?.idade ?? ""}-${dadosVisiveis[dadosVisiveis.length - 1]?.idade ?? ""}`

  if (dadosVisiveis.length === 0) {
    return null
  }

  return (
    <div className={`w-full min-w-0 space-y-2 ${className ?? (hideTitle ? "" : "mt-8")}`}>
      {!hideTitle ? <h3 className="text-sm font-medium text-foreground">Fluxo Anual</h3> : null}
      <div className="w-full min-w-0" style={{ height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart
            key={chartKey}
            data={dadosVisiveis}
            margin={{ top: 28, right: 24, left: 8, bottom: 4 }}
            stackOffset="sign"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="idade"
              stroke="#5F85B8"
              tick={{ fill: "#5F85B8", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#5F85B8"
              tick={{ fill: "#5F85B8", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatarMoeda}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]?.payload as DadoFluxoGrafico
                const corLiq = p.fluxoLiquido >= 0 ? "#1066DA" : "#B33A3A"
                return (
                  <div style={{ ...CHART_TOOLTIP_STYLE, fontSize: 12, minWidth: 200 }}>
                    <p style={{ ...CHART_TOOLTIP_LABEL_STYLE, margin: 0 }}>
                      Ano {p.t} · Idade {p.idade}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, opacity: 0.85, marginTop: 2 }}>
                      Fase: {p.fase}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, marginTop: 8, color: "#81ADD4" }}>
                      Rendimento: {formatarMoedaCompleta(p.rendimento)}
                    </p>
                    <p style={CHART_TOOLTIP_ITEM_STYLE}>Aporte: {formatarMoedaCompleta(p.aporte)}</p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: "#B3DAF8" }}>
                      Objetivos: {formatMoedaSaida(formatarMoedaCompleta, p.objetivos)}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: "#81ADD4" }}>
                      Passivos: {formatMoedaSaida(formatarMoedaCompleta, p.passivos)}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: "#B33A3A" }}>
                      Retirada: {formatMoedaSaida(formatarMoedaCompleta, p.retirada)}
                    </p>
                    {!hideMetaRenda ? (
                      <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: "#81ADD4" }}>
                        Meta renda (ref.): {formatarMoedaCompleta(p.metaRenda)}
                      </p>
                    ) : null}
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
              legendType="rect"
              isAnimationActive={false}
            />
            {!hideMetaRenda ? (
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
            ) : null}
            {primeiroAno && (
              <ReferenceDot
                x={primeiroAno.idade}
                y={primeiroAno.fluxoLiquido}
                r={0}
                label={{
                  value: formatarMoedaCompleta(primeiroAno.fluxoLiquido),
                  position: primeiroAno.fluxoLiquido >= 0 ? "top" : "bottom",
                  fill: primeiroAno.fluxoLiquido >= 0 ? "#1066DA" : "#B33A3A",
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
      <h3 className="text-sm font-medium text-foreground">Renda mensal sustentável</h3>
      <div className="w-full min-w-0" style={{ height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={dados} margin={{ top: 16, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="idade"
              stroke="#5F85B8"
              tick={{ fill: "#5F85B8", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#5F85B8"
              tick={{ fill: "#5F85B8", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatarMoeda}
            />
            {areaIndependencia && (
              <ReferenceArea
                x1={areaIndependencia.x1}
                x2={areaIndependencia.x2}
                fill="rgba(16,102,218,0.08)"
                strokeOpacity={0}
              />
            )}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]?.payload as DadoRendaGrafico
                const status = p.acimaMeta ? "Acima da meta" : "Abaixo da meta"
                const corStatus = p.acimaMeta ? "#1066DA" : "#B33A3A"
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
                          Renda sustentável: {formatarMoedaCompleta(p.rendaReal)}
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
                  stroke="#1066DA"
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
                name="Renda sustentável"
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
              stroke="#B33A3A"
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
