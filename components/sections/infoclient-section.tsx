"use client"

import { ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InfoClient } from "@/components/sections/diagnostico/infoclient"

interface InfoClientSectionProps {
  onNavigate: (section: string) => void
  readOnly?: boolean
}

export function InfoClientSection({ onNavigate }: InfoClientSectionProps) {
  return (
    <div className="space-y-6">
      <InfoClient />
      <div className="nav-footer no-print">
        <Button
          variant="ghost"
          className="btn-back"
          onClick={() => onNavigate("diagnostico-financeiro")}
        >
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
