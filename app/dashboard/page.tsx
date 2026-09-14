"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Sidebar } from "@/components/sidebar"
import { ContentArea } from "@/components/content-area"
import { PlanoProvider, usePlano } from "@/lib/plano-context"
import { AutosaveProvider, useAutosave } from "@/lib/autosave-context"
import { PlanningBreadcrumb, PlanningHeader } from "@/components/planning-header"
import { DraftRestoreBanner } from "@/components/simulacoes/draft-restore-banner"
import { useAdminSidebarNav } from "@/hooks/use-admin-sidebar-nav"

function ClienteBootstrap() {
  const searchParams = useSearchParams()
  const clienteId = searchParams.get("clienteId")
  const { loadState, setSimulacaoMeta } = usePlano()

  useEffect(() => {
    if (!clienteId) return
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("clientes")
          .select("id, nome, dados")
          .eq("id", clienteId)
          .maybeSingle()
        if (error) throw new Error(error.message)
        if (!data?.id) return

        const dadosCliente = data.dados as { dadosPessoais?: { profissao?: string } } | null | undefined
        const profissaoFromDados = String(dadosCliente?.dadosPessoais?.profissao ?? "").trim()

        if (!cancelled) {
          loadState(
            {
              moeda: "BRL",
              dadosPessoais: { nome: data.nome ?? "", profissao: profissaoFromDados },
              ativos: [],
              passivos: [],
              objetivos: [],
              premissas: {},
              sucessao: {},
              protecao: {},
            } as any,
            { simulacaoId: null, clienteId: data.id, nomeSimulacao: null, nomeCenario: "Cenário Principal" },
          )
          setSimulacaoMeta({ clienteId: data.id, nomeCenario: "Cenário Principal", simulacaoId: null, nomeSimulacao: null })
        }
      } catch {
        // silencioso
      }
    })()
    return () => {
      cancelled = true
    }
  }, [clienteId, loadState, setSimulacaoMeta])

  return null
}

function DashboardShell() {
  const [activeSection, setActiveSection] = useState("dados-pessoais")
  const { isAdmin, onSectionChange } = useAdminSidebarNav(setActiveSection)
  const { draft } = useAutosave()

  return (
    <>
      <PlanningHeader breadcrumb={<PlanningBreadcrumb />} />
      {draft.exists ? (
        <div
          className="relative z-30"
          style={{
            marginLeft: "var(--sidebar-width)",
            paddingTop: "calc(var(--header-height) + 12px)",
            paddingLeft: 48,
            paddingRight: 48,
          }}
        >
          <DraftRestoreBanner
            savedAt={draft.savedAt}
            onRestore={draft.restaurar}
            onDiscard={draft.descartar}
          />
        </div>
      ) : null}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        isAdmin={isAdmin}
      />
      <ContentArea activeSection={activeSection} onNavigate={onSectionChange} />
    </>
  )
}

export default function DashboardPage() {
  return (
    <PlanoProvider>
      <AutosaveProvider enabled>
        <div className="min-h-screen bg-background">
          <Suspense fallback={null}>
            <ClienteBootstrap />
          </Suspense>
          <DashboardShell />
        </div>
      </AutosaveProvider>
    </PlanoProvider>
  )
}
