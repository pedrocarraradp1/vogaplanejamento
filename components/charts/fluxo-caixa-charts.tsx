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
import { CORES_FLUXO_CAIXA, type MesRealizadoCalculado } from "@/lib/fluxo-caixa-utils"

const CHART_HEIGHT = 220

export function GraficoRealizadoMensal({
  dados,
  formatBRL,
  onHoverMes,
}: {
  dados: MesRealizadoCalculado[]
  formatBRL: (v: number) => string
  onHoverMes: (idx: number | null) => void
}) {
  const saldoMin = Math.min(0, ...dados.map((d) => d.saldoAcumulado))
  const saldoMax = Math.max(0, ...dados.map((d) => d.saldoAcumulado))

  return (
    <div className="w-full min-w-0" style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart
          data={dados}
          margin={{ top: 8, right: 48, left: 8, bottom: 4 }}
          onMouseMove={(state) => {
            const idx = state?.activeTooltipIndex
            onHoverMes(typeof idx === "number" ? idx : null)
          }}
          onMouseLeave={() => onHoverMes(null)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#6B7280", fontSize: 11 }}
            axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: "#6B7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatBRL(v).replace("R$", "").trim()}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[saldoMin, saldoMax]}
            tick={{ fill: CORES_FLUXO_CAIXA.saldoAcumulado, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatBRL(v).replace("R$", "").trim()}
          />
          <ReferenceLine yAxisId="left" y={0} stroke="rgba(0,0,0,0.2)" />
          <Bar
            yAxisId="left"
            dataKey="rentabilidade"
            stackId="fluxo"
            fill={CORES_FLUXO_CAIXA.rentabilidade}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="left"
            dataKey="receita"
            stackId="fluxo"
            fill={CORES_FLUXO_CAIXA.receita}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="left"
            dataKey="despesaNeg"
            stackId="fluxo"
            fill={CORES_FLUXO_CAIXA.despesa}
            isAnimationActive={false}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="saldoAcumulado"
            stroke={CORES_FLUXO_CAIXA.saldoAcumulado}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function GraficoOrcadoVsRealizado({
  dados,
  formatBRL,
  onHoverMes,
}: {
  dados: Array<{
    label: string
    orcadoAcumulado: number
    realizadoAcumulado: number
  }>
  formatBRL: (v: number) => string
  onHoverMes: (idx: number | null) => void
}) {
  return (
    <div className="w-full min-w-0" style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart
          data={dados}
          margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
          onMouseMove={(state) => {
            const idx = state?.activeTooltipIndex
            onHoverMes(typeof idx === "number" ? idx : null)
          }}
          onMouseLeave={() => onHoverMes(null)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#6B7280", fontSize: 11 }}
            axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#6B7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatBRL(v).replace("R$", "").trim()}
          />
          <Line
            type="monotone"
            dataKey="orcadoAcumulado"
            stroke={CORES_FLUXO_CAIXA.orcado}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="realizadoAcumulado"
            stroke={CORES_FLUXO_CAIXA.realizado}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export interface CategoriaLegenda {
  id: string
  label: string
  fill: string
  dashed?: boolean
}

export function LegendaFluxo({ itens }: { itens: CategoriaLegenda[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", marginBottom: 12 }}>
      {itens.map((item) => (
        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: item.dashed ? 18 : 10,
              height: item.dashed ? 0 : 10,
              borderRadius: item.dashed ? 0 : 2,
              background: item.dashed ? "transparent" : item.fill,
              border: item.dashed ? `2px dashed ${item.fill}` : "none",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, color: "#4B5563" }}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export function DestaqueHover({
  valor,
  subtitulo,
  detalhes,
  subtituloColor,
}: {
  valor: string
  subtitulo: string
  subtituloColor?: string
  detalhes?: Array<{ id: string; label: string; valor: string; fill: string; valorColor?: string }>
}) {
  return (
    <div style={{ textAlign: "center", marginBottom: 12, minHeight: detalhes?.length ? 100 : 52 }}>
      <p
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: "#1A1A1A",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {valor}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: subtituloColor ?? "#6B7280" }}>{subtitulo}</p>
      {detalhes && detalhes.length > 0 ? (
        <div
          style={{
            marginTop: 12,
            textAlign: "left",
            maxWidth: 360,
            marginLeft: "auto",
            marginRight: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {detalhes.map((d) => (
            <div
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: d.fill,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "#374151" }}>{d.label}</span>
              </div>
              <span
                style={{
                  fontWeight: 600,
                  color: d.valorColor ?? "#1A1A1A",
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {d.valor}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
