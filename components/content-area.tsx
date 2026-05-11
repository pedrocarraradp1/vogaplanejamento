"use client"

import { DadosPessoais } from "./sections/dados-pessoais"
import { Patrimonio } from "./sections/patrimonio"
import { Objetivos } from "./sections/objetivos"
import { Projecao } from "./sections/projecao"
import { Sucessorio } from "./sections/sucessorio"
import { ProtecaoFinanceira } from "./sections/protecao-financeira"
import { SimuladorSeguros } from "./sections/simulador-seguros"
import { Dashboard } from "./sections/dashboard"

interface ContentAreaProps {
  activeSection: string
  onNavigate: (section: string) => void
}

export function ContentArea({ activeSection, onNavigate }: ContentAreaProps) {
  const renderSection = () => {
    switch (activeSection) {
      case "dados-pessoais":
        return <DadosPessoais onNavigate={onNavigate} />
      case "patrimonio":
        return <Patrimonio onNavigate={onNavigate} />
      case "objetivos":
        return <Objetivos onNavigate={onNavigate} />
      case "projecao":
        return <Projecao onNavigate={onNavigate} />
      case "sucessorio":
        return <Sucessorio onNavigate={onNavigate} />
      case "protecao":
        return <ProtecaoFinanceira onNavigate={onNavigate} />
      case "simulador-seguros":
        return <SimuladorSeguros onNavigate={onNavigate} />
      case "dashboard":
        return <Dashboard onNavigate={onNavigate} />
      default:
        return <DadosPessoais onNavigate={onNavigate} />
    }
  }

  return (
    <main className="ml-64 min-h-screen bg-background">
      <div className="px-10 py-10">
        {renderSection()}
      </div>
    </main>
  )
}
