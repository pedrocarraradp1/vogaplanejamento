"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ContentArea } from "@/components/content-area"
import { PlanoProvider } from "@/lib/plano-context"
import { SalvarSimulacaoModal } from "@/components/simulacoes/salvar-simulacao-modal"

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("dados-pessoais")

  return (
    <PlanoProvider>
      <div className="min-h-screen bg-background">
        <div className="fixed top-6 right-[200px] z-50">
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
