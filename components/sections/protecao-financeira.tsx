"use client"

import { useMemo, useState } from "react"
import { usePlano } from "@/lib/plano-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, ShieldCheck, ShieldX, Info, AlertTriangle, CheckCircle } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts"
import { CHART_TOOLTIP_PROPS } from "@/lib/chart-tooltip"

interface ProtecaoFinanceiraProps {
  onNavigate: (section: string) => void
}

function BeneficioFiscalPrevidenciaCard() {
  const { state } = usePlano()
  const moeda = state.moeda ?? "BRL"
  const [rendaBrutaAnual, setRendaBrutaAnual] = useState<number>(0)
  const [aportePGBL, setAportePGBL] = useState<number>(0)

  const parseCurrency = (value: string) => parseInt(value.replace(/\D/g, ""), 10) || 0
  const formatCurrency = (value: number) => {
    if (!value) return ""
    return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR").format(value)
  }
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
            <Input
              value={formatCurrency(rendaBrutaAnual)}
              onChange={(e) => setRendaBrutaAnual(parseCurrency(e.target.value))}
              placeholder="0"
              className="form-card text-foreground focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">Soma de todos os rendimentos tributáveis do ano</p>
          </div>
          <div className="space-y-2">
            <Label className="field-label">APORTE EM PGBL ({moeda === "USD" ? "US$" : "R$"})</Label>
            <Input
              value={formatCurrency(aportePGBL)}
              onChange={(e) => setAportePGBL(parseCurrency(e.target.value))}
              placeholder="0"
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

        <div className="bg-[rgba(34,199,135,0.10)] border border-[#22C787]/30 rounded-xl p-5">
          <p className="text-xs font-medium text-[#22C787] uppercase tracking-wide mb-2">ECONOMIA FISCAL ESTIMADA</p>
          <p className="text-3xl font-bold text-[#22C787]">{fmtFull(calcs.economia)}</p>
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

          <div className="rounded-xl border border-[#22C787]/30 bg-secondary p-5">
            <p className="text-xs font-semibold text-[#22C787] uppercase tracking-wide mb-4">COM PGBL</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Base de Cálculo</span>
                <span className="text-sm font-semibold text-foreground tabular-nums">{fmtFull(calcs.baseCom)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Imposto Devido 27,5%</span>
                <span className="text-sm font-semibold text-[#22C787] tabular-nums">{fmtFull(calcs.irCom)}</span>
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
                <CheckCircle className="w-4 h-4 text-[#22C787] mt-0.5 flex-shrink-0" />
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
  const { state, setProtecao, getPatrimonioLiquido } = usePlano()
  const { protecao, premissas } = state
  const moeda = state.moeda ?? "BRL"

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

  const parseCurrency = (value: string) => Number(value.replace(/\D/g, "")) || 0

  const handleCurrencyChange = (field: keyof typeof protecao, value: string) => {
    setProtecao({ [field]: parseCurrency(value) })
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
            <input
              type="text"
              value={(protecao.custoVida || 0).toLocaleString(moeda === "USD" ? "en-US" : "pt-BR")}
              onChange={e => handleCurrencyChange("custoVida", e.target.value)}
              className={inputClass}
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
            <input
              type="text"
              value={(protecao.eduFilhos || 0).toLocaleString(moeda === "USD" ? "en-US" : "pt-BR")}
              onChange={e => handleCurrencyChange("eduFilhos", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dívidas Pendentes ({moeda === "USD" ? "US$" : "R$"})</label>
            <input
              type="text"
              value={(protecao.dividasPend || 0).toLocaleString(moeda === "USD" ? "en-US" : "pt-BR")}
              onChange={e => handleCurrencyChange("dividasPend", e.target.value)}
              className={inputClass}
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

      {/* Card 3 — Comparação */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Comparação de Cenários
        </h2>
        <p className="text-muted-foreground text-sm mb-6">{subtituloGrafico}</p>

        <div className="h-64 mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal vertical={false} />
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
                    fill={index === 0 ? "rgba(34,199,135,0.3)" : entry.value >= 0 ? "var(--accent)" : "#EF4444"} />
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
    </div>
  )
}
