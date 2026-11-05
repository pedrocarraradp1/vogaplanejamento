"use client"

import { CapaParecer } from "@/components/ui/consultoria/capa-parecer"
import { CompartilharPlanoModal } from "@/components/simulacoes/compartilhar-plano-modal"
import type { Parecer } from "@/lib/sucessorio/consultoria"

function destacar(texto: string) {
  const partes = texto.split(/(R\$\s?[\d.]+(?:,\d+)?|\d+,\d+\s*%|\d+(?:\.\d+)?\s*%)/g)
  return partes.map((p, i) =>
    /R\$|\d[\d.,]*\s*%/.test(p) ? (
      <span key={i} className="consultoria-numero">
        {p}
      </span>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

export function PassoParecer({
  parecer,
  texto,
  gerando,
  locked,
  gerandoPdf,
  onPdf,
  onRefazer,
  cliente,
  assessor,
  data,
}: {
  parecer: Parecer
  texto: string
  gerando: boolean
  locked: boolean
  gerandoPdf: boolean
  onPdf: () => void
  onRefazer?: () => void
  cliente: string
  assessor: string
  data: string
}) {
  const blocos = texto.split(/\n\n+/)
  return (
    <div className="consultoria-enter consultoria-grid">
      <div className="consultoria-col-5 flex justify-center">
        <CapaParecer cliente={cliente} assessor={assessor} data={data} />
      </div>
      <div className="consultoria-col-7">
        {gerando ? (
          <p className="consultoria-corpo" style={{ color: "var(--consultoria-neutro)" }}>
            Redigindo o parecer…
          </p>
        ) : (
          <div className="consultoria-parecer-texto space-y-6" data-gerado={parecer.geradoEm}>
            {blocos.map((b, i) =>
              i === 0 ? (
                <h2 key={i} className="consultoria-h2">
                  {destacar(b)}
                </h2>
              ) : (
                <p key={i}>{destacar(b)}</p>
              ),
            )}
          </div>
        )}
        {!locked && (
          <div className="flex flex-wrap gap-3 mt-10">
            <button
              type="button"
              className={`consultoria-btn consultoria-btn-primario${gerandoPdf ? " consultoria-btn-progresso" : ""}`}
              onClick={onPdf}
              disabled={gerandoPdf || gerando}
            >
              {gerandoPdf ? "Gerando…" : "Baixar PDF"}
            </button>
            <CompartilharPlanoModal label="Compartilhar com o cliente" />
            {onRefazer && (
              <button type="button" className="consultoria-btn consultoria-btn-secundario" onClick={onRefazer}>
                Refazer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
