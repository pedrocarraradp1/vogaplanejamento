"use client"

import { useState } from "react"
import { fmtMoeda } from "@/components/sections/sucessorio/consultoria/format"

const FRENTE: Record<string, string> = {
  sucessorio: "Sucessório",
  juridico: "Jurídico",
  fiscal: "Fiscal",
  internacional: "Internacional",
}

export function CartaoRisco({
  frente,
  titulo,
  impacto,
  seNadaForFeito,
  memoria,
  urgencia,
  moeda,
}: {
  frente: string
  titulo: string
  impacto: number
  seNadaForFeito: string
  memoria: string
  urgencia: number
  moeda: "BRL" | "USD"
}) {
  const [aberto, setAberto] = useState(false)
  const cor =
    urgencia >= 4 ? "var(--consultoria-risco)" : urgencia >= 3 ? "var(--consultoria-atencao)" : "var(--consultoria-ok)"
  return (
    <article
      className="consultoria-surface consultoria-enter"
      style={{ padding: 24, borderLeft: `3px solid ${cor}` }}
    >
      <p className="consultoria-badge" style={{ marginBottom: 12 }}>
        {FRENTE[frente] ?? frente}
      </p>
      <h3 className="consultoria-h2">{titulo}</h3>
      <p
        className="consultoria-numero"
        style={{
          margin: "16px 0",
          fontFamily: "var(--font-heading)",
          fontSize: 28,
          lineHeight: "34px",
          fontWeight: 600,
        }}
      >
        {fmtMoeda(impacto, moeda)}
      </p>
      <p className="consultoria-corpo">
        <span className="consultoria-rotulo">Se nada for feito</span>
        <br />
        {seNadaForFeito}
      </p>
      <button
        type="button"
        className="consultoria-badge"
        style={{ marginTop: 14, color: "var(--voga-brasilia)", borderColor: "var(--voga-brasilia)" }}
        onClick={() => setAberto((v) => !v)}
      >
        {aberto ? "ocultar cálculo" : "ver cálculo"}
      </button>
      {aberto ? (
        <p className="consultoria-corpo" style={{ marginTop: 12, color: "var(--consultoria-neutro)" }}>
          {memoria}
        </p>
      ) : null}
    </article>
  )
}
