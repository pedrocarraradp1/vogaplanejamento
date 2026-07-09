"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { CenariosInvestimento } from "@/components/ui/cenarios-investimento"
import { CenariosRetiradaSection } from "@/components/ui/cenarios-retirada-section"
import { isPlanoCompleto, type PlanoSecaoVariant } from "@/lib/plano-secoes"

interface CenariosProps {
  onNavigate: (section: string) => void
  variant?: PlanoSecaoVariant
}

export function Cenarios({ onNavigate, variant = "full" }: CenariosProps) {
  const resumo = isPlanoCompleto(variant)
  const [displayMode, setDisplayMode] = useState<"nominal" | "real">("real")

  if (resumo) {
    return (
      <div className="space-y-6">
        <CenariosInvestimento
          displayMode={displayMode}
          onDisplayModeChange={setDisplayMode}
          editable={false}
          layout="resumo"
        />
        <CenariosRetiradaSection displayMode={displayMode} className="mt-6" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Planejamento Patrimonial</p>
        <h1 className="page-title text-[24px] text-foreground">
          Cenários <span className="text-primary">de Investimento</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Compare perfis conservador, moderado e agressivo com as mesmas premissas do plano
        </p>
      </div>

      <CenariosInvestimento
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        editable
      />

      <CenariosRetiradaSection displayMode={displayMode} className="mt-6" />

      <div className="nav-footer">
        <Button variant="ghost" className="btn-back" onClick={() => onNavigate("projecao")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={() => onNavigate("sucessorio")} className="btn-next">
          Próximo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
