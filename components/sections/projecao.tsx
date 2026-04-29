"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, TrendingUp, DollarSign, Clock, Info } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts"
import { usePlano } from "@/lib/plano-context"
import { calcularProjecao, calcularKPIs, type ProjecaoAno } from "@/lib/engine"
import { CenariosInvestimento } from "@/components/ui/cenarios-investimento"

interface ProjecaoProps {
  onNavigate: (section: string) => void
}

export function Projecao({ onNavigate }: ProjecaoProps) {
  const { state, setPremissas } = usePlano()
  const { premissas, objetivos, dadosPessoais, ativos, passivos } = state

  // ── Derivados automáticos ────────────────────────────────────────────────
  // Padronização pedida: patrimônio líquido total = (ativos líquidos + imobilizado + participações + outros) − passivos
  const saldoInicialCalculado = useMemo(() => {
    const totalAtivos = (ativos ?? []).reduce((s, a) => s + (Number(a.valor) || 0), 0)
    const totalPassivos = (passivos ?? []).reduce((s, p) => s + (Number(p.valor) || 0), 0)
    return totalAtivos - totalPassivos
  }, [ativos, passivos])

  const idadeAtualCalculada = useMemo(() => {
    if (!dadosPessoais.nascimento) return 0
    const hoje       = new Date()
    const nascimento = new Date(dadosPessoais.nascimento)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const m   = hoje.getMonth() - nascimento.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--
    return Math.max(0, idade)
  }, [dadosPessoais.nascimento])

  const aporteMensal = Math.max(0, dadosPessoais.renda - dadosPessoais.despesa)

  // Premissas completas — junta os campos editáveis com os derivados
  const premissasCompletas = useMemo(() => ({
    ...premissas,
    saldoInicial: saldoInicialCalculado,
    aporteM:      aporteMensal,
    idadeAtual:   idadeAtualCalculada,
  }), [premissas, saldoInicialCalculado, aporteMensal, idadeAtualCalculada])

  // Objetivos no formato da engine (usado na simulação e nos cenários)
  const objetivosEngine = useMemo(() =>
    objetivos.map(obj => ({
      id: obj.id, descricao: obj.descricao, prazo: obj.prazo,
      valor: obj.valor, recorrente: obj.recorrente, aCada: obj.aCada,
    }))
  , [objetivos])

  // ── Estado local ─────────────────────────────────────────────────────────
  const [displayMode, setDisplayMode] = useState<"nominal" | "real">("nominal")
  const [inflacaoDisplay, setInflacaoDisplay] = useState<number>(5)

  // ── Formatadores ─────────────────────────────────────────────────────────
  const formatCurrency = (value: number) => {
    if (!value) return ""
    return new Intl.NumberFormat("pt-BR").format(value)
  }
  const parseCurrency = (value: string) => parseInt(value.replace(/\D/g, ""), 10) || 0

  const formatarMoeda = (valor: number) => {
    if (Math.abs(valor) >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(1)}M`
    if (Math.abs(valor) >= 1_000)     return `R$ ${(valor / 1_000).toFixed(0)}K`
    return `R$ ${valor.toFixed(0)}`
  }

  const formatarMoedaCompleta = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL",
      minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(valor)

  const deflatorPorIdade = (idade: number) => {
    const anos = Math.max(0, idade - idadeAtualCalculada)
    const inf = (Number(inflacaoDisplay) || 0) / 100
    return Math.pow(1 + inf, anos)
  }
  // Cenários foram extraídos para `components/ui/cenarios-investimento.tsx`

  const projecao = useMemo(() => {
    console.log("DEBUG premissasCompletas →", premissasCompletas)
    return calcularProjecao(premissasCompletas, objetivosEngine, state.passivos)
  }, [premissasCompletas, objetivosEngine, state.passivos])

  const kpis = useMemo(() =>
    calcularKPIs(projecao, premissasCompletas, dadosPessoais.renda, dadosPessoais.despesa)
  , [projecao, premissasCompletas, dadosPessoais.renda, dadosPessoais.despesa])

  const dadosGrafico = useMemo(() =>
    projecao.map(p => ({
      ...p,
      valor:
        displayMode === "nominal"
          ? p.saldoNominal
          : (Number(p.saldoNominal) || 0) / deflatorPorIdade(p.idade),
    }))
  , [projecao, displayMode, inflacaoDisplay, idadeAtualCalculada])

  const ToggleNominalReal = (
    <div className="flex items-center gap-3">
      <div className="inline-flex rounded-lg bg-[#131929] p-1">
        {(["nominal", "real"] as const).map(mode => (
          <button
            key={mode}
            onClick={() => setDisplayMode(mode)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              displayMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {mode === "nominal" ? "Nominal" : "Real"}
          </button>
        ))}
      </div>
      {displayMode === "real" && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={inflacaoDisplay}
            onChange={(e) => setInflacaoDisplay(parseFloat(e.target.value) || 0)}
            className="h-9 w-24 bg-[#131929] border-white/10 text-foreground focus:border-primary"
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">% a.a.</span>
        </div>
      )}
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Projeção</p>
        <h1 className="text-2xl font-semibold text-foreground">
          Premissas da <span className="text-primary">Projeção</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Parâmetros que alimentam o modelo de simulação patrimonial
        </p>
      </div>

      {/* Card 1 — Acumulação */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Acumulação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Saldo Inicial Líquido (R$)</Label>
              <Input value={formatCurrency(saldoInicialCalculado)} readOnly
                className="bg-[#131929] border-white/10 text-foreground cursor-not-allowed opacity-70" />
              <p className="text-xs text-muted-foreground">Calculado automaticamente: Ativos − Passivos</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Aporte Mensal (R$)</Label>
              <Input value={formatCurrency(aporteMensal)} readOnly
                className="bg-[#131929] border-white/10 text-foreground cursor-not-allowed opacity-70" />
              <p className="text-xs text-muted-foreground">
                Calculado automaticamente: Renda ({formatarMoedaCompleta(dadosPessoais.renda)}) − Despesa ({formatarMoedaCompleta(dadosPessoais.despesa)})
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Rendimento Anual (%)</Label>
              <Input type="number" value={premissas.rendimento || ""}
                onChange={e => setPremissas({ rendimento: parseFloat(e.target.value) || 0 })}
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary" />
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={premissas.rendimento ?? 0}
                onChange={(e) => setPremissas({ rendimento: parseFloat(e.target.value) || 0 })}
                className="w-full accent-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Inflação Anual (%)</Label>
              <Input type="number" value={premissas.inflacao || ""}
                onChange={e => setPremissas({ inflacao: parseFloat(e.target.value) || 0 })}
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary" />
              <input
                type="range"
                min={0}
                max={15}
                step={0.5}
                value={premissas.inflacao ?? 0}
                onChange={(e) => setPremissas({ inflacao: parseFloat(e.target.value) || 0 })}
                className="w-full accent-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Idade Atual</Label>
              <Input type="number" value={idadeAtualCalculada || ""} readOnly
                className="bg-[#131929] border-white/10 text-foreground cursor-not-allowed opacity-70" />
              <p className="text-xs text-muted-foreground">Calculada pela data de nascimento</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Prazo de Simulação (anos)</Label>
              <Input type="number" value={premissas.prazo || ""}
                onChange={e => setPremissas({ prazo: parseInt(e.target.value) || 0 })}
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary" />
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={premissas.prazo ?? 1}
                onChange={(e) => setPremissas({ prazo: parseInt(e.target.value) || 0 })}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 — Aposentadoria */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Aposentadoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Idade de Aposentadoria</Label>
              <Input type="number" value={premissas.idadeApos || ""}
                onChange={e => setPremissas({ idadeApos: parseInt(e.target.value) || 0 })}
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary" />
              <input
                type="range"
                min={30}
                max={90}
                step={1}
                value={premissas.idadeApos ?? 30}
                onChange={(e) => setPremissas({ idadeApos: parseInt(e.target.value) || 0 })}
                className="w-full accent-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Retirada Mensal Desejada (R$)</Label>
              <Input value={formatCurrency(premissas.retiradaMensal)}
                onChange={e => setPremissas({ retiradaMensal: parseCurrency(e.target.value) })}
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary" />
              <input
                type="range"
                min={0}
                max={1000000}
                step={1000}
                value={premissas.retiradaMensal ?? 0}
                onChange={(e) => setPremissas({ retiradaMensal: parseInt(e.target.value) || 0 })}
                className="w-full accent-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">
                Renda Mensal na Aposentadoria (R$)
              </Label>
              <Input
                value={formatCurrency(premissas.rendaAposentadoria ?? 0)}
                onChange={(e) => setPremissas({ rendaAposentadoria: parseCurrency(e.target.value) })}
                placeholder="0"
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary"
              />
              <input
                type="range"
                min={0}
                max={150000}
                step={500}
                value={premissas.rendaAposentadoria ?? 0}
                onChange={(e) => setPremissas({ rendaAposentadoria: parseInt(e.target.value) || 0 })}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                INSS, previdência, aluguéis e outras rendas na aposentadoria
              </p>
            </div>
          </div>

          {(() => {
            const retiradaDesejada = premissas.retiradaMensal ?? 0
            const rendaApos = premissas.rendaAposentadoria ?? 0
            const retiradaLiquida = Math.max(0, retiradaDesejada - rendaApos)
            const cobreTudo = rendaApos >= retiradaDesejada && retiradaDesejada > 0
            const cor = cobreTudo ? "text-emerald-400" : "text-primary"

            return (
              <div className="rounded-lg bg-[#131929] border border-white/10 px-4 py-3">
                <p className={`text-sm font-medium ${cor}`}>
                  Retirada líquida do patrimônio: {formatarMoedaCompleta(retiradaLiquida)}
                </p>
                <p className="text-xs text-muted-foreground">
                  (Retirada desejada {formatarMoedaCompleta(retiradaDesejada)} - Renda na aposentadoria{" "}
                  {formatarMoedaCompleta(rendaApos)})
                </p>
              </div>
            )
          })()}
          <p className="text-xs text-muted-foreground">
            Os aportes cessam na aposentadoria. A retirada cresce com a inflação anualmente.
          </p>
        </CardContent>
      </Card>

      {/* Card 3 — Nova Entrada */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Nova Entrada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Nova Entrada (R$)</Label>
              <Input
                value={premissas.novaEntrada ? formatCurrency(premissas.novaEntrada) : ""}
                onChange={e => setPremissas({ novaEntrada: parseCurrency(e.target.value) })}
                placeholder="Ex: 500.000 (herança, venda de imóvel...)"
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary" />
              <input
                type="range"
                min={0}
                max={50000000}
                step={10000}
                value={premissas.novaEntrada ?? 0}
                onChange={(e) => setPremissas({ novaEntrada: parseInt(e.target.value) || 0 })}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">Entrada extraordinária corrigida pela inflação no ano previsto</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Idade da Entrada</Label>
              <Input type="number"
                value={premissas.idadeEntrada || ""}
                onChange={e => setPremissas({ idadeEntrada: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 45"
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary" />
              <input
                type="range"
                min={0}
                max={80}
                step={1}
                value={premissas.idadeEntrada ?? 0}
                onChange={(e) => setPremissas({ idadeEntrada: parseInt(e.target.value) || 0 })}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">Idade em que o valor será recebido. Deixe 0 para não usar.</p>
            </div>
          </div>
          {premissas.novaEntrada > 0 && premissas.idadeEntrada > 0 && (
            <div className="flex items-center gap-2 p-3 bg-[rgba(30,92,230,0.08)] rounded-lg border border-[#1E5CE6]/30">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">
                Entrada de <strong className="text-primary">{formatarMoedaCompleta(premissas.novaEntrada)}</strong> prevista
                aos <strong className="text-primary">{premissas.idadeEntrada} anos</strong> — será somada corrigida pela inflação
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 5 — Simulação em Tempo Real */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-foreground">Simulação em tempo real</CardTitle>
          {ToggleNominalReal}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[rgba(30,92,230,0.08)] border border-[#1E5CE6]/30 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Patrimônio na Aposentadoria</p>
                  <p className="text-2xl font-bold text-primary mt-1">{formatarMoeda(kpis.patrimonioApos)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatarMoeda(kpis.patrimonioAposReal)} em valor real</p>
                </div>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="bg-[rgba(34,199,135,0.08)] border border-[#22C787]/30 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Renda Mensal Real</p>
                  <p className="text-2xl font-bold text-[#22C787] mt-1">{formatarMoedaCompleta(kpis.rendaMensalReal)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Com {premissas.rendimento}% a.a.</p>
                </div>
                <DollarSign className="w-5 h-5 text-[#22C787]" />
              </div>
            </div>
            <div className="bg-[#0D1220] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Liberdade Financeira</p>
                  <p className="text-2xl font-bold text-[#F5A623] mt-1">
                    {kpis.idadeLF ? `${kpis.idadeLF} anos` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpis.idadeLF ? `Em ${kpis.idadeLF - idadeAtualCalculada} anos` : "Ajuste as premissas"}
                  </p>
                </div>
                <Clock className="w-5 h-5 text-[#F5A623]" />
              </div>
            </div>
          </div>

          {/* Gráfico */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="idade" stroke="#4A5268"
                  tick={{ fill: "#4A5268", fontSize: 12 }} tickLine={false}
                  axisLine={{ stroke: "rgba(255,255,255,0.04)" }} interval="preserveStartEnd" />
                <YAxis stroke="#4A5268" tick={{ fill: "#4A5268", fontSize: 12 }}
                  tickLine={false} axisLine={false} tickFormatter={formatarMoeda} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#131929", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff" }}
                  labelStyle={{ color: "#ffffff", fontWeight: 600 }}
                  itemStyle={{ color: "#ffffff" }}
                  formatter={(value: number, _name: string, props: any) => {
                    const entry = props?.payload
                    const idade = Number(entry?.idade) || idadeAtualCalculada
                    const d = displayMode === "real" ? deflatorPorIdade(idade) : 1
                    const saldoNominal = Number(entry?.saldoNominal) || 0
                    const saldoReal = saldoNominal / d
                    const rendaMensal =
                      displayMode === "nominal"
                        ? (saldoNominal * premissas.rendimento / 100) / 12
                        : (saldoReal * premissas.rendimento / 100) / 12

                    return [
                      <div className="space-y-1">
                        <div>
                          {displayMode === "nominal" ? "Patrimônio Nominal" : "Patrimônio Real"}: {formatarMoedaCompleta(value)}
                        </div>
                        <div>Renda Mensal Gerada: {formatarMoedaCompleta(rendaMensal)}</div>
                      </div>,
                      "",
                    ]
                  }}
                  labelFormatter={(label) => `Idade: ${label} anos`}
                />
                <ReferenceLine x={premissas.idadeApos} stroke="#F5A623" strokeDasharray="5 5"
                  label={{ value: "Aposentadoria", position: "top", fill: "#F5A623", fontSize: 12 }} />
                <Bar dataKey="valor" radius={[2, 2, 0, 0]}>
                  {dadosGrafico.map((entry: ProjecaoAno & { valor: number }, index: number) => (
                    <Cell key={`cell-${index}`}
                      fill={entry.valor >= 0 ? "rgba(30,92,230,0.35)" : "rgba(240,75,75,0.2)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Card — Cenários Alternativos */}
      <CenariosInvestimento
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        inflacaoDisplay={inflacaoDisplay}
        onInflacaoDisplayChange={setInflacaoDisplay}
        editable
      />

      {/* Card 4 — Modo de Cálculo */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Modo de Cálculo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-sm font-medium text-foreground">Projeção Padrão</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Simula a trajetória patrimonial até o prazo definido, com aportes, objetivos e fase de aposentadoria.
          </p>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-4">
        <Button variant="outline" onClick={() => onNavigate("objetivos")}
          className="border-border text-muted-foreground hover:text-foreground hover:bg-white/5">
          <ArrowLeft className="w-4 h-4 mr-2" />Voltar
        </Button>
        <Button onClick={() => onNavigate("sucessorio")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Próximo<ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
