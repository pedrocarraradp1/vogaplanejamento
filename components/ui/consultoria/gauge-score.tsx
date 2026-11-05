"use client"

import { useCountUp } from "./use-count-up"

const NIVEL = { baixo: "Baixo", medio: "Médio", alto: "Alto" } as const

export function GaugeScore({
  score,
  nivel,
}: {
  score: number
  nivel: "baixo" | "medio" | "alto"
}) {
  const n = useCountUp(score)
  const r = 88
  const c = Math.PI * r
  const pct = Math.min(100, Math.max(0, n)) / 100
  const badge =
    nivel === "alto" ? "consultoria-badge consultoria-badge--risco" : nivel === "medio" ? "consultoria-badge consultoria-badge--atencao" : "consultoria-badge consultoria-badge--ok"
  return (
    <div className="flex flex-col items-center">
      <svg width="240" height="148" viewBox="0 0 240 148" aria-hidden>
        <path
          d="M32 120 A88 88 0 0 1 208 120"
          fill="none"
          stroke="#E5EAF1"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M32 120 A88 88 0 0 1 208 120"
          fill="none"
          stroke="var(--voga-brasilia)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <p className="consultoria-display" style={{ marginTop: -48 }}>
        {Math.round(n)}
      </p>
      <span className={badge}>{NIVEL[nivel]}</span>
    </div>
  )
}
