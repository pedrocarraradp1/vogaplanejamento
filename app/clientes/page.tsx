"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRight, FileText, Plus, Search, TrendingUp, UserRoundSearch, Users } from "lucide-react"
import { ClientesHeader } from "@/components/clientes/clientes-header"
import { KpiStatCard } from "@/components/clientes/kpi-stat-card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useIsAdmin } from "@/hooks/use-is-admin"
import {
  SEM_ASSESSOR,
  filtrarSimulacoesPorAssessor,
  labelAssessor,
  resolverAdvisorId,
  type AssessorOption,
} from "@/lib/clientes-filtro-assessor"
import { fmtFull, patrimonioTotalFromDados } from "@/lib/clientes-utils"
import { createClient } from "@/lib/supabase"

type ClienteAdvisorEmbed = { advisor_id: string | null } | { advisor_id: string | null }[] | null

type SimulacaoRow = {
  id: string
  cliente_id: string | null
  nome_simulacao: string | null
  nome_cenario?: string | null
  dados: any
  updated_at: string | null
  created_at: string | null
  advisor_id: string | null
  clientes?: ClienteAdvisorEmbed
}

type RpcAssessorRow = {
  advisor_id: string
  nome: string
  email: string | null
  total_clientes: number
  total_simulacoes: number
}

const SELECT_TODOS = "todos"
const SELECT_SIMULACOES =
  "id,cliente_id,nome_simulacao,nome_cenario,dados,created_at,updated_at,advisor_id,clientes:cliente_id(advisor_id)"

function mapAssessorRpc(row: RpcAssessorRow): AssessorOption {
  return {
    advisorId: row.advisor_id,
    nome: row.nome,
    email: row.email,
    totalClientes: Number(row.total_clientes) || 0,
    totalSimulacoes: Number(row.total_simulacoes) || 0,
  }
}

function rpcAusente(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false
  const msg = (err.message ?? "").toLowerCase()
  return (
    err.code === "PGRST202" ||
    err.code === "42883" ||
    msg.includes("admin_listar_assessores")
  )
}

function ClientesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAdmin, loading: adminLoading } = useIsAdmin()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [simulacoes, setSimulacoes] = useState<SimulacaoRow[]>([])
  const [assessores, setAssessores] = useState<AssessorOption[]>([])
  const [filtroDisponivel, setFiltroDisponivel] = useState(false)

  const [q, setQ] = useState("")

  const assessorParam = searchParams.get("assessor")
  const filtroAtivo = Boolean(assessorParam)
  const selectValue =
    assessorParam && assessorParam.length > 0 ? assessorParam : SELECT_TODOS

  const setAssessorNaUrl = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (!value || value === SELECT_TODOS) params.delete("assessor")
      else params.set("assessor", value)
      const qs = params.toString()
      router.replace(qs ? `/clientes?${qs}` : "/clientes")
    },
    [router, searchParams],
  )

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
          .select(SELECT_SIMULACOES)
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

  useEffect(() => {
    if (adminLoading) return
    if (!isAdmin) {
      setAssessores([])
      setFiltroDisponivel(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const supabase = createClient()
      const { data, error: rpcErr } = await supabase.rpc("admin_listar_assessores")
      if (cancelled) return
      if (rpcErr) {
        if (rpcAusente(rpcErr)) {
          console.warn(
            "RPC admin_listar_assessores ainda não existe. Rode a migration 20260914120000_admin_listar_assessores.sql no SQL Editor do Supabase.",
          )
          setFiltroDisponivel(false)
          setAssessores([])
          return
        }
        console.warn("Falha ao listar assessores:", rpcErr.message)
        setFiltroDisponivel(false)
        setAssessores([])
        return
      }
      const mapped = ((data as RpcAssessorRow[] | null) ?? []).map(mapAssessorRpc)
      setAssessores(mapped)
      setFiltroDisponivel(true)
    })()
    return () => {
      cancelled = true
    }
  }, [adminLoading, isAdmin])

  const simulacoesVisiveis = useMemo(
    () => filtrarSimulacoesPorAssessor(simulacoes, filtroAtivo ? assessorParam : null),
    [simulacoes, filtroAtivo, assessorParam],
  )

  const simulacoesPorCliente = useMemo(() => {
    const map = new Map<string, SimulacaoRow[]>()
    for (const s of simulacoesVisiveis) {
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
  }, [simulacoesVisiveis])

  const kpis = useMemo(() => {
    const totalClientes = simulacoesPorCliente.size
    const totalSimulacoes = simulacoesVisiveis.length
    let pl = 0
    for (const [, arr] of simulacoesPorCliente) {
      const latest = arr[0]
      if (latest?.dados) pl += patrimonioTotalFromDados(latest.dados)
    }
    return { totalClientes, totalSimulacoes, patrimonioTotal: pl }
  }, [simulacoesVisiveis, simulacoesPorCliente])

  const nomesPorAdvisorId = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of assessores) map.set(a.advisorId, a.nome)
    return map
  }, [assessores])

  const temSemAssessor = useMemo(
    () => simulacoes.some((row) => resolverAdvisorId(row) === null),
    [simulacoes],
  )

  const assessorSelecionado = useMemo(
    () => assessores.find((a) => a.advisorId === assessorParam) ?? null,
    [assessores, assessorParam],
  )

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
      const advisorId = resolverAdvisorId(latest)
      const assessorNome = advisorId ? (nomesPorAdvisorId.get(advisorId) ?? "Sem assessor") : "Sem assessor"
      return {
        key,
        nome,
        profissao,
        nomeSimulacao,
        lastDate,
        patrimonio,
        simulacaoId: latest?.id ?? null,
        clienteId,
        totalCenarios,
        moeda,
        assessorNome,
      }
    })
    const filtered = term ? entries.filter((e) => e.nome.toLowerCase().includes(term)) : entries
    filtered.sort((a, b) => String(b.lastDate ?? "").localeCompare(String(a.lastDate ?? "")))
    return filtered
  }, [simulacoesPorCliente, q, nomesPorAdvisorId])

  const mostrarNomeAssessorNoCard = isAdmin && !filtroAtivo
  const mostrarFiltro = isAdmin && filtroDisponivel
  const filtroVazio = filtroAtivo && clientesFiltrados.length === 0

  const rotuloAssessorAtivo =
    assessorParam === SEM_ASSESSOR
      ? "Sem assessor vinculado"
      : assessorSelecionado?.nome ?? "este assessor"

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
        <ClientesHeader novoCenarioHref="/dashboard" showAdmin={isAdmin} />
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
      <ClientesHeader novoCenarioHref="/dashboard" showAdmin={isAdmin} />

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

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
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
            {mostrarFiltro ? (
              <div className="relative">
                <UserRoundSearch className="w-4 h-4 text-[var(--text-label)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10" />
                <Select
                  value={selectValue}
                  onValueChange={setAssessorNaUrl}
                >
                  <SelectTrigger aria-label="Assessor" className="clientes-filtro-assessor">
                    <SelectValue placeholder="Todos os assessores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_TODOS}>Todos os assessores</SelectItem>
                    {assessores.map((opt) => (
                      <SelectItem key={opt.advisorId} value={opt.advisorId}>
                        {labelAssessor(opt)}
                      </SelectItem>
                    ))}
                    {temSemAssessor ? (
                      <SelectItem value={SEM_ASSESSOR}>Sem assessor vinculado</SelectItem>
                    ) : null}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          {mostrarFiltro && filtroAtivo ? (
            <p className="text-xs text-muted-foreground">
              Exibindo clientes de {rotuloAssessorAtivo} · {kpis.totalClientes}{" "}
              {kpis.totalClientes === 1 ? "cliente" : "clientes"} · {kpis.totalSimulacoes}{" "}
              {kpis.totalSimulacoes === 1 ? "simulação" : "simulações"}
              {" · "}
              <button
                type="button"
                className="underline underline-offset-2 hover:text-foreground"
                onClick={() => setAssessorNaUrl(SELECT_TODOS)}
              >
                Limpar filtro
              </button>
            </p>
          ) : null}
        </div>

        {clientesFiltrados.length === 0 ? (
          <div className="clientes-empty gap-4 p-8">
            <p className="text-sm text-[var(--text-label)]">
              {filtroVazio
                ? "Nenhum cliente encontrado para este assessor"
                : "Nenhuma simulação salva ainda"}
            </p>
            {filtroVazio ? (
              <button
                type="button"
                className="btn-header-primary"
                onClick={() => setAssessorNaUrl(SELECT_TODOS)}
              >
                Limpar filtro
              </button>
            ) : (
              <Link href="/dashboard" className="btn-header-primary">
                <Plus className="w-4 h-4" />
                Novo Cenário
              </Link>
            )}
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
                        {mostrarNomeAssessorNoCard ? (
                          <p className="text-xs text-muted-foreground">{c.assessorNome}</p>
                        ) : null}
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

export default function ClientesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
          Carregando clientes…
        </div>
      }
    >
      <ClientesPageContent />
    </Suspense>
  )
}
