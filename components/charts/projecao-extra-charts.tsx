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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  Line,
} from "recharts"
import {
  filtrarDadosFluxoPorPeriodo,
  type DadoFluxoGrafico,
  type DadoRendaGrafico,
} from "@/lib/projecao-graficos-dados"
import { formatMoedaSaida } from "@/lib/fluxo-caixa-utils"
import { CORES_FLUXO_ANUAL } from "@/lib/voga-tokens"
import { LegendaFluxo } from "@/components/charts/fluxo-caixa-charts"

type CoresFluxo = typeof CORES_FLUXO_ANUAL

const LEGENDA_ITENS = [
  { id: "rendimento", label: "Rendimento", fill: CORES_FLUXO_ANUAL.rendimento },
  { id: "aporte", label: "Aporte Mensal", fill: CORES_FLUXO_ANUAL.aporte },
  { id: "objetivos", label: "Objetivos", fill: CORES_FLUXO_ANUAL.objetivos },
  { id: "passivos", label: "Passivos", fill: CORES_FLUXO_ANUAL.passivos },
  { id: "retirada", label: "Retirada Aposentadoria", fill: CORES_FLUXO_ANUAL.retirada },
] as const

const CHART_HEIGHT = 280

interface ChartFormatters {
  formatarMoeda: (v: number) => string
  formatarMoedaCompleta: (v: number) => string
}

/** Máximo ~12 rótulos no eixo X para não sobrepor texto. */
function ticksIdadeSemSobrepor(idades: number[]): number[] {
  if (idades.length === 0) return []
  const step = Math.max(1, Math.ceil(idades.length / 12))
  const ticks: number[] = []
  for (let i = 0; i < idades.length; i += step) ticks.push(idades[i])
  const last = idades[idades.length - 1]
  if (ticks[ticks.length - 1] !== last) ticks.push(last)
  return ticks
}

