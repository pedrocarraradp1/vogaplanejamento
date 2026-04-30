"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { PlanoProvider, usePlano } from "@/lib/plano-context"
import { Sidebar } from "@/components/sidebar"
import { ContentArea } from "@/components/content-area"
import { SalvarSimulacaoModal } from "@/components/simulacoes/salvar-simulacao-modal"

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
          .select("id, cliente_id, nome_simulacao, dados")
          .eq("id", simulacaoId)
          .maybeSingle()
        if (error) throw new Error(error.message)
        if (!data?.dados) throw new Error("Simulação não encontrada.")

        if (!cancelled) {
          loadState(data.dados, {
            simulacaoId: data.id,
            clienteId: data.cliente_id,
            nomeSimulacao: data.nome_simulacao,
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
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive text-sm px-6">
        {error}
      </div>
    )
  }

  return null
}

export default function SimulacaoPage() {
  const params = useParams<{ id: string }>()
  const simulacaoId = String(params?.id ?? "")
  const [activeSection, setActiveSection] = useState("dados-pessoais")

  return (
    <PlanoProvider>
      <Loader simulacaoId={simulacaoId} />
      <div className="min-h-screen bg-background">
        <div className="fixed top-6 right-[200px] z-50">
          <SalvarSimulacaoModal />
        </div>
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <ContentArea activeSection={activeSection} onNavigate={setActiveSection} />
      </div>
    </PlanoProvider>
  )
}

