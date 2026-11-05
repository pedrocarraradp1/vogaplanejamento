"use client"

import { useState } from "react"
import { fmtMoeda } from "@/components/sections/sucessorio/consultoria/format"
import type { EstrategiaConsultoria } from "@/lib/sucessorio/consultoria"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export function CartaoEstrategia({
  estrategia,
  moeda,
  recomendada,
  publico,
}: {
  estrategia: EstrategiaConsultoria
  moeda: "BRL" | "USD"
  recomendada?: boolean
  publico?: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const e = estrategia
  return (
    <>
      <article
        className="consultoria-surface"
        style={{
          padding: 22,
          minHeight: 280,
          borderColor: recomendada ? "var(--voga-brasilia)" : undefined,
          borderWidth: recomendada ? 2 : 1,
        }}
      >
        <p className="consultoria-rotulo">{recomendada ? "Recomendada" : e.prazo}</p>
        <h3 className="consultoria-h2" style={{ margin: "10px 0 12px" }}>
          {e.nome}
        </h3>
        <p className="consultoria-h2 consultoria-numero">{fmtMoeda(e.economia, moeda)}</p>
        <ul className="mt-4 space-y-1 consultoria-corpo">
          {e.pros.slice(0, 2).map((p) => (
            <li key={p}>+ {p}</li>
          ))}
          {!publico &&
            e.contras.slice(0, 2).map((p) => (
              <li key={p} style={{ color: "var(--consultoria-neutro)" }}>
                − {p}
              </li>
            ))}
        </ul>
        <div className="flex gap-3 mt-4">
          <span className="consultoria-badge">{e.complexidade}</span>
          <span className="consultoria-badge">{e.prazo}</span>
        </div>
        <button type="button" className="consultoria-btn consultoria-btn-secundario mt-5" onClick={() => setAberto(true)}>
          Ver detalhes
        </button>
      </article>
      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="consultoria-h2">{e.nome}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-8 space-y-5 consultoria-corpo">
            <p>
              Economia {fmtMoeda(e.economia, moeda)}
              {!publico ? ` · custo ${fmtMoeda(e.custo, moeda)}` : ""}
            </p>
            <div>
              <p className="consultoria-rotulo mb-2">Pré-requisitos</p>
              <ul className="space-y-1">
                {e.preRequisitos.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="consultoria-rotulo mb-2">Próximos passos</p>
              <ul className="space-y-1">
                {e.proximosPassos.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            {e.templates.length > 0 && (
              <div>
                <p className="consultoria-rotulo mb-2">Documentos</p>
                <ul className="space-y-1">
                  {e.templates.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
