"use client"

import { useState } from "react"
import Link from "next/link"
import { Sidebar } from "@/components/sidebar"
import { ContentArea } from "@/components/content-area"
import { PlanoProvider } from "@/lib/plano-context"
import { SalvarSimulacaoModal } from "@/components/simulacoes/salvar-simulacao-modal"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("dados-pessoais")

  return (
    <PlanoProvider>
      <div className="min-h-screen bg-background">
        <div className="fixed top-6 right-[200px] z-50 flex items-center gap-2">
          <Link href="/clientes">
            <Button
              variant="outline"
              className="h-9 border-white/10 bg-[#131929] text-muted-foreground hover:text-foreground hover:bg-white/5"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <SalvarSimulacaoModal />
        </div>
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <ContentArea
          activeSection={activeSection}
          onNavigate={setActiveSection}
        />
      </div>
    </PlanoProvider>
  )
}
