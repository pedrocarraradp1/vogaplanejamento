"use client"

import { useMemo, useState } from "react"
import { usePlano, type SeguroItem } from "@/lib/plano-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { InputMoeda } from "@/components/ui/input-moeda"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  ShieldX,
  Info,
  AlertTriangle,
  CheckCircle,
  Pencil,
  Trash2,
  Plus,
  Shield,
} from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts"
import { CHART_TOOLTIP_PROPS } from "@/lib/chart-tooltip"

const TIPOS_SEGURO = [
  "Vida",
  "Invalidez",
  "Prestamista",
  "Patrimonial",
  "Saúde",
  "Outros",
] as const

type FormSeguro = {
  tipoSeguro: string
  capitalSegurado: number
  beneficiario: string
  observacao: string
}

const EMPTY_SEGURO = (): FormSeguro => ({
  tipoSeguro: "Vida",
  capitalSegurado: 0,
  beneficiario: "",
  observacao: "",
})

interface ProtecaoFinanceiraProps {
  onNavigate: (section: string) => void
  readOnly?: boolean
}

function BeneficioFiscalPrevidenciaCard() {
  const { state } = usePlano()
  const moeda = state.moeda ?? "BRL"
  const [rendaBrutaAnual, setRendaBrutaAnual] = useState<number>(0)
  const [aportePGBL, setAportePGBL] = useState<number>(0)

  const fmtFull = (v: number) =>
    new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", { style: "currency", currency: moeda === "USD" ? "USD" : "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

  const calcs = useMemo(() => {
    const renda = Math.max(0, rendaBrutaAnual)
    const aporte = Math.max(0, aportePGBL)
    const aliquota = 0.275

    const limiteDeducao = renda * 0.12
    const aporteEfetivo = Math.min(aporte, limiteDeducao)

    const baseSem = renda
    const irSem = baseSem * aliquota

    const baseCom = Math.max(0, renda - aporteEfetivo)
    const irCom = baseCom * aliquota

    const economia = Math.max(0, irSem - irCom)
    const economiaPctRenda = renda > 0 ? (economia / renda) * 100 : 0

    return {
      renda,
      aporte,
      limiteDeducao,
      aporteEfetivo,
      baseSem,
      irSem,
      baseCom,
      irCom,
      economia,
      economiaPctRenda,
    }
  }, [rendaBrutaAnual, aportePGBL])

  return (
    <Card className="form-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium text-foreground">Calculadora de Benefício Fiscal PGBL</CardTitle>
        <CardDescription>Simule a economia de imposto de renda com investimento em PGBL</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="field-label">RENDA BRUTA ANUAL ({moeda === "USD" ? "US$" : "R$"})</Label>
            <InputMoeda
              value={rendaBrutaAnual}
              onChange={setRendaBrutaAnual}
              moeda={moeda === "USD" ? "USD" : "BRL"}
              placeholder="0,00"
              className="form-card text-foreground focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">Soma de todos os rendimentos tributáveis do ano</p>
          </div>
          <div className="space-y-2">
            <Label className="field-label">APORTE EM PGBL ({moeda === "USD" ? "US$" : "R$"})</Label>
            <InputMoeda
              value={aportePGBL}
              onChange={setAportePGBL}
              moeda={moeda === "USD" ? "USD" : "BRL"}
              placeholder="0,00"
              className="form-card text-foreground focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">Valor investido em PGBL no ano (limite: 12% da renda bruta)</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-[rgba(30,92,230,0.10)] rounded-lg border border-primary/30">
            <Info className="w-4 h-4 text-primary mt-0.5" />
            <div className="text-sm text-foreground">
              Limite de Dedução:{" "}
              <strong className="text-primary">{fmtFull(calcs.limiteDeducao)}</strong>{" "}
              <span className="text-muted-foreground">(12% da renda bruta)</span>
            </div>
          </div>

        <div className="bg-[rgba(16,102,218,0.10)] border border-[#1066DA]/30 rounded-xl p-5">
          <p className="text-xs font-medium text-[#1066DA] uppercase tracking-wide mb-2">ECONOMIA FISCAL ESTIMADA</p>
          <p className="text-3xl font-bold text-[#1066DA]">{fmtFull(calcs.economia)}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Equivalente a {calcs.economiaPctRenda.toFixed(1).replace(".", ",")}% da renda bruta anual
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-secondary p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">SEM PGBL</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Base de Cálculo</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">{fmtFull(calcs.baseSem)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Imposto Devido 27,5%</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">{fmtFull(calcs.irSem)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#1066DA]/30 bg-secondary p-5">
            <p className="text-xs font-semibold text-[#1066DA] uppercase tracking-wide mb-4">COM PGBL</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Base de Cálculo</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">{fmtFull(calcs.baseCom)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Imposto Devido 27,5%</span>
                <span className="text-sm font-semibold text-[#1066DA] tabular-nums">{fmtFull(calcs.irCom)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-secondary p-5">
          <p className="text-sm font-medium text-foreground mb-4">Observações Importantes</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              "Declaração Completa: O benefício fiscal só se aplica para quem faz a declaração completa do IR",
              "Limite de 12%: A dedução é limitada a 12% da renda bruta tributável anual",
              "Economia Imediata: O benefício fiscal representa uma economia real no imposto a pagar",
              "Tributação no Resgate: O valor total resgatado será tributado no futuro (principal + rendimentos)",
              "Tabela Regressiva: Opte pela tabela regressiva para alíquota de 10% após 10 anos",
              "VGBL vs PGBL: VGBL é indicado para quem faz declaração simplificada (sem benefício fiscal)",
              "Planejamento Sucessório: Previdência privada não entra em inventário",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-[#1066DA] mt-0.5 flex-shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground mt-4 italic">
            * Valores calculados com base na alíquota máxima de 27,5%. Consulte seu contador para análise personalizada.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function ProtecaoFinanceira({ onNavigate }: ProtecaoFinanceiraProps) {
  const { state, setProtecao, setSeguros, getPatrimonioLiquido } = usePlano()
  const { protecao, premissas } = state
  const seguros = state.seguros ?? []
  const moeda = state.moeda ?? "BRL"

  const [modalSeguroOpen, setModalSeguroOpen] = useState(false)
  const [editingSeguro, setEditingSeguro] = useState<SeguroItem | null>(null)
  const [formSeguro, setFormSeguro] = useState<FormSeguro>(() => EMPTY_SEGURO())

  const abrirNovoSeguro = () => {
    setEditingSeguro(null)
    setFormSeguro(EMPTY_SEGURO())
    setModalSeguroOpen(true)
  }

  const abrirEditarSeguro = (seguro: SeguroItem) => {
    setEditingSeguro(seguro)
    setFormSeguro({
      tipoSeguro: seguro.tipoSeguro || "Vida",
      capitalSegurado: Number(seguro.capitalSegurado) || 0,
      beneficiario: seguro.beneficiario ?? "",
      observacao: seguro.observacao ?? "",
    })
    setModalSeguroOpen(true)
  }

  const salvarSeguro = () => {
    if (!formSeguro.tipoSeguro.trim()) return
    const payload: SeguroItem = {
      id: editingSeguro?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tipoSeguro: formSeguro.tipoSeguro.trim(),
      capitalSegurado: formSeguro.capitalSegurado,
      beneficiario: formSeguro.beneficiario.trim(),
      observacao: formSeguro.observacao.trim() || undefined,
    }
    setSeguros(
      editingSeguro
        ? seguros.map((s) => (s.id === editingSeguro.id ? payload : s))
        : [...seguros, payload],
    )
    setModalSeguroOpen(false)
  }

  const removerSeguro = (id: string) => {
    if (!window.confirm("Remover este seguro?")) return
    setSeguros(seguros.filter((s) => s.id !== id))
  }

  // ── Formatadores ──────────────────────────────────────────────────────────
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      style: "currency", currency: moeda === "USD" ? "USD" : "BRL",
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value)

  const formatCompact = (value: number) => {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".", ",")}M`
    if (Math.abs(value) >= 1_000)     return `${(value / 1_000).toFixed(0)}K`
    return value.toString()
  }

  const handleNumberChange = (field: keyof typeof protecao, value: string) => {
    setProtecao({ [field]: Number(value) || 0 })
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const patrimonioAtual    = getPatrimonioLiquido()
  const custoVidaTotal     = (protecao.custoVida || 0) * 12 * (protecao.anosCob || 0)
  const necessidadeTotal   = custoVidaTotal + (protecao.eduFilhos || 0) + (protecao.dividasPend || 0)
  const capitalSeguravel   = Math.max(0, necessidadeTotal - patrimonioAtual)
  const rendimentoAnual    = premissas.rendimento / 100

  const patrimonioFinalSemSeguro = patrimonioAtual - necessidadeTotal
  const rendaMensalSemSeguro     = (patrimonioAtual * rendimentoAnual) / 12

  const patrimonioComSeguro  = patrimonioAtual + capitalSeguravel
  const rendaMensalComSeguro = (patrimonioComSeguro * rendimentoAnual) / 12

  const chartData = [
    { name: "Com Seguro",  value: 0 },
    { name: "Sem Seguro",  value: patrimonioFinalSemSeguro },
  ]

  const subtituloGrafico = patrimonioFinalSemSeguro < 0
    ? "Patrimônio insuficiente para cobrir a necessidade sem seguro"
    : "Patrimônio suficiente para cobrir a necessidade sem seguro"

  const inputClass = "w-full px-4 py-3 bg-input border border-input-border rounded-lg text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
  const labelClass = "block field-labelr mb-2"

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <p className="text-primary text-sm font-medium mb-2">— Planejamento</p>
        <h1 className="text-3xl font-extrabold text-foreground">
          Proteção <span className="text-primary">Financeira</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Simulação de capital segurável e comparação de cenários com e sem seguro de vida
        </p>
      </div>

      {/* Card 1 — Parâmetros */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
          Parâmetros de Proteção
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Custo de Vida Mensal ({moeda === "USD" ? "US$" : "R$"})</label>
            <InputMoeda
              value={protecao.custoVida || 0}
              onChange={(custoVida) => setProtecao({ custoVida })}
              moeda={moeda === "USD" ? "USD" : "BRL"}
              className={inputClass}
              placeholder="0,00"
            />
          </div>
          <div>
            <label className={labelClass}>Anos de Cobertura Desejada</label>
            <input
              type="number"
              value={protecao.anosCob || 0}
              onChange={e => handleNumberChange("anosCob", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Educação dos Filhos ({moeda === "USD" ? "US$" : "R$"})</label>
            <InputMoeda
              value={protecao.eduFilhos || 0}
              onChange={(eduFilhos) => setProtecao({ eduFilhos })}
              moeda={moeda === "USD" ? "USD" : "BRL"}
              className={inputClass}
              placeholder="0,00"
            />
          </div>
          <div>
            <label className={labelClass}>Dívidas Pendentes ({moeda === "USD" ? "US$" : "R$"})</label>
            <InputMoeda
              value={protecao.dividasPend || 0}
              onChange={(dividasPend) => setProtecao({ dividasPend })}
              moeda={moeda === "USD" ? "USD" : "BRL"}
              className={inputClass}
              placeholder="0,00"
            />
          </div>
        </div>
      </div>

      {/* Card 2 — Detalhamento */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
          Detalhamento da Necessidade
        </h2>
        <div className="space-y-4">
          {[
            { label: "Custo de Vida Total",   valor: custoVidaTotal,              cor: "" },
            { label: "Educação dos Filhos",    valor: protecao.eduFilhos || 0,     cor: "" },
            { label: "Dívidas Pendentes",      valor: protecao.dividasPend || 0,   cor: "" },
            { label: "Necessidade Total",      valor: necessidadeTotal,            cor: "", bold: true },
            { label: "(-) Patrimônio Atual",   valor: patrimonioAtual,             cor: "text-success" },
          ].map(item => (
            <div key={item.label} className="flex justify-between items-center py-2 border-b border-border">
              <span className={`${item.bold ? "text-foreground font-bold" : "text-muted-foreground"}`}>{item.label}</span>
              <span className={`font-medium ${item.cor || "text-foreground"} ${item.bold ? "font-bold" : ""}`}>
                {formatCurrency(item.valor)}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center py-4 mt-2">
            <span className="text-foreground font-bold text-lg">Capital Segurável</span>
            <span className="text-primary font-bold text-2xl">{formatCurrency(capitalSeguravel)}</span>
          </div>
        </div>
      </div>

      {/* Seguros cadastrados */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Seguros
        </h2>
        {seguros.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum seguro cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {seguros.map((seguro) => (
              <li
                key={seguro.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {seguro.tipoSeguro}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Capital: {formatCurrency(seguro.capitalSegurado)}
                    {seguro.beneficiario ? ` · Beneficiário: ${seguro.beneficiario}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground"
                  onClick={() => abrirEditarSeguro(seguro)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removerSeguro(seguro.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50"
          onClick={abrirNovoSeguro}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar seguro
        </Button>
      </div>

      {/* Card 3 — Comparação */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Comparação de Cenários
        </h2>
        <p className="text-muted-foreground text-sm mb-6">{subtituloGrafico}</p>

        <div className="h-64 mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal vertical={false} />
              <XAxis type="number" tickFormatter={formatCompact}
                stroke="#8E96AC" fontSize={12} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name"
                stroke="#8E96AC" fontSize={12} axisLine={false} tickLine={false} width={100} />
              <Tooltip
                {...CHART_TOOLTIP_PROPS}
                formatter={(value: number) => [formatCurrency(value), "Patrimônio Final"]}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} formatter={() => "Patrimônio Final"} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Patrimônio Final">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`}
                    fill={index === 0 ? "rgba(16,102,218,0.3)" : entry.value >= 0 ? "var(--accent)" : "#B33A3A"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cards Com / Sem Seguro */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-card rounded-xl border-2 border-success/50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-success" />
              <h3 className="text-foreground font-semibold">Com Seguro</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Patrimônio + Indenização</p>
                <p className="text-foreground font-bold text-xl">{formatCurrency(patrimonioComSeguro)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Renda Mensal Disponível</p>
                <p className="text-success font-bold text-lg">{formatCurrency(rendaMensalComSeguro)}</p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border-2 border-destructive/50 p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldX className="w-5 h-5 text-destructive" />
              <h3 className="text-foreground font-semibold">Sem Seguro</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-muted-foreground text-sm mb-1">Patrimônio Disponível</p>
                <p className="text-foreground font-bold text-xl">{formatCurrency(patrimonioAtual)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm mb-1">Renda Mensal Disponível</p>
                <p className="text-destructive font-bold text-lg">{formatCurrency(rendaMensalSemSeguro)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BeneficioFiscalPrevidenciaCard />

      {/* Footer */}
      <div className="nav-footer">
        <Button
          variant="ghost"
          className="btn-back"
          onClick={() => onNavigate("projecao")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={() => onNavigate("simulador-seguros")} className="btn-next">
          Próximo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <Dialog open={modalSeguroOpen} onOpenChange={setModalSeguroOpen}>
        <DialogContent className="max-w-md form-card">
          <DialogHeader>
            <DialogTitle>{editingSeguro ? "Editar seguro" : "Adicionar seguro"}</DialogTitle>
            <DialogDescription>Informe os dados da apólice</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="field-label">Tipo de seguro</Label>
              <Select
                value={formSeguro.tipoSeguro}
                onValueChange={(tipoSeguro) => setFormSeguro((f) => ({ ...f, tipoSeguro }))}
              >
                <SelectTrigger className="form-card text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="form-card">
                  {TIPOS_SEGURO.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="field-label">Capital segurado</Label>
              <InputMoeda
                value={formSeguro.capitalSegurado}
                onChange={(capitalSegurado) => setFormSeguro((f) => ({ ...f, capitalSegurado }))}
                moeda={moeda === "USD" ? "USD" : "BRL"}
                placeholder="0,00"
                className="form-card text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="field-label">Beneficiário</Label>
              <Input
                value={formSeguro.beneficiario}
                onChange={(e) => setFormSeguro((f) => ({ ...f, beneficiario: e.target.value }))}
                placeholder="Nome do beneficiário"
                className="form-card text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="field-label">Observação (opcional)</Label>
              <Textarea
                value={formSeguro.observacao}
                onChange={(e) => setFormSeguro((f) => ({ ...f, observacao: e.target.value }))}
                placeholder="Detalhes opcionais"
                rows={3}
                className="form-card text-foreground min-h-[72px] resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setModalSeguroOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" className="btn-next" onClick={salvarSeguro}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
