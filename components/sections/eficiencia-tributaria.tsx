"use client"

import { EmBreve } from "./em-breve"

interface EficienciaTributariaProps {
  onNavigate: (section: string) => void
  readOnly?: boolean
}

export function EficienciaTributaria({ onNavigate }: EficienciaTributariaProps) {
  return (
    <EmBreve
      grupo="Planejamento Fiscal"
      titulo="Eficiência Tributária"
      onNavigate={onNavigate}
    />
  )
}
