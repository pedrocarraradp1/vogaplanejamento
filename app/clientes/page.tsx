"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Plus, ArrowRight } from "lucide-react"

type SimulacaoRow = {
  id: string
  cliente_id: string | null
  nome_simulacao: string | null
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

const fmtFull = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

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
          .select("id,cliente_id,nome_simulacao,dados,created_at,updated_at")
          .order("updated_at", { ascending: false })
          .limit(200)
        if (sErr) throw new Error(sErr.message)

        if (!cancelled) {
          setSimulacoes((sRows as any[]) ?? [])
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
      const nome = String(s?.dados?.dadosPessoais?.nome ?? "").trim()
      const key = nome ? nome.toLowerCase() : "(sem-nome)"
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
      return { key, nome, profissao, lastDate, patrimonio, simulacaoId: latest?.id ?? null }
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-destructive text-sm px-6">
        {error}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-10 py-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Image src="/logo-voga.png" alt="Voga" width={140} height={46} className="h-auto w-auto" />
          <div>
            <p className="text-xs text-muted-foreground">Voga Planejamento</p>
            <h1 className="text-lg font-semibold text-foreground">Clientes & Simulações</h1>
          </div>
        </div>
        <Link href="/dashboard">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="w-4 h-4 mr-2" />
            Nova Simulação
          </Button>
        </Link>
      </header>

      <main className="px-10 py-10 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#0D1220] border-[rgba(255,255,255,0.06)]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total de Clientes</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-foreground">{kpis.totalClientes}</p></CardContent>
          </Card>
          <Card className="bg-[#0D1220] border-[rgba(255,255,255,0.06)]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total de Simulações</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-foreground">{kpis.totalSimulacoes}</p></CardContent>
          </Card>
          <Card className="bg-[#0D1220] border-[rgba(255,255,255,0.06)]">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Patrimônio Total sob Gestão</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-primary">{fmtFull(kpis.patrimonioTotal)}</p></CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente por nome..."
              className="pl-10 bg-[#131929] border-white/10 text-foreground focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clientesFiltrados.map((c) => {
            return (
              <Card key={c.key} className="bg-[#0D1220] border-[rgba(255,255,255,0.06)]">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.nome}</p>
                      <p className="text-xs text-muted-foreground">{c.profissao}</p>
                    </div>
                    {c.simulacaoId ? (
                      <Link href={`/simulacao/${c.simulacaoId}`}>
                        <Button variant="outline" size="sm" className="border-white/10 text-muted-foreground hover:text-foreground">
                          Abrir <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sem simulações</span>
                    )}
                  </div>
                  <div className="pt-1 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Última simulação</p>
                      <p className="text-xs text-foreground">{c.lastDate ? new Date(c.lastDate).toLocaleDateString("pt-BR") : "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Patrimônio</p>
                      <p className="text-sm font-semibold text-primary">{fmtFull(c.patrimonio)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}

