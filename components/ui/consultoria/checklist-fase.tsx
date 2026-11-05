"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { FASE_LABEL, RESP_LABEL } from "@/components/sections/sucessorio/consultoria/format"
import type { ItemAcao } from "@/lib/sucessorio/consultoria"

const FASES = ["imediato", "90_dias", "12_meses"] as const

export function ChecklistFase({
  itens,
  concluidas,
  locked,
  onToggle,
}: {
  itens: ItemAcao[]
  concluidas: string[]
  locked?: boolean
  onToggle: (id: string) => void
}) {
  return (
    <div className="consultoria-grid">
      {FASES.map((fase) => {
        const lista = itens.filter((a) => a.fase === fase)
        const ids = lista.map((a) => `${a.fase}:${a.titulo}`)
        const feitos = ids.filter((id) => concluidas.includes(id)).length
        return (
          <section key={fase} className="consultoria-col-4 consultoria-surface" style={{ padding: 22 }}>
            <p className="consultoria-rotulo">{FASE_LABEL[fase]}</p>
            <p className="consultoria-corpo" style={{ color: "var(--consultoria-neutro)", margin: "8px 0 16px" }}>
              {feitos} de {lista.length}
            </p>
            <div className="consultoria-progresso mb-4">
              <span style={{ width: `${lista.length ? (feitos / lista.length) * 100 : 0}%` }} />
            </div>
            <ul className="space-y-3">
              {lista.map((a) => {
                const id = `${a.fase}:${a.titulo}`
                return (
                  <li key={id} className="flex items-start gap-3">
                    <Checkbox
                      checked={concluidas.includes(id)}
                      disabled={locked}
                      onCheckedChange={() => onToggle(id)}
                    />
                    <span className="consultoria-corpo">
                      {a.titulo}
                      <span className="consultoria-badge block mt-1">{RESP_LABEL[a.responsavel]}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
