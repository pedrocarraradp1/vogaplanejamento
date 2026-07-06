"use client"

import { DadosPessoais } from "./sections/dados-pessoais"
import { Patrimonio } from "./sections/patrimonio"
import { Objetivos } from "./sections/objetivos"
import { FluxoDeCaixa } from "./sections/fluxo-de-caixa"
import { DiagnosticoFinanceiro } from "./sections/diagnostico-financeiro"
import { Projecao } from "./sections/projecao"
import { Cenarios } from "./sections/cenarios"
import { Sucessorio } from "./sections/sucessorio"
import { ProtecaoFinanceira } from "./sections/protecao-financeira"
import { SimuladorSeguros } from "./sections/simulador-seguros"
import { PgblVsVgbl } from "./sections/pgbl-vs-vgbl"
import { EficienciaTributaria } from "./sections/eficiencia-tributaria"
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
      case "fluxo-de-caixa":
        return <FluxoDeCaixa onNavigate={onNavigate} />
      case "diagnostico-financeiro":
        return <DiagnosticoFinanceiro onNavigate={onNavigate} />
      case "projecao":
        return <Projecao onNavigate={onNavigate} />
      case "cenarios":
        return <Cenarios onNavigate={onNavigate} />
      case "sucessorio":
        return <Sucessorio onNavigate={onNavigate} />
      case "protecao":
        return <ProtecaoFinanceira onNavigate={onNavigate} />
      case "simulador-seguros":
        return <SimuladorSeguros onNavigate={onNavigate} />
      case "pgbl-vs-vgbl":
        return <PgblVsVgbl onNavigate={onNavigate} />
      case "eficiencia-tributaria":
        return <EficienciaTributaria onNavigate={onNavigate} />
      case "dashboard":
        return <Dashboard onNavigate={onNavigate} />
      default:
        return <DadosPessoais onNavigate={onNavigate} />
    }
  }

  return (
    <main
      className="flex-1 bg-background min-h-[calc(100vh-var(--header-height))]"
      style={{
        marginLeft: "var(--sidebar-width)",
        marginTop: "var(--header-height)",
        padding: "40px 48px",
      }}
    >
      {renderSection()}
    </main>
  )
}
