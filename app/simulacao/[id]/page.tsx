"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { PlanoProvider, usePlano } from "@/lib/plano-context"
import { Sidebar } from "@/components/sidebar"
import { ContentArea } from "@/components/content-area"
import { PlanningBreadcrumb, PlanningHeader } from "@/components/planning-header"

function Loader({ simulacaoId }: { simulacaoId: string }) {
  const { loadState } = usePlano()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: auth, error: authErr } = await supabase.auth.getUser()
        if (authErr || !auth?.user) throw new Error("Sessão inválida.")

        const { data, error } = await supabase
          .from("simulacoes")
          .select("id, cliente_id, nome_simulacao, nome_cenario, dados")
          .eq("id", simulacaoId)
          .maybeSingle()
        if (error) throw new Error(error.message)
        if (!data?.dados) throw new Error("Simulação não encontrada.")

        let clienteId: string | null = data.cliente_id ?? null
        if (!clienteId) {
          const nomePlano = String((data.dados as any)?.dadosPessoais?.nome ?? "").trim()
          if (nomePlano) {
            const { data: cli } = await supabase
              .from("clientes")
              .select("id")
              .ilike("nome", nomePlano)
              .limit(1)
              .maybeSingle()
            if (cli?.id) {
              clienteId = cli.id
              await supabase.from("simulacoes").update({ cliente_id: clienteId }).eq("id", simulacaoId)
            }
          }
        }

        if (!cancelled) {
          loadState(data.dados, {
            simulacaoId: data.id,
            clienteId,
            nomeSimulacao: data.nome_simulacao,
            nomeCenario: data.nome_cenario ?? data.nome_simulacao ?? null,
          })
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar.")
      }
    })()
    return () => { cancelled = true }
  }, [simulacaoId, loadState])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive text-sm px-6 pt-16">
        {error}
      </div>
    )
  }

  return null
}

function SimulacaoShell() {
  const [activeSection, setActiveSection] = useState("dados-pessoais")

  return (
    <>
      <PlanningHeader breadcrumb={<PlanningBreadcrumb />} />
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <ContentArea activeSection={activeSection} onNavigate={setActiveSection} />
    </>
  )
}

export default function SimulacaoPage() {
  const params = useParams<{ id: string }>()
  const simulacaoId = String(params?.id ?? "")

  return (
    <PlanoProvider>
      <Loader simulacaoId={simulacaoId} />
      <div className="min-h-screen bg-background">
        <SimulacaoShell />
      </div>
    </PlanoProvider>
  )
}
