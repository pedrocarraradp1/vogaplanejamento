"use client"

import { fmtMoeda } from "@/components/sections/sucessorio/consultoria/format"

export type BarraItem = {
  id: string
  nome: string
  valor: number
  recomendada?: boolean
  zero?: boolean
}

export function BarraComparativa({ itens, moeda }: { itens: BarraItem[]; moeda: "BRL" | "USD" }) {
  const max = Math.max(1, ...itens.map((i) => Math.abs(i.valor)))
  return (
    <ul className="space-y-3">
      {itens.map((i) => {
        const pct = Math.max(2, (Math.abs(i.valor) / max) * 100)
        const cor = i.zero ? "#E5EAF1" : i.recomendada ? "var(--voga-brasilia)" : "#C5CED8"
        return (
          <li key={i.id} className="consultoria-enter">
            <div className="flex items-baseline justify-between gap-4 mb-1">
              <span className="consultoria-corpo">{i.nome}</span>
              <span className="consultoria-corpo consultoria-numero">{fmtMoeda(i.valor, moeda)}</span>
            </div>
            <div className="consultoria-progresso">
              <span style={{ width: `${pct}%`, background: cor }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
