"use client"

import { EmBreve } from "./em-breve"

interface DiagnosticoFinanceiroProps {
  onNavigate: (section: string) => void
}

export function DiagnosticoFinanceiro({ onNavigate }: DiagnosticoFinanceiroProps) {
  return (
    <EmBreve
      grupo="Planejamento Financeiro"
      titulo="Diagnóstico Financeiro"
      onNavigate={onNavigate}
    />
  )
}
