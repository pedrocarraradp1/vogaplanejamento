"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { FileText, Plus, Users, TrendingUp } from "lucide-react"
import { ClientesHeader } from "@/components/clientes/clientes-header"
import { KpiStatCard } from "@/components/clientes/kpi-stat-card"
import { CenarioCard } from "@/components/clientes/cenario-card"
import {
  fmtFull,
  moedaFromDados,
  patrimonioProjetadoFromDados,
} from "@/lib/clientes-utils"

type ClienteRow = {
  id: string
  nome: string | null
}

type SimulacaoRow = {
  id: string
  cliente_id: string | null
  nome_cenario: string | null
  nome_simulacao: string | null
  dados: any
  created_at: string | null
  updated_at: string | null
}

export default function ClienteDetailPage() {
  const params = useParams<{ id: string }>()
  const clienteId = String(params?.id ?? "")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cliente, setCliente] = useState<ClienteRow | null>(null)
  const [cenarios, setCenarios] = useState<SimulacaoRow[]>([])

  async function refresh() {
    const supabase = createClient()
    const { data: s, error: sErr } = await supabase
      .from("simulacoes")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("created_at", { ascending: false })
    if (sErr) throw new Error(sErr.message)
    setCenarios(((s as any[]) ?? []) as SimulacaoRow[])
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: auth, error: authErr } = await supabase.auth.getUser()
        if (authErr || !auth?.user) throw new Error("Sessão inválida.")

        const [{ data: c, error: cErr }, { data: s, error: sErr }] = await Promise.all([
          supabase.from("clientes").select("id,nome").eq("id", clienteId).maybeSingle(),
          supabase
            .from("simulacoes")
            .select("*")
            .eq("cliente_id", clienteId)
            .order("created_at", { ascending: false }),
        ])
        if (cErr) throw new Error(cErr.message)
        if (sErr) throw new Error(sErr.message)

        if (!cancelled) {
          setCliente((c as any) ?? null)
          setCenarios(((s as any[]) ?? []) as SimulacaoRow[])
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [clienteId])

  const kpis = useMemo(() => {
    const totalCenarios = cenarios.length
    const last = cenarios[0]
    const moeda = moedaFromDados(last?.dados)
    const patrimonio = last?.dados ? patrimonioProjetadoFromDados(last.dados) : 0
    return { totalCenarios, moeda, patrimonio }
  }, [cenarios])

  async function duplicarCenario(row: SimulacaoRow) {
    const supabase = createClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      alert("Sessão inválida.")
      return
    }
    const nomeBase = (row.nome_cenario ?? row.nome_simulacao ?? "Cenário").trim()
    const nomeNovo = `Cópia de ${nomeBase}`
    const { error } = await supabase.from("simulacoes").insert({
      cliente_id: clienteId,
      advisor_id: user.id,
      nome_simulacao: nomeNovo,
      nome_cenario: nomeNovo,
      dados: row.dados ?? {},
    } as any)
    if (error) {
      alert(error.message)
      return
    }
    try {
      await refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erro ao recarregar cenários.")
    }
  }

  async function excluirCenario(row: SimulacaoRow) {
    if (!confirm("Tem certeza?")) return
    const supabase = createClient()
    const { error } = await supabase.from("simulacoes").delete().eq("id", row.id)
    if (error) {
      alert(error.message)
      return
    }
    setCenarios((prev) => prev.filter((c) => c.id !== row.id))
  }

  const novoCenarioHref = `/dashboard?clienteId=${clienteId}`

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080C18] text-muted-foreground text-sm">
        Carregando cliente…
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#080C18]">
        <ClientesHeader voltarHref="/clientes" novoCenarioHref={novoCenarioHref} />
        <div className="mx-auto max-w-[1200px] px-6 py-10 text-destructive text-sm">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080C18]">
      <ClientesHeader voltarHref="/clientes" novoCenarioHref={novoCenarioHref} />

      <div className="mx-auto max-w-[1200px] px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiStatCard
            label="Nome do cliente"
            value={cliente?.nome?.trim() || "—"}
            icon={Users}
          />
          <KpiStatCard label="Total de cenários" value={kpis.totalCenarios} icon={FileText} />
          <KpiStatCard
            label="Patrimônio do último cenário"
            value={fmtFull(kpis.moeda, kpis.patrimonio)}
            icon={TrendingUp}
            iconVariant="accent"
          />
        </div>

        {cenarios.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#131929] p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mt-4">Nenhum cenário salvo</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie um novo cenário para começar o planejamento deste cliente.
            </p>
            <div className="mt-6 flex justify-center">
              <Link href={novoCenarioHref}>
                <Button className="bg-[#1E5CE6] hover:bg-[#1E5CE6]/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Cenário
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cenarios.map((s) => {
              const nome = (s.nome_cenario ?? s.nome_simulacao ?? "Cenário Principal").trim()
              const created = s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : "—"
              const moeda = moedaFromDados(s.dados)
              const proj = patrimonioProjetadoFromDados(s.dados)
              return (
                <CenarioCard
                  key={s.id}
                  nomeCenario={nome}
                  sublinha={`Criado em ${created}`}
                  patrimonioProjetadoLabel={fmtFull(moeda, proj)}
                  abrirHref={`/simulacao/${s.id}`}
                  onDuplicar={(e) => {
                    e.preventDefault()
                    void duplicarCenario(s)
                  }}
                  onExcluir={(e) => {
                    e.preventDefault()
                    void excluirCenario(s)
                  }}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
