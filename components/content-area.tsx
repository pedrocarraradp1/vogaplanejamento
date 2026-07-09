"use client"

import { DadosPessoais } from "./sections/dados-pessoais"
import { Patrimonio } from "./sections/patrimonio"
import { Objetivos } from "./sections/objetivos"
import { FluxoDeCaixa } from "./sections/fluxo-de-caixa"
import { DiagnosticoFinanceiro } from "./sections/diagnostico-financeiro"
import { Projecao } from "./sections/projecao"
import { Cenarios } from "./sections/cenarios"
import { PlanoFinanceiroCompleto } from "./sections/plano-financeiro-completo"
import { Sucessorio } from "./sections/sucessorio"
import { ProtecaoFinanceira } from "./sections/protecao-financeira"
import { SimuladorSeguros } from "./sections/simulador-seguros"
import { PgblVsVgbl } from "./sections/pgbl-vs-vgbl"
import { EficienciaTributaria } from "./sections/eficiencia-tributaria"
import { PlanoReadOnlyProvider } from "@/lib/plano-readonly-context"

interface ContentAreaProps {
  activeSection: string
  onNavigate: (section: string) => void
  /** Modo somente leitura (link público compartilhado). */
  readOnly?: boolean
}

export function ContentArea({ activeSection, onNavigate, readOnly = false }: ContentAreaProps) {
  const renderSection = () => {
    switch (activeSection) {
      case "dados-pessoais":
        return <DadosPessoais onNavigate={onNavigate} readOnly={readOnly} />
      case "patrimonio":
        return <Patrimonio onNavigate={onNavigate} readOnly={readOnly} />
      case "objetivos":
        return <Objetivos onNavigate={onNavigate} readOnly={readOnly} />
      case "fluxo-de-caixa":
        return <FluxoDeCaixa onNavigate={onNavigate} readOnly={readOnly} />
      case "diagnostico-financeiro":
        return <DiagnosticoFinanceiro onNavigate={onNavigate} readOnly={readOnly} />
      case "projecao":
        return <Projecao onNavigate={onNavigate} readOnly={readOnly} />
      case "cenarios":
        return <Cenarios onNavigate={onNavigate} readOnly={readOnly} />
      case "plano-financeiro-completo":
        return <PlanoFinanceiroCompleto onNavigate={onNavigate} readOnly={readOnly} />
      case "sucessorio":
        return <Sucessorio onNavigate={onNavigate} readOnly={readOnly} />
      case "protecao":
        return <ProtecaoFinanceira onNavigate={onNavigate} readOnly={readOnly} />
      case "simulador-seguros":
        return <SimuladorSeguros onNavigate={onNavigate} readOnly={readOnly} />
      case "pgbl-vs-vgbl":
        return <PgblVsVgbl onNavigate={onNavigate} readOnly={readOnly} />
      case "eficiencia-tributaria":
        return <EficienciaTributaria onNavigate={onNavigate} readOnly={readOnly} />
      default:
        return <DadosPessoais onNavigate={onNavigate} readOnly={readOnly} />
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
      <PlanoReadOnlyProvider readOnly={readOnly}>
        <div className={readOnly ? "plano-readonly-view" : undefined}>{renderSection()}</div>
      </PlanoReadOnlyProvider>
    </main>
  )
}
