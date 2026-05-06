"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { createClient } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Copy, ArrowRight, Plus, Layers } from "lucide-react"

type ClienteRow = {
  id: string
  nome: string | null
  profissao: string | null
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

function patrimonioTotalFromDados(dados: any): number {
  const ativos = Array.isArray(dados?.ativos) ? dados.ativos : []
  const passivos = Array.isArray(dados?.passivos) ? dados.passivos : []
  const totalAtivos = ativos.reduce((s: number, a: any) => s + (Number(a?.valor) || 0), 0)
  const totalPassivos = passivos.reduce((s: number, p: any) => s + (Number(p?.valor) || 0), 0)
  return totalAtivos - totalPassivos
}

function patrimonioProjetadoFromDados(dados: any): number {
  const k = dados?.kpis?.patrimonioApos
  if (typeof k === "number") return k
  const proj = Array.isArray(dados?.projecao) ? dados.projecao : []
  const last = proj.length ? proj[proj.length - 1] : null
  const v = last?.saldoNominal
  return typeof v === "number" ? v : 0
}

function fmtFull(moeda: "BRL" | "USD", v: number) {
  return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: moeda === "USD" ? "USD" : "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
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
          supabase.from("clientes").select("id,nome,profissao").eq("id", clienteId).maybeSingle(),
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
    const lastDate = last?.updated_at ?? last?.created_at ?? null
    const moeda = (last?.dados?.moeda === "USD" ? "USD" : "BRL") as "BRL" | "USD"
    const patrimonio = last?.dados ? patrimonioProjetadoFromDados(last.dados) : 0
    return { totalCenarios, lastDate, moeda, patrimonio }
  }, [cenarios])

  async function duplicarCenario(row: SimulacaoRow) {
    const supabase = createClient()
    const nomeBase = (row.nome_cenario ?? row.nome_simulacao ?? "Cenário").trim()
    const nomeNovo = `Cópia de ${nomeBase}`
    const { error } = await supabase.from("simulacoes").insert({
      cliente_id: clienteId,
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
    const nomeBase = (row.nome_cenario ?? row.nome_simulacao ?? "Cenário").trim()
    if (!confirm(`Excluir o cenário “${nomeBase}”? Essa ação não pode ser desfeita.`)) return
    const supabase = createClient()
    const { error } = await supabase.from("simulacoes").delete().eq("id", row.id)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080C18] text-muted-foreground text-sm">
        Carregando cliente…
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080C18] text-destructive text-sm px-6">
        {error}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080C18]">
      <header className="h-16 bg-[#080C18] border-b border-white/10">
        <div className="mx-auto max-w-[1200px] h-full px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-voga.png" alt="Voga" width={96} height={32} className="h-8 w-auto" />
            <span className="text-[18px] font-medium text-white">Cliente</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/clientes">
              <Button variant="outline" className="h-9 border-white/10 bg-[#131929] text-muted-foreground hover:text-foreground hover:bg-white/5">
                ← Voltar
              </Button>
            </Link>
            <Link href={`/dashboard?clienteId=${clienteId}`}>
              <Button className="h-9 bg-[#1E5CE6] hover:bg-[#1E5CE6]/90 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Novo Cenário
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-6 py-6 space-y-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Cliente</p>
          <h1 className="text-2xl font-semibold text-foreground">
            {cliente?.nome || "Sem nome"}{" "}
            <span className="text-muted-foreground font-normal text-base">
              · {cliente?.profissao || "—"}
            </span>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-[#131929] border border-white/10 rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total de Cenários</p>
                  <p className="text-3xl font-bold text-foreground">{kpis.totalCenarios}</p>
                </div>
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <Layers className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#131929] border border-white/10 rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Patrimônio (último cenário)</p>
                  <p className="text-3xl font-bold text-[#1E5CE6]">{fmtFull(kpis.moeda, kpis.patrimonio)}</p>
                </div>
                <div className="p-2 rounded-lg bg-[#1E5CE6]/10 border border-[#1E5CE6]/30">
                  <ArrowRight className="w-5 h-5 text-[#1E5CE6]" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#131929] border border-white/10 rounded-xl">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Última atualização</p>
                  <p className="text-3xl font-bold text-foreground">
                    {kpis.lastDate ? new Date(kpis.lastDate).toLocaleDateString("pt-BR") : "—"}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <ArrowRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-[#131929] border border-white/10 rounded-xl">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-foreground">Cenários</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cenarios.map((s) => {
              const nome = (s.nome_cenario ?? s.nome_simulacao ?? "Cenário Principal").trim()
              const created = s.created_at ? new Date(s.created_at).toLocaleDateString("pt-BR") : "—"
              const moeda = (s?.dados?.moeda === "USD" ? "USD" : "BRL") as "BRL" | "USD"
              const patrimonioTotal = s.dados ? patrimonioTotalFromDados(s.dados) : null
              const patrimonio = patrimonioProjetadoFromDados(s.dados)
              return (
                <div key={s.id} className="bg-[#0D1220] border border-white/10 rounded-xl p-5">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{nome}</p>
                    <p className="text-xs text-muted-foreground">Criado em {created}</p>
                    {typeof patrimonioTotal === "number" && (
                      <p className="text-xs text-muted-foreground mt-2">
                        <span className="text-foreground/80">Patrimônio total:</span>{" "}
                        <span className="text-[#1E5CE6] font-medium">{fmtFull(moeda, patrimonioTotal)}</span>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="text-foreground/80">Patrimônio projetado:</span>{" "}
                      <span className="text-[#1E5CE6] font-medium">{fmtFull(moeda, patrimonio)}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                    <Link href={`/simulacao/${s.id}`} className="flex-1">
                      <Button className="w-full bg-[#1E5CE6] hover:bg-[#1E5CE6]/90 text-white">
                        Abrir
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      onClick={() => duplicarCenario(s)}
                      className="h-10 w-10 p-0 border-white/10 bg-[#131929] text-muted-foreground hover:text-foreground hover:bg-white/5"
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => excluirCenario(s)}
                      className="h-10 w-10 p-0 border-white/10 bg-[#131929] text-muted-foreground hover:text-destructive hover:bg-white/5"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )
            })}

            {cenarios.length === 0 && (
              <div className="col-span-full rounded-xl border border-white/10 bg-[#0D1220] p-10 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground mt-4">Nenhum cenário salvo</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Crie um novo cenário para começar o planejamento deste cliente.
                </p>
                <div className="mt-6 flex justify-center">
                  <Link href={`/dashboard?clienteId=${clienteId}`}>
                    <Button className="bg-[#1E5CE6] hover:bg-[#1E5CE6]/90 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Novo Cenário
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

