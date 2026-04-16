"use client"

import { usePlano } from "@/lib/plano-context"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, ShieldCheck, ShieldX } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
} from "recharts"

interface ProtecaoFinanceiraProps {
  onNavigate: (section: string) => void
}

export function ProtecaoFinanceira({ onNavigate }: ProtecaoFinanceiraProps) {
  const { state, setProtecao, getPatrimonioLiquido } = usePlano()
  const { protecao, premissas } = state

  // ── Formatadores ──────────────────────────────────────────────────────────
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency", currency: "BRL",
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
  const labelClass = "block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2"

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
      <div className="bg-card rounded-xl border border-card-border p-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-6">
          Parâmetros de Proteção
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Custo de Vida Mensal (R$)</label>
            <input
              type="text"
              value={(protecao.custoVida || 0).toLocaleString("pt-BR")}
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
            <label className={labelClass}>Educação dos Filhos (R$)</label>
            <input
              type="text"
              value={(protecao.eduFilhos || 0).toLocaleString("pt-BR")}
              onChange={e => handleCurrencyChange("eduFilhos", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Dívidas Pendentes (R$)</label>
            <input
              type="text"
              value={(protecao.dividasPend || 0).toLocaleString("pt-BR")}
              onChange={e => handleCurrencyChange("dividasPend", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Card 2 — Detalhamento */}
      <div className="bg-card rounded-xl border border-card-border p-6">
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
            <div key={item.label} className="flex justify-between items-center py-2 border-b border-card-border">
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
      <div className="bg-card rounded-xl border border-card-border p-6">
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
                formatter={(value: number) => [formatCurrency(value), "Patrimônio Final"]}
                contentStyle={{ backgroundColor: "#131929", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "8px" }}
                labelStyle={{ color: "#E8EBF2", fontWeight: 600 }}
                itemStyle={{ color: "#ffffff" }}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} formatter={() => "Patrimônio Final"} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Patrimônio Final">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`}
                    fill={index === 0 ? "rgba(34,199,135,0.3)" : entry.value >= 0 ? "#1E5CE6" : "#EF4444"} />
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

      {/* Footer */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => onNavigate("sucessorio")}
          className="border-card-border text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />Voltar
        </Button>
        <Button onClick={() => onNavigate("dashboard")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 text-base font-semibold">
          Gerar Diagnóstico<ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
