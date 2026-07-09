"use client"

import { useEffect } from "react"
import { PlanoProvider, usePlano, type PlanoState } from "@/lib/plano-context"
import { PlanoFinanceiroCompleto } from "@/components/sections/plano-financeiro-completo"
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

function PlanoPublicoConteudo({ nomeCenario }: { nomeCenario: string | null }) {
  const { state } = usePlano()
  const nomeCliente = String(state.dadosPessoais?.nome ?? "").trim()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Visualização somente leitura
          </p>
          <h1 className="text-lg font-semibold text-foreground mt-1">
            {nomeCliente || "Plano financeiro"}
            {nomeCenario ? (
              <span className="text-muted-foreground font-normal"> · {nomeCenario}</span>
            ) : null}
          </h1>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <PlanoFinanceiroCompleto onNavigate={() => {}} readOnly />
      </main>
    </div>
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
      <PlanoPublicoConteudo nomeCenario={meta.nomeCenario} />
    </PlanoProvider>
  )
}
