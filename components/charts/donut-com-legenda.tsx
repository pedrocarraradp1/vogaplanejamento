"use client"

import type { ReactNode } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { usePieVogaProps } from "@/components/charts/use-pie-voga"
import {
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  formatDonutTooltipPct,
} from "@/lib/chart-tooltip"

export type DonutSlice = { name: string; value: number; fill: string }

export function DonutComLegenda({
  data,
  formatCurrency,
  footer,
}: {
  data: DonutSlice[]
  formatCurrency: (v: number) => string
  footer?: ReactNode
}) {
  const pieVoga = usePieVogaProps()
  const ativo = data.filter((d) => d.value > 0)
  const total = ativo.reduce((s, d) => s + d.value, 0)

  if (total <= 0) {
    return (
      <p style={{ fontSize: 12, color: "#5F85B8", textAlign: "center", padding: "40px 0" }}>
        Sem dados para exibir
      </p>
    )
  }

  return (
    <div className="donut-com-legenda" style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 155, height: 155, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={ativo}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              {...pieVoga}
            >
              {ativo.map((entry, i) => (
                <Cell key={`${entry.name}-${i}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const entry = payload[0]
                const nome = String(entry.name ?? "")
                const valor = Number(entry.value) || 0
                const pct = formatDonutTooltipPct(valor, total)
                return (
                  <div style={{ ...CHART_TOOLTIP_STYLE, fontSize: 12 }}>
                    <div style={{ ...CHART_TOOLTIP_LABEL_STYLE, marginBottom: 4 }}>{nome}</div>
                    <div style={CHART_TOOLTIP_ITEM_STYLE}>
                      {formatCurrency(valor)} ({pct}%)
                    </div>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1, minWidth: 0 }}>
        {ativo.map((item) => {
          const pct = formatDonutTooltipPct(item.value, total)
          return (
            <li
              key={item.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "5px 0",
                borderBottom: "0.5px solid rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: item.fill,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, color: "#1a1a1a" }}>{item.name}</span>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>
                  {formatCurrency(item.value)}
                </div>
                <div style={{ fontSize: 10, color: "#5F85B8" }}>{pct}%</div>
              </div>
            </li>
          )
        })}
      </ul>
      {footer}
    </div>
  )
}