export function FluxoAnualChart({
  data,
  formatarMoeda,
  formatarMoedaCompleta,
  hideTitle = false,
  hideMetaRenda = true,
  className,
  periodoInicioAno,
  periodoFimAno,
  anoBase,
  cores = CORES_FLUXO_ANUAL,
}: {
  data: DadoFluxoGrafico[]
  hideTitle?: boolean
  /** Sempre true no gráfico unificado — linha de meta renda removida. */
  hideMetaRenda?: boolean
  className?: string
  /** Ano-calendário inicial do intervalo visível (ex: 2026). */
  periodoInicioAno?: number
  /** Ano-calendário final do intervalo visível (ex: 2076). */
  periodoFimAno?: number
  /** Ano-calendário do t=0 da projeção — normalmente o ano corrente. */
  anoBase?: number
  cores?: CoresFluxo
} & ChartFormatters) {
  const dadosVisiveis = useMemo(() => {
    const all = data ?? []
    if (periodoInicioAno == null || periodoFimAno == null || anoBase == null) {
      return all
    }
    return filtrarDadosFluxoPorPeriodo(all, anoBase, periodoInicioAno, periodoFimAno)
  }, [data, periodoInicioAno, periodoFimAno, anoBase])

  const primeiroAno = dadosVisiveis[0]
  const xTicks = useMemo(
    () => ticksIdadeSemSobrepor(dadosVisiveis.map((d) => d.idade)),
    [dadosVisiveis],
  )
  const chartKey = `${periodoInicioAno ?? "all"}-${periodoFimAno ?? "all"}-${dadosVisiveis.length}-${dadosVisiveis[0]?.idade ?? ""}-${dadosVisiveis[dadosVisiveis.length - 1]?.idade ?? ""}`

  if (dadosVisiveis.length === 0) {
    return null
  }

  const legendItens = LEGENDA_ITENS.map((item) => ({
    ...item,
    fill: cores[item.id as keyof CoresFluxo] ?? item.fill,
  }))

  return (
    <div className={`w-full min-w-0 space-y-2 ${className ?? (hideTitle ? "" : "mt-8")}`}>
      {!hideTitle ? <h3 className="text-sm font-medium text-foreground">Fluxo Anual</h3> : null}
      <LegendaFluxo itens={[...legendItens]} />
      <div className="w-full min-w-0" style={{ height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart
            key={chartKey}
            data={dadosVisiveis}
            margin={{ top: 28, right: 24, left: 8, bottom: 4 }}
            stackOffset="sign"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis
              dataKey="idade"
              stroke="rgba(0,0,0,0.35)"
              tick={{ fill: "var(--text-label)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
              ticks={xTicks}
              interval={0}
            />
            <YAxis
              stroke="rgba(0,0,0,0.35)"
              tick={{ fill: "var(--text-label)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatarMoeda}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]?.payload as DadoFluxoGrafico
                const corLiq = p.fluxoLiquido >= 0 ? cores.positivo : cores.negativo
                return (
                  <div style={{ ...CHART_TOOLTIP_STYLE, fontSize: 12, minWidth: 200 }}>
                    <p style={{ ...CHART_TOOLTIP_LABEL_STYLE, margin: 0 }}>
                      Ano {p.t} · Idade {p.idade}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, opacity: 0.85, marginTop: 2 }}>
                      Fase: {p.fase}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, marginTop: 8, color: cores.rendimento }}>
                      Rendimento: {formatarMoedaCompleta(p.rendimento)}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: cores.aporte }}>
                      Aporte: {formatarMoedaCompleta(p.aporte)}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: cores.objetivos }}>
                      Objetivos: {formatMoedaSaida(formatarMoedaCompleta, p.objetivos)}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: cores.passivos }}>
                      Passivos: {formatMoedaSaida(formatarMoedaCompleta, p.passivos)}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: cores.retirada }}>
                      Retirada: {formatMoedaSaida(formatarMoedaCompleta, p.retirada)}
                    </p>
                    {!hideMetaRenda ? (
                      <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: cores.metaRenda }}>
                        Meta renda (ref.): {formatarMoedaCompleta(p.metaRenda)}
                      </p>
                    ) : null}
                    <p
                      className="mt-1 font-medium"
                      style={{ ...CHART_TOOLTIP_ITEM_STYLE, color: corLiq, marginTop: 6 }}
                    >
                      Fluxo líquido: {formatarMoedaCompleta(p.fluxoLiquido)}
                    </p>
                  </div>
                )
              }}
            />
            <ReferenceLine y={0} stroke="rgba(0,0,0,0.18)" />
            <Bar dataKey="rendimento" name="rendimento" stackId="fluxo" fill={cores.rendimento} />
            <Bar dataKey="aporte" name="aporte" stackId="fluxo" fill={cores.aporte} />
            <Bar dataKey="objetivos" name="objetivos" stackId="fluxo" fill={cores.objetivos} />
            <Bar dataKey="passivos" name="passivos" stackId="fluxo" fill={cores.passivos} />
            <Bar
              dataKey="retirada"
              name="retirada"
              stackId="fluxo"
              fill={cores.retirada}
              legendType="rect"
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
                  fill: primeiroAno.fluxoLiquido >= 0 ? cores.positivo : cores.negativo,
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
  formatarMoeda,
  formatarMoedaCompleta,
}: { data: DadoRendaGrafico[] } & ChartFormatters) {
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
      <h3 className="text-sm font-medium text-foreground">Renda gerada vs. retirada líquida do patrimônio</h3>
      <div className="w-full min-w-0" style={{ height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={dados} margin={{ top: 16, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis
              dataKey="idade"
              stroke="rgba(0,0,0,0.35)"
              tick={{ fill: "var(--text-label)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="rgba(0,0,0,0.35)"
              tick={{ fill: "var(--text-label)", fontSize: 11 }}
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
                const corStatus = p.acimaMeta ? "var(--cenario-1)" : "var(--voga-alerta)"
                return (
                  <div style={{ ...CHART_TOOLTIP_STYLE, fontSize: 12 }}>
                    <p style={{ ...CHART_TOOLTIP_LABEL_STYLE, margin: 0 }}>Idade {p.idade}</p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, marginTop: 6 }}>
                      Renda mensal gerada: {formatarMoedaCompleta(p.rendaGeradaReal)}
                    </p>
                    <p style={{ ...CHART_TOOLTIP_ITEM_STYLE, opacity: 0.85 }}>
                      Retirada líquida do patrimônio: {formatarMoedaCompleta(p.meta)}
                    </p>
                    <p
                      style={{
                        ...CHART_TOOLTIP_ITEM_STYLE,
                        fontWeight: 500,
                        color: corStatus,
                        marginTop: 6,
                      }}
                    >
                      {status}
                    </p>
                  </div>
                )
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Line
              type="monotone"
              dataKey="rendaGeradaReal"
              name="Renda mensal gerada"
              stroke="var(--cenario-1)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="meta"
              name="Retirada líquida do patrimônio"
              stroke="var(--voga-alerta)"
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
