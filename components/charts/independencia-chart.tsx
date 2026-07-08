"use client"

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { TooltipFlutuante, useTooltipHover } from "@/components/charts/chart-tooltip"
import { VOGA } from "@/lib/voga-tokens"

const CHART_HEIGHT = 300
const NAVY = VOGA.noite
const GOLD = VOGA.brasilia
const GREEN = VOGA.brasilia

export interface PontoIndependencia {
  idade: number
  ano: number
  patrimonio: number
  rendaSustentavel: number
}

const MARGIN = { top: 20, right: 12, left: 12, bottom: 8 }
const AXIS_WIDTH = 56
const PLOT_BOTTOM = 28

export function IndependenciaChart({
  data,
  necessario,
  idadeIndependencia,
  formatarMoeda,
  formatarMoedaCompleta,
}: {
  data: PontoIndependencia[]
  necessario: number
  idadeIndependencia: number | null
  formatarMoeda: (v: number) => string
  formatarMoedaCompleta: (v: number) => string
}) {
  const { containerRef, hoveredIdx, tooltipPos, updateTooltip, handleLeave } = useTooltipHover()
  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null

  const plotTop = MARGIN.top
  const plotHeight = CHART_HEIGHT - plotTop - PLOT_BOTTOM

  return (
    <div
      ref={containerRef}
      className="w-full min-w-0 relative"
      style={{ height: CHART_HEIGHT }}
      onMouseLeave={handleLeave}
    >
      <div style={{ pointerEvents: "none" }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={data} margin={MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis
              dataKey="idade"
              tick={{ fill: "var(--text-label)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              width={AXIS_WIDTH}
              tick={{ fill: "var(--text-label)", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatarMoeda}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              width={AXIS_WIDTH}
              tick={{ fill: GREEN, fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatarMoeda}
            />
            <ReferenceLine
              yAxisId="left"
              y={necessario}
              stroke={GOLD}
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{
                value: "Patrimônio necessário",
                position: "insideTopRight",
                fill: GOLD,
                fontSize: 11,
                fontWeight: 600,
              }}
            />
            <Bar yAxisId="left" dataKey="patrimonio" fill={NAVY} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="rendaSustentavel"
              stroke={GREEN}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Overlay de hover — coluna inteira por ano */}
      <div
        style={{
          position: "absolute",
          left: MARGIN.left + AXIS_WIDTH,
          right: MARGIN.right + AXIS_WIDTH,
          top: plotTop,
          height: plotHeight,
          display: "flex",
        }}
      >
        {data.map((d, i) => (
          <div
            key={`${d.idade}-${d.ano}`}
            className="ano-coluna"
            style={{ flex: 1, minWidth: 0, height: "100%", cursor: "default" }}
            onMouseEnter={(e) => updateTooltip(i, e.clientX, e.clientY)}
            onMouseMove={(e) => updateTooltip(i, e.clientX, e.clientY)}
          />
        ))}
      </div>

      {hovered && tooltipPos ? (
        <TooltipFlutuante
          pos={tooltipPos}
          titulo={formatarMoedaCompleta(hovered.patrimonio)}
          subtitulo={`Idade ${hovered.idade} · ${hovered.ano}${
            idadeIndependencia === hovered.idade ? " · independência" : ""
          }`}
          detalhes={[
            {
              id: "pat",
              label: "Patrimônio acumulado",
              valor: formatarMoedaCompleta(hovered.patrimonio),
              fill: NAVY,
            },
            {
              id: "renda",
              label: "Renda mensal sustentável",
              valor: formatarMoedaCompleta(hovered.rendaSustentavel),
              fill: GREEN,
              valorColor: GREEN,
            },
            {
              id: "nec",
              label: "Patrimônio necessário",
              valor: formatarMoedaCompleta(necessario),
              fill: GOLD,
              valorColor: "#8A7220",
            },
          ]}
        />
      ) : null}
    </div>
  )
}
