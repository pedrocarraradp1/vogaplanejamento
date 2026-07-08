"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, ArrowRight, Sparkles, Plus, X, Info } from "lucide-react"
import { usePlano } from "@/lib/plano-context"
import { montarSnapshotCliente } from "@/lib/montar-snapshot-cliente"
import type {
  BlocoDiagnostico,
  ItemAcao,
  StatusDiagnostico,
  Prioridade,
  StatusAcao,
  Responsavel,
} from "@/types/diagnostico"

import { VOGA } from "@/lib/voga-tokens"

const STATUS_CORES: Record<StatusDiagnostico, { bg: string; text: string }> = {
  "Saudável": { bg: VOGA.verdeQuadrado, text: VOGA.brasilia },
  "Atenção": { bg: VOGA.amareloExplanada, text: VOGA.petroleo },
  "Crítico": { bg: "#F5E0E0", text: VOGA.alertaTexto },
}
const PRIORIDADE_CORES: Record<Prioridade, string> = {
  Alta: VOGA.alerta,
  Média: VOGA.onda,
  Baixa: VOGA.nota,
}
const AREAS_TOTAIS = 6
const PAINEL_BG = "#F5F5F5"

interface DiagnosticoFinanceiroProps {
  onNavigate: (section: string) => void
}

export function DiagnosticoFinanceiro({ onNavigate }: DiagnosticoFinanceiroProps) {
  const { state } = usePlano()

  const [diagnostico, setDiagnostico] = useState<BlocoDiagnostico[]>([])
  const [planoDeAcao, setPlanoDeAcao] = useState<ItemAcao[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [jaGerou, setJaGerou] = useState(false)

  const snapshot = useMemo(() => montarSnapshotCliente(state), [state])
  const temDados = Object.keys(snapshot).length > 0

  async function gerarDiagnostico() {
    setCarregando(true)
    setErro(null)
    try {
      const res = await fetch("/api/diagnostico", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Falha ao gerar diagnóstico")
      setDiagnostico(data.diagnostico ?? [])
      setPlanoDeAcao(data.planoDeAcao ?? [])
      setJaGerou(true)
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setCarregando(false)
    }
  }

  function atualizarBloco(idx: number, campo: keyof BlocoDiagnostico, valor: string) {
    setDiagnostico((prev) => prev.map((b, i) => (i === idx ? { ...b, [campo]: valor } : b)))
  }

  function atualizarAcao(id: string, campo: keyof ItemAcao, valor: string) {
    setPlanoDeAcao((prev) => prev.map((a) => (a.id === id ? { ...a, [campo]: valor } : a)))
  }

  function removerAcao(id: string) {
    setPlanoDeAcao((prev) => prev.filter((a) => a.id !== id))
  }

  function adicionarAcao() {
    setPlanoDeAcao((prev) => [
      ...prev,
      {
        id: `acao-${Date.now()}`,
        titulo: "Novo item de ação",
        descricao: "",
        origem: "Manual",
        responsavel: "Advisor",
        prazo: "",
        prioridade: "Média",
        status: "A fazer",
      },
    ])
  }

  const areasFaltando = AREAS_TOTAIS - diagnostico.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Planejamento Financeiro</p>
        <h1 className="page-title text-[24px] text-foreground">
          Diagnóstico e <span className="text-primary">plano de ação</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerado com base no cenário calculado do cliente — totalmente editável pelo advisor
        </p>
      </div>

      {/* Diagnóstico */}
      <Card className="form-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
          <CardTitle className="text-base font-medium text-foreground">Diagnóstico</CardTitle>
          <Button onClick={gerarDiagnostico} disabled={carregando || !temDados} className="btn-next">
            <Sparkles className="w-4 h-4 mr-2" />
            {carregando ? "Gerando..." : jaGerou ? "Atualizar diagnóstico" : "Gerar diagnóstico"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {erro && (
            <div
              className="rounded-lg px-4 py-3 text-sm"
              style={{ background: STATUS_CORES["Crítico"].bg, color: STATUS_CORES["Crítico"].text }}
            >
              {erro}
            </div>
          )}

          {!temDados && (
            <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-[rgba(30,92,230,0.08)] px-4 py-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-sm text-foreground">
                Cadastre os dados do cliente (balanço patrimonial, fluxo de caixa, objetivos e
                premissas de aposentadoria) para habilitar a geração do diagnóstico.
              </p>
            </div>
          )}

          {jaGerou && areasFaltando > 0 && (
            <div
              className="rounded-lg px-4 py-3"
              style={{ background: PAINEL_BG }}
            >
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">
                  {diagnostico.length} de {AREAS_TOTAIS} áreas analisadas.
                </strong>{" "}
                {areasFaltando} área(s) ainda não têm dados suficientes cadastrados.
              </p>
            </div>
          )}

          {!jaGerou && !carregando && temDados && (
            <p className="text-sm text-muted-foreground">
              Clique em &quot;Gerar diagnóstico&quot; para criar a primeira análise com base nos
              dados já cadastrados do cliente.
            </p>
          )}

          {diagnostico.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {diagnostico.map((b, i) => {
                const cor = STATUS_CORES[b.status] ?? STATUS_CORES["Atenção"]
                return (
                  <div key={`${b.area}-${i}`} style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <p className="flex-1 text-sm font-medium text-foreground">{b.area}</p>
                      <Select value={b.status} onValueChange={(v) => atualizarBloco(i, "status", v)}>
                        <SelectTrigger
                          className="h-auto w-auto border-none px-2.5 py-1 text-xs font-medium"
                          style={{ background: cor.bg, color: cor.text }}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Saudável">Saudável</SelectItem>
                          <SelectItem value="Atenção">Atenção</SelectItem>
                          <SelectItem value="Crítico">Crítico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      value={b.texto}
                      onChange={(e) => atualizarBloco(i, "texto", e.target.value)}
                      className="min-h-[80px] resize-y border-none bg-transparent p-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
                    />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plano de ação */}
      {jaGerou && (
        <Card className="form-card">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-base font-medium text-foreground">Plano de ação</CardTitle>
            <Button variant="outline" onClick={adicionarAcao} className="border-dashed">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {planoDeAcao.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum item no plano de ação. Adicione manualmente ou gere novamente o diagnóstico.
              </p>
            )}
            {planoDeAcao.map((a) => (
              <div key={a.id} className="rounded-xl border border-border p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <Input
                    value={a.titulo}
                    onChange={(e) => atualizarAcao(a.id, "titulo", e.target.value)}
                    className="flex-1 border-none bg-transparent px-0 text-sm font-medium text-foreground shadow-none focus-visible:ring-0"
                  />
                  <button
                    type="button"
                    onClick={() => removerAcao(a.id)}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Remover item"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Textarea
                  value={a.descricao}
                  onChange={(e) => atualizarAcao(a.id, "descricao", e.target.value)}
                  placeholder="Descrição da ação"
                  className="mb-2 min-h-[44px] resize-y border-none bg-transparent p-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
                />
                <p className="mb-3 text-[11px] text-muted-foreground">Origem: {a.origem}</p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label className="field-label">Responsável</Label>
                    <Select
                      value={a.responsavel}
                      onValueChange={(v) => atualizarAcao(a.id, "responsavel", v as Responsavel)}
                    >
                      <SelectTrigger className="form-card text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cliente">Cliente</SelectItem>
                        <SelectItem value="Advisor">Advisor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="field-label">Prazo</Label>
                    <Input
                      value={a.prazo}
                      onChange={(e) => atualizarAcao(a.id, "prazo", e.target.value)}
                      placeholder="Ex: 30 dias"
                      className="form-card text-foreground focus:border-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="field-label">Prioridade</Label>
                    <Select
                      value={a.prioridade}
                      onValueChange={(v) => atualizarAcao(a.id, "prioridade", v as Prioridade)}
                    >
                      <SelectTrigger
                        className="form-card font-medium"
                        style={{ color: PRIORIDADE_CORES[a.prioridade] }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Alta">Alta</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="field-label">Status</Label>
                    <Select
                      value={a.status}
                      onValueChange={(v) => atualizarAcao(a.id, "status", v as StatusAcao)}
                    >
                      <SelectTrigger className="form-card text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A fazer">A fazer</SelectItem>
                        <SelectItem value="Em andamento">Em andamento</SelectItem>
                        <SelectItem value="Concluído">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <div className="nav-footer">
        <Button variant="ghost" className="btn-back" onClick={() => onNavigate("fluxo-de-caixa")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={() => onNavigate("sucessorio")} className="btn-next">
          Próximo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
