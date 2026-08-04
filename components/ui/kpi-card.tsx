"use client"

import type { ReactNode } from "react"

export function KpiCard({
  label,
  value,
  hint,
  valueColor = "#393939",
  tooltip,
  background = "var(--surface)",
}: {
  label: ReactNode
  value: string
  hint?: string
  valueColor?: string
  tooltip?: string
  background?: string
}) {
  return (
    <div style={{ background, borderRadius: 6, padding: "12px 14px" }} title={tooltip}>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          color: "#5F85B8",
          marginBottom: 5,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, color: valueColor }}>{value}</div>
      {hint ? (
        <div style={{ fontSize: 10, color: "#5F85B8", marginTop: 2 }}>{hint}</div>
      ) : null}
    </div>
  )
}

export function KpiGrid({ children }: { children: ReactNode }) {
  return (
    <div className="pdf-grid-kpis grid grid-cols-2 md:grid-cols-4 gap-2.5">
      {children}
    </div>
  )
}
