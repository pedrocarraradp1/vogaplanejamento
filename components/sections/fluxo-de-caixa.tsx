"use client"

import { EmBreve } from "./em-breve"

interface FluxoDeCaixaProps {
  onNavigate: (section: string) => void
}

export function FluxoDeCaixa({ onNavigate }: FluxoDeCaixaProps) {
  return (
    <EmBreve
      grupo="Planejamento Financeiro"
      titulo="Fluxo de Caixa"
      onNavigate={onNavigate}
      prevSection="objetivos"
      nextSection="projecao"
    />
  )
}
