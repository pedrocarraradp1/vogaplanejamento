"use client"

import { useEffect, useState } from "react"
import type { LinhaLeitura } from "./perguntas"
import type { DefPergunta } from "./perguntas"

export function PassoPerguntas({
  pergunta,
  indice,
  total,
  valor,
  onEscolher,
  leitura,
}: {
  pergunta: DefPergunta
  indice: number
  total: number
  valor: string
  onEscolher: (value: string) => void
  leitura: LinhaLeitura[]
}) {
  const pct = total > 0 ? ((indice + 1) / total) * 100 : 0
  const [destaque, setDestaque] = useState(valor)

  useEffect(() => {
    setDestaque(valor)
  }, [valor, pergunta.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ops = pergunta.opcoes
      const i = Math.max(0, ops.findIndex((o) => o.value === destaque))
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setDestaque(ops[Math.min(ops.length - 1, i + 1)]?.value ?? ops[0].value)
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setDestaque(ops[Math.max(0, i - 1)]?.value ?? ops[0].value)
      }
      if (e.key === "Enter" && destaque) onEscolher(destaque)
      if (e.key === "s" || e.key === "S") {
        const sim = ops.find((o) => o.value === "Sim" || o.value === "true")
        if (sim) onEscolher(sim.value)
      }
      if (e.key === "n" || e.key === "N") {
        const nao = ops.find((o) => o.value === "Não" || o.value === "false")
        if (nao) onEscolher(nao.value)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [pergunta, destaque, onEscolher])

  return (
    <div className="consultoria-grid consultoria-slide-next">
      <div className="consultoria-col-7" style={{ maxWidth: 640, margin: "0 auto" }}>
        <p className="consultoria-rotulo mb-3">
          {indice + 1} de {total}
        </p>
        <div className="consultoria-progresso mb-10">
          <span style={{ width: `${pct}%` }} />
        </div>
        <h2 className="consultoria-h1">{pergunta.titulo}</h2>
        <p className="consultoria-corpo" style={{ margin: "12px 0 32px", fontSize: 15 }}>
          {pergunta.porQue}
        </p>
        <div className="flex flex-wrap gap-4">
          {pergunta.opcoes.map((op) => {
            const on = destaque === op.value || valor === op.value
            return (
              <button
                key={op.value}
                type="button"
                className={`consultoria-opcao${on ? " is-on" : ""}`}
                onClick={() => onEscolher(op.value)}
              >
                {on ? <span className="consultoria-check">✓</span> : null}
                {op.label}
              </button>
            )
          })}
        </div>
      </div>
      <aside className="consultoria-col-5 hidden lg:block">
        <p className="consultoria-rotulo mb-4">Leitura ao vivo</p>
        <ul className="space-y-2">
          {leitura.map((l) => (
            <li key={l.id} className="consultoria-corpo" style={{ color: "var(--consultoria-neutro)" }}>
              {l.positivo ? "+" : "−"} {l.texto}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}
