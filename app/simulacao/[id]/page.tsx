"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { PlanoProvider, usePlano } from "@/lib/plano-context"
import { Sidebar } from "@/components/sidebar"
import { ContentArea } from "@/components/content-area"
import { SalvarSimulacaoModal } from "@/components/simulacoes/salvar-simulacao-modal"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

function Breadcrumb() {
  const { simulacaoMeta, state } = usePlano()
  if (!simulacaoMeta.clienteId || !simulacaoMeta.nomeCenario) return null
  const nome = state.dadosPessoais.nome?.trim() || "Cliente"
  return (
    <Link
      href={`/clientes/${simulacaoMeta.clienteId}`}
      className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-md bg-[#131929] border border-white/10"
    >
      ← {nome} · {simulacaoMeta.nomeCenario}
    </Link>
  )
}

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
          <Breadcrumb />
          <SalvarSimulacaoModal />
        </div>
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <ContentArea activeSection={activeSection} onNavigate={setActiveSection} />
      </div>
    </PlanoProvider>
  )
}

