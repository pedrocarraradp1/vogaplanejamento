"use client"

import { fmtMoeda } from "@/components/sections/sucessorio/consultoria/format"

export type SegPatrimonio = { id: string; label: string; valor: number; cor: string }

export function LinhaDoTempoPatrimonio({
  segmentos,
  total,
  moeda,
  modo,
  onModo,
}: {
  segmentos: SegPatrimonio[]
  total: number
  moeda: "BRL" | "USD"
  modo: "hoje" | "plano"
  onModo: (m: "hoje" | "plano") => void
}) {
  const soma = segmentos.reduce((s, x) => s + Math.max(0, x.valor), 0)
  const base = soma > 0 ? soma : total || 1
  return (
    <div className="consultoria-surface" style={{ padding: 28 }}>
      <div className="flex items-center justify-between gap-4 mb-6">
        <p className="consultoria-rotulo">Decomposição do patrimônio</p>
        <div className="flex gap-2">
          {(["hoje", "plano"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className="consultoria-badge"
              style={{
                color: modo === m ? "var(--voga-brasilia)" : "var(--consultoria-neutro)",
                borderColor: modo === m ? "var(--voga-brasilia)" : "transparent",
              }}
              onClick={() => onModo(m)}
            >
              {m === "hoje" ? "Hoje" : "Com o plano"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-between mb-2 gap-2">
        {segmentos.map((s) => (
          <span key={s.id} className="consultoria-rotulo" style={{ flex: Math.max(s.valor, 0) }}>
            {s.label}
          </span>
        ))}
      </div>
      <div className="consultoria-barra-seg" key={modo}>
        {segmentos.map((s) => (
          <i
            key={s.id}
            style={{
              width: `${(Math.max(0, s.valor) / base) * 100}%`,
              background: s.cor,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 gap-2">
        {segmentos.map((s) => (
          <span key={s.id} className="consultoria-corpo" style={{ flex: Math.max(s.valor, 0), fontSize: 12 }}>
            {fmtMoeda(s.valor, moeda)}
          </span>
        ))}
      </div>
    </div>
  )
}
