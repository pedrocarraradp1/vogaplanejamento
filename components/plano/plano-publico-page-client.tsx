"use client"

import { useEffect, useState } from "react"
import { PlanoProvider, usePlano, type PlanoState } from "@/lib/plano-context"
import { Sidebar } from "@/components/sidebar"
import { ContentArea } from "@/components/content-area"
import { DEFAULT_PUBLIC_SECTION } from "@/lib/navegacao-plano"
import type { CenarioCompartilhado } from "@/lib/links-compartilhados"

function PlanoPublicoLoader({
  dados,
  meta,
}: {
  dados: PlanoState
  meta: CenarioCompartilhado["meta"]
}) {
  const { loadState } = usePlano()

  useEffect(() => {
    loadState(dados, meta)
  }, [dados, meta, loadState])

  return null
}

function PlanoPublicoShell({ nomeCenario }: { nomeCenario: string | null }) {
  const { state } = usePlano()
  const [activeSection, setActiveSection] = useState(DEFAULT_PUBLIC_SECTION)
  const nomeCliente = String(state.dadosPessoais?.nome ?? "").trim()

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
        style={{ height: "var(--header-height)" }}
      >
        <div className="flex h-full items-center px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Visualização somente leitura
            </p>
            <h1 className="text-base font-semibold text-foreground truncate">
              {nomeCliente || "Plano financeiro"}
              {nomeCenario ? (
                <span className="text-muted-foreground font-normal"> · {nomeCenario}</span>
              ) : null}
            </h1>
          </div>
        </div>
      </header>
      <Sidebar
        variant="public"
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />
      <ContentArea
        activeSection={activeSection}
        onNavigate={setActiveSection}
        readOnly
      />
    </>
  )
}

export function PlanoPublicoPageClient({
  dados,
  meta,
}: {
  dados: PlanoState
  meta: CenarioCompartilhado["meta"]
}) {
  return (
    <PlanoProvider>
      <PlanoPublicoLoader dados={dados} meta={meta} />
      <div className="min-h-screen bg-background">
        <PlanoPublicoShell nomeCenario={meta.nomeCenario} />
      </div>
    </PlanoProvider>
  )
}
