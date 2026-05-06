"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Sidebar } from "@/components/sidebar"
import { ContentArea } from "@/components/content-area"
import { PlanoProvider, usePlano } from "@/lib/plano-context"
import { SalvarSimulacaoModal } from "@/components/simulacoes/salvar-simulacao-modal"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

function ToggleMoeda() {
  const { state, setMoeda } = usePlano()
  const moeda = state.moeda ?? "BRL"

  return (
    <div className="inline-flex rounded-lg bg-[#131929] border border-white/10 p-1">
      {(["BRL", "USD"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMoeda(m)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            moeda === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {m === "BRL" ? "R$" : "US$"}
        </button>
      ))}
    </div>
  )
}

function Breadcrumb() {
  const { state, simulacaoMeta } = usePlano()
  const nome = state.dadosPessoais.nome?.trim()
  if (!simulacaoMeta.clienteId || !simulacaoMeta.nomeCenario || !nome) return null
  return (
    <Link
      href={`/clientes/${simulacaoMeta.clienteId}`}
      className="text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-2 rounded-md bg-[#131929] border border-white/10"
    >
      ← {nome} · {simulacaoMeta.nomeCenario}
    </Link>
  )
}

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
          // Planejamento em branco, mas vinculado ao cliente
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

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("dados-pessoais")

  return (
    <PlanoProvider>
      <div className="min-h-screen bg-background">
        <Suspense fallback={null}>
          <ClienteBootstrap />
        </Suspense>
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
          <ToggleMoeda />
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
