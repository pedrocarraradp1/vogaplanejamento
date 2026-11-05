"use client"

import { fmtMoeda } from "@/components/sections/sucessorio/consultoria/format"
import { AjudaConsultoria } from "./ajuda"
import { useCountUp } from "./use-count-up"

export function NumeroHeroi({
  rotulo,
  valor,
  moeda,
  sufixo,
  hint,
  ajuda,
  tamanho = "lg",
  tom = "noite",
}: {
  rotulo: string
  valor: number
  moeda?: "BRL" | "USD"
  sufixo?: string
  hint?: string
  ajuda?: string
  tamanho?: "lg" | "md"
  tom?: "noite" | "branco" | "azul"
}) {
  const n = useCountUp(valor)
  const texto =
    moeda != null
      ? fmtMoeda(n, moeda)
      : sufixo
        ? `${n.toFixed(1).replace(".", ",")} ${sufixo}`
        : String(Math.round(n))
  const cor =
    tom === "branco" ? "#fff" : tom === "azul" ? "var(--voga-brasilia)" : "var(--voga-noite)"
  return (
    <div>
      <p className="consultoria-rotulo">
        {rotulo}
        {ajuda ? <AjudaConsultoria texto={ajuda} /> : null}
      </p>
      <p
        className={tamanho === "lg" ? "consultoria-display" : "consultoria-h1"}
        style={{ color: cor, fontVariantNumeric: "tabular-nums" }}
      >
        {texto}
      </p>
      {hint ? (
        <p className="consultoria-corpo" style={{ color: "var(--consultoria-neutro)", marginTop: 8 }}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}
