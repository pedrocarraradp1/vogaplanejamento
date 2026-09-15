"use client"

import { useEffect, useRef, useState } from "react"
import { CenarioSecaoBox } from "@/components/ui/cenario-secao-box"
import { Textarea } from "@/components/ui/textarea"
import { usePlano, type ComentariosConsultor as ComentariosConsultorState } from "@/lib/plano-context"
import { usePlanoReadOnly } from "@/lib/plano-readonly-context"

export type ComentariosConsultorCampo = keyof ComentariosConsultorState

const MAX_CHARS = 2000
const DEBOUNCE_MS = 500
const PLACEHOLDER = "Observações, recomendações e próximos passos para o cliente..."

export function ComentariosConsultor({
  campo,
  readOnly: readOnlyProp,
}: {
  campo: ComentariosConsultorCampo
  readOnly?: boolean
}) {
  const { state, setComentariosConsultor } = usePlano()
  const planoReadOnly = usePlanoReadOnly()
  const readOnly = Boolean(readOnlyProp || planoReadOnly)
  const persistido = state.comentariosConsultor?.[campo] ?? ""
  const [rascunho, setRascunho] = useState(persistido)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const rascunhoRef = useRef(rascunho)
  const persistidoRef = useRef(persistido)

  rascunhoRef.current = rascunho
  persistidoRef.current = persistido

  useEffect(() => {
    setRascunho(persistido)
  }, [persistido])

  useEffect(() => {
    if (readOnly) return
    if (rascunho === persistido) return
    const timer = window.setTimeout(() => {
      setComentariosConsultor({ [campo]: rascunho })
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [rascunho, persistido, campo, readOnly, setComentariosConsultor])

  useEffect(() => {
    return () => {
      if (readOnly) return
      if (rascunhoRef.current !== persistidoRef.current) {
        setComentariosConsultor({ [campo]: rascunhoRef.current })
      }
    }
  }, [campo, readOnly, setComentariosConsultor])

  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [rascunho, readOnly])

  const texto = persistido.trim()
  if (readOnly) {
    if (!texto) return null
    return (
      <CenarioSecaoBox title="Comentários do consultor">
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{persistido}</p>
      </CenarioSecaoBox>
    )
  }

  return (
    <CenarioSecaoBox title="Comentários do consultor">
      <div className="space-y-2">
        <Textarea
          ref={areaRef}
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value.slice(0, MAX_CHARS))}
          placeholder={PLACEHOLDER}
          rows={4}
          maxLength={MAX_CHARS}
          aria-label="Comentários do consultor"
          className="form-input text-foreground min-h-[6.5rem] resize-none overflow-hidden placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
        />
        <p className="text-[11px] text-muted-foreground text-right tabular-nums">
          {rascunho.length}/{MAX_CHARS}
        </p>
      </div>
    </CenarioSecaoBox>
  )
}
