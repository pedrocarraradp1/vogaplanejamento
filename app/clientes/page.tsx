"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Plus, ArrowRight, Users, FileText, TrendingUp } from "lucide-react"

type SimulacaoRow = {
  id: string
  cliente_id: string | null
  nome_simulacao: string | null
  nome_cenario?: string | null
  dados: any
  updated_at: string | null
  created_at: string | null
}

function patrimonioTotalFromDados(dados: any): number {
  const ativos = Array.isArray(dados?.ativos) ? dados.ativos : []
  const passivos = Array.isArray(dados?.passivos) ? dados.passivos : []
  const totalAtivos = ativos.reduce((s: number, a: any) => s + (Number(a?.valor) || 0), 0)
  const totalPassivos = passivos.reduce((s: number, p: any) => s + (Number(p?.valor) || 0), 0)
  return totalAtivos - totalPassivos
}

const fmtFull = (moeda: "BRL" | "USD", v: number) =>
  new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: moeda === "USD" ? "USD" : "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)

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
        // Cenários antigos podem ter cliente_id nulo; vincula ao cadastro existente pelo nome (Dados Pessoais).
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
      <div className="min-h-screen flex items-center justify-center bg-[#080C18] text-muted-foreground text-sm">
        Carregando clientes…
      </div>
    )
  }

  if (error) {
    const isMissingTable =
      error.toLowerCase().includes("simulacoes") &&
      (error.toLowerCase().includes("could not find") || error.toLowerCase().includes("does not exist"))

    return (
      <div className="min-h-screen bg-[#080C18] px-6 py-10">
        <div className="mx-auto max-w-[1200px] space-y-4">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/logo-voga.png" alt="Voga" width={96} height={32} className="h-auto w-auto" />
              <span className="text-sm text-muted-foreground">Clientes</span>
            </div>
            <Link href="/dashboard">
              <Button className="bg-[#1E5CE6] hover:bg-[#1E5CE6]/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cenário
              </Button>
            </Link>
          </header>

          <div className="rounded-xl border border-white/10 bg-[#131929] p-6">
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
    <div className="min-h-screen bg-[#080C18]">
      {/* Header compacto */}
      <header className="h-16 bg-[#080C18] border-b border-white/10">
        <div className="mx-auto max-w-[1200px] h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-voga.png" alt="Voga" width={96} height={32} className="h-8 w-auto" />
            <span className="text-[18px] font-medium text-white">
              Planejamento Financeiro Pessoal
            </span>
          </div>
          <Link href="/dashboard">
            <Button className="bg-[#1E5CE6] hover:bg-[#1E5CE6]/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Novo Cenário
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#131929] border border-white/10 rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total de Clientes</p>
                  <p className="text-3xl font-bold text-foreground">{kpis.totalClientes}</p>
                </div>
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <Users className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#131929] border border-white/10 rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total de Simulações</p>
                  <p className="text-3xl font-bold text-foreground">{kpis.totalSimulacoes}</p>
                </div>
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#131929] border border-white/10 rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Patrimônio Total sob Gestão</p>
                  <p className="text-3xl font-bold text-[#1E5CE6]">{fmtFull("BRL", kpis.patrimonioTotal)}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#1E5CE6]/10 border border-[#1E5CE6]/30">
                  <TrendingUp className="w-5 h-5 text-[#1E5CE6]" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Busca */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente por nome..."
            className="pl-10 bg-[#131929] border-white/10 text-foreground focus:border-[#1E5CE6]"
          />
        </div>

        {/* Lista */}
        {clientesFiltrados.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-[#131929] p-10 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground mt-4">Nenhuma simulação salva ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie uma nova simulação para começar a registrar clientes e planejamento.
            </p>
            <div className="mt-6 flex justify-center">
              <Link href="/dashboard">
                <Button className="bg-[#1E5CE6] hover:bg-[#1E5CE6]/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Cenário
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {clientesFiltrados.map((c) => {
              const created = c.lastDate ? new Date(c.lastDate).toLocaleDateString("pt-BR") : "—"
              const href = c.clienteId ? `/clientes/${c.clienteId}` : (c.simulacaoId ? `/simulacao/${c.simulacaoId}` : "/dashboard")
              return (
                <Link key={c.key} href={href} className="group">
                  <div className="bg-[#131929] border border-white/10 rounded-xl p-5 transition-colors group-hover:border-[#1E5CE6]/60">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">{c.nome}</p>
                        <p className="text-xs text-muted-foreground">{c.profissao}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="text-foreground/80">{c.totalCenarios}</span>{" "}
                          {c.totalCenarios === 1 ? "cenário" : "cenários"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="text-foreground/80">Simulação:</span>{" "}
                          <span className="text-muted-foreground">{c.nomeSimulacao}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="text-foreground/80">Data:</span> {created}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="text-foreground/80">Patrimônio:</span>{" "}
                          <span className="text-[#1E5CE6] font-medium">{fmtFull(c.moeda, c.patrimonio)}</span>
                        </p>
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

