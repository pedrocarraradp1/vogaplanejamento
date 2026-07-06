"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { Search, Plus, ArrowRight, Users, FileText, TrendingUp } from "lucide-react"
import { ClientesHeader } from "@/components/clientes/clientes-header"
import { KpiStatCard } from "@/components/clientes/kpi-stat-card"
import { fmtFull, patrimonioTotalFromDados } from "@/lib/clientes-utils"

type SimulacaoRow = {
  id: string
  cliente_id: string | null
  nome_simulacao: string | null
  nome_cenario?: string | null
  dados: any
  updated_at: string | null
  created_at: string | null
}

export default function ClientesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [simulacoes, setSimulacoes] = useState<SimulacaoRow[]>([])

  const [q, setQ] = useState("")

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: auth, error: authErr } = await supabase.auth.getUser()
        if (authErr || !auth?.user) {
          if (!cancelled) setError("Sessão inválida.")
          return
        }

        const { data: sRows, error: sErr } = await supabase
          .from("simulacoes")
          .select("id,cliente_id,nome_simulacao,nome_cenario,dados,created_at,updated_at")
          .order("updated_at", { ascending: false })
          .limit(200)
        if (sErr) throw new Error(sErr.message)

        const rows = ((sRows as SimulacaoRow[]) ?? []).map((r) => ({ ...r }))
        for (const r of rows) {
          if (r.cliente_id) continue
          const nomePlano = String(r?.dados?.dadosPessoais?.nome ?? "").trim()
          if (!nomePlano) continue
          const { data: existing, error: findErr } = await supabase
            .from("clientes")
            .select("id")
            .ilike("nome", nomePlano)
            .limit(1)
            .maybeSingle()
          if (findErr || !existing?.id) continue
          const { error: upErr } = await supabase
            .from("simulacoes")
            .update({ cliente_id: existing.id })
            .eq("id", r.id)
          if (!upErr) r.cliente_id = existing.id
        }

        if (!cancelled) {
          setSimulacoes(rows)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const simulacoesPorCliente = useMemo(() => {
    const map = new Map<string, SimulacaoRow[]>()
    for (const s of simulacoes) {
      const cid = String(s?.cliente_id ?? "").trim()
      const fallbackNome = String(s?.dados?.dadosPessoais?.nome ?? "").trim().toLowerCase() || "(sem-nome)"
      const key = cid || `name:${fallbackNome}`
      const arr = map.get(key) ?? []
      arr.push(s)
      map.set(key, arr)
    }
    for (const [, arr] of map) {
      arr.sort((a, b) => (b.updated_at ?? b.created_at ?? "").localeCompare(a.updated_at ?? a.created_at ?? ""))
    }
    return map
  }, [simulacoes])

  const kpis = useMemo(() => {
    const totalClientes = simulacoesPorCliente.size
    const totalSimulacoes = simulacoes.length
    let pl = 0
    for (const [, arr] of simulacoesPorCliente) {
      const latest = arr[0]
      if (latest?.dados) pl += patrimonioTotalFromDados(latest.dados)
    }
    return { totalClientes, totalSimulacoes, patrimonioTotal: pl }
  }, [simulacoes, simulacoesPorCliente])

  const clientesFiltrados = useMemo(() => {
    const term = q.trim().toLowerCase()
    const entries = Array.from(simulacoesPorCliente.entries()).map(([key, arr]) => {
      const latest = arr[0]
      const nome = String(latest?.dados?.dadosPessoais?.nome ?? "Sem nome")
      const profissao = String(latest?.dados?.dadosPessoais?.profissao ?? "—")
      const lastDate = latest?.updated_at ?? latest?.created_at ?? null
      const patrimonio = latest?.dados ? patrimonioTotalFromDados(latest.dados) : 0
      const nomeSimulacao = String(latest?.nome_simulacao ?? "—")
      const clienteId = latest?.cliente_id ?? null
      const totalCenarios = arr.length
      const moeda = (latest?.dados?.moeda === "USD" ? "USD" : "BRL") as "BRL" | "USD"
      return { key, nome, profissao, nomeSimulacao, lastDate, patrimonio, simulacaoId: latest?.id ?? null, clienteId, totalCenarios, moeda }
    })
    const filtered = term ? entries.filter((e) => e.nome.toLowerCase().includes(term)) : entries
    filtered.sort((a, b) => String(b.lastDate ?? "").localeCompare(String(a.lastDate ?? "")))
    return filtered
  }, [simulacoesPorCliente, q])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Carregando clientes…
      </div>
    )
  }

  if (error) {
    const isMissingTable =
      error.toLowerCase().includes("simulacoes") &&
      (error.toLowerCase().includes("could not find") || error.toLowerCase().includes("does not exist"))

    return (
      <div className="min-h-screen bg-background">
        <ClientesHeader novoCenarioHref="/dashboard" />
        <div style={{ padding: "40px 48px" }}>
          <div className="form-card">
            <p className="text-sm font-semibold text-destructive">Não foi possível carregar as simulações</p>
            <p className="text-sm text-muted-foreground mt-2">
              {isMissingTable
                ? "A tabela `public.simulacoes` ainda não existe no Supabase. Rode a migration e recarregue a página."
                : error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <ClientesHeader novoCenarioHref="/dashboard" />

      <div style={{ padding: "40px 48px" }} className="space-y-6">
        <h1 className="clientes-title">
          <span className="text-[var(--text-primary)]">Planejamento</span>
          <span className="text-[var(--accent)]"> Financeiro Pessoal</span>
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <KpiStatCard label="Total de Clientes" value={kpis.totalClientes} icon={Users} />
          <KpiStatCard label="Total de Simulações" value={kpis.totalSimulacoes} icon={FileText} />
          <KpiStatCard
            label="Patrimônio Total sob Gestão"
            value={fmtFull("BRL", kpis.patrimonioTotal)}
            icon={TrendingUp}
            iconVariant="accent"
          />
        </div>

        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-[var(--text-label)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente por nome..."
            className="clientes-search"
          />
        </div>

        {clientesFiltrados.length === 0 ? (
          <div className="clientes-empty gap-4 p-8">
            <p className="text-sm text-[var(--text-label)]">Nenhuma simulação salva ainda</p>
            <Link href="/dashboard" className="btn-header-primary">
              <Plus className="w-4 h-4" />
              Novo Cenário
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clientesFiltrados.map((c) => {
              const created = c.lastDate ? new Date(c.lastDate).toLocaleDateString("pt-BR") : "—"
              const href = c.clienteId ? `/clientes/${c.clienteId}` : (c.simulacaoId ? `/simulacao/${c.simulacaoId}` : "/dashboard")
              return (
                <Link key={c.key} href={href} className="group">
                  <div className="kpi-card transition-colors group-hover:border-[var(--accent)]/40">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.profissao}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {c.totalCenarios} {c.totalCenarios === 1 ? "cenário" : "cenários"}
                        </p>
                        <p className="text-xs text-muted-foreground">{c.nomeSimulacao}</p>
                        <p className="text-xs text-muted-foreground">{created}</p>
                        <p className="text-xs text-[var(--accent)] font-medium">{fmtFull(c.moeda, c.patrimonio)}</p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
