"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, TrendingUp, DollarSign, Clock, Info } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Line,
} from "recharts"
import { usePlano } from "@/lib/plano-context"
import { getFontesRenda, receitaMensalAtual, resolveAporteParaPremissas } from "@/lib/renda-utils"
import {
  calcularProjecao,
  calcularKPIs,
  calcularFluxoAnual,
  calcularPassivosPorAnoSeries,
  type ProjecaoAno,
} from "@/lib/engine"
import { buildDadosFluxoGrafico, buildDadosRendaGrafico } from "@/lib/projecao-graficos-dados"
import { CHART_TOOLTIP_PROPS } from "@/lib/chart-tooltip"
import { CenariosInvestimento } from "@/components/ui/cenarios-investimento"
import { FluxoAnualChart, RendaCarteiraChart } from "@/components/charts/projecao-extra-charts"

interface ProjecaoProps {
  onNavigate: (section: string) => void
}

export function Projecao({ onNavigate }: ProjecaoProps) {
  const { state, setPremissas, getSaldoInicialLiquido } = usePlano()
  const { premissas, objetivos, dadosPessoais } = state
  const moeda = state.moeda ?? "BRL"

  // ── Derivados automáticos ────────────────────────────────────────────────
  // Saldo inicial: ativos líquidos + previdência (sem passivos)
  const saldoInicialCalculado = useMemo(
    () => getSaldoInicialLiquido(),
    [getSaldoInicialLiquido],
  )

  const idadeAtualCalculada = useMemo(() => {
    if (!dadosPessoais.nascimento) return 0
    const hoje       = new Date()
    const nascimento = new Date(dadosPessoais.nascimento)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const m   = hoje.getMonth() - nascimento.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--
    return Math.max(0, idade)
  }, [dadosPessoais.nascimento])

  const fontesRenda = useMemo(() => getFontesRenda(dadosPessoais), [dadosPessoais])
  const rendaMensalAtual = useMemo(() => receitaMensalAtual(fontesRenda), [fontesRenda])

  const aporteModo = premissas.aporteModo ?? "fixo"
  const blocosAporte = useMemo(() => {
    const prazo = Math.max(0, Number(premissas.prazo) || 0)
    const blocos = Math.max(1, Math.ceil(prazo / 5))
    return Array.from({ length: blocos }, (_, i) => {
      const inicio = i * 5
      const fim = Math.min((i + 1) * 5, prazo)
      return { i, inicio, fim }
    })
  }, [premissas.prazo])

  // Mantém o array de aportes por bloco alinhado ao prazo (preserva valores existentes)
  const aporteBase = useMemo(
    () => resolveAporteParaPremissas(fontesRenda, dadosPessoais.despesa, premissas, blocosAporte).aporteM,
    [fontesRenda, dadosPessoais.despesa, premissas, blocosAporte],
  )

  useEffect(() => {
    if (aporteModo !== "periodos") return
    const desired = blocosAporte.length
    const cur = premissas.aportePeriodosReal ?? []
    if (cur.length === desired) return
    const next = Array.from({ length: desired }, (_, i) => (cur[i] ?? aporteBase))
    setPremissas({ aportePeriodosReal: next })
  }, [aporteModo, blocosAporte.length, aporteBase, premissas.aportePeriodosReal, setPremissas])

  const { aporteM: aporteMensal, aportePorAnoNominal } = useMemo(
    () => resolveAporteParaPremissas(fontesRenda, dadosPessoais.despesa, premissas, blocosAporte),
    [fontesRenda, dadosPessoais.despesa, premissas, blocosAporte],
  )

  // Premissas completas — junta os campos editáveis com os derivados
  const premissasCompletas = useMemo(() => ({
    ...premissas,
    saldoInicial: saldoInicialCalculado,
    aporteM:      aporteMensal,
    prazo:        Math.max(1, Number(premissas.prazo) || 0),
    aportePorAnoNominal,
    idadeAtual:   idadeAtualCalculada,
  }), [premissas, saldoInicialCalculado, aporteMensal, aportePorAnoNominal, idadeAtualCalculada])

  // Objetivos no formato da engine (usado na simulação e nos cenários)
  const objetivosEngine = useMemo(() =>
    objetivos.map(obj => ({
      id: obj.id,
      descricao: obj.descricao,
      prazoAnos: obj.prazoAnos,
      valor: obj.valor,
      recorrente: obj.recorrente,
      frequenciaAnos: obj.frequenciaAnos,
      duracaoTipo: obj.duracaoTipo,
      duracaoAnos: obj.duracaoAnos,
    }))
  , [objetivos])

  // ── Estado local ─────────────────────────────────────────────────────────
  const [displayMode, setDisplayMode] = useState<"nominal" | "real">("nominal")

  // ── Formatadores ─────────────────────────────────────────────────────────
  const formatCurrency = (value: number) => {
    if (!value) return ""
    return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR").format(value)
  }
  const parseCurrency = (value: string) => parseInt(value.replace(/\D/g, ""), 10) || 0

  const formatarMoeda = (valor: number) => {
    const prefix = moeda === "USD" ? "US$ " : "R$ "
    if (Math.abs(valor) >= 1_000_000) return `${prefix}${(valor / 1_000_000).toFixed(1)}M`
    if (Math.abs(valor) >= 1_000)     return `${prefix}${(valor / 1_000).toFixed(0)}K`
    return `${prefix}${valor.toFixed(0)}`
  }

  const formatarMoedaCompleta = (valor: number) =>
    new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", { style: "currency", currency: moeda === "USD" ? "USD" : "BRL",
      minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(valor)

  const rendimentoLiquidoPct = useMemo(() => {
    const bruto = Number(premissas.rendimentoBruto) || 0
    const aliq = Number(premissas.aliquotaImpostoRendimento) || 0
    return Math.max(0, bruto * (1 - Math.max(0, Math.min(1, aliq))))
  }, [premissas.rendimentoBruto, premissas.aliquotaImpostoRendimento])

  const deflatorPorIdade = (idade: number) => {
    const anos = Math.max(0, idade - idadeAtualCalculada)
    const inf = (Number(premissas.inflacao) || 0) / 100
    return Math.pow(1 + inf, anos)
  }

  const taxaNominalAnual = Math.max(0, (Number(premissas.rendimento) || 0) / 100)
  const inflacaoAnual = Math.max(0, (Number(premissas.inflacao) || 0) / 100)
  const taxaNominalMensal = Math.pow(1 + taxaNominalAnual, 1 / 12) - 1
  const taxaReal = (1 + taxaNominalAnual) / (1 + inflacaoAnual) - 1
  const taxaRealMensal = Math.pow(1 + taxaReal, 1 / 12) - 1
  // Cenários foram extraídos para `components/ui/cenarios-investimento.tsx`

  const projecao = useMemo(
    () => calcularProjecao(premissasCompletas, objetivosEngine, state.passivos, displayMode),
    [premissasCompletas, objetivosEngine, state.passivos, displayMode]
  )

  const fluxoAnual = useMemo(
    () =>
      calcularFluxoAnual(
        premissasCompletas,
        objetivosEngine,
        state.passivos,
        Number(premissas.aliquotaImpostoRendimento) || 0.15,
        displayMode,
      ),
    [premissasCompletas, objetivosEngine, state.passivos, premissas.aliquotaImpostoRendimento, displayMode]
  )

  const passivosPorAno = useMemo(
    () => calcularPassivosPorAnoSeries(state.passivos, premissasCompletas.prazo),
    [state.passivos, premissasCompletas.prazo]
  )

  const dadosFluxo = useMemo(
    () =>
      buildDadosFluxoGrafico(projecao, {
        taxaLiqAnual: taxaNominalAnual,
        aporteMensal,
        idadeAtual: idadeAtualCalculada,
        idadeApos: Number(premissas.idadeApos) || 0,
        rendaMensalMeta: Number(premissas.retiradaMensal) || 0,
        displayMode,
        inflacaoPct: Number(premissas.inflacao) || 0,
        objetivosPorAno: fluxoAnual.map((r) => r.objetivos),
        passivosPorAno,
        aportePorAno: fluxoAnual.map((r) => r.aporte),
        retiradaPorAno: fluxoAnual.map((r) => r.retirada),
      }),
    [
      projecao,
      fluxoAnual,
      passivosPorAno,
      displayMode,
      premissas.inflacao,
      premissas.idadeApos,
      premissas.retiradaMensal,
      taxaNominalAnual,
      aporteMensal,
      idadeAtualCalculada,
    ]
  )

  const dadosRenda = useMemo(
    () =>
      buildDadosRendaGrafico(
        projecao,
        taxaNominalMensal,
        taxaRealMensal,
        Number(premissas.retiradaMensal) || 0,
        Number(premissas.inflacao) || 0,
        displayMode
      ),
    [
      projecao,
      taxaNominalMensal,
      taxaRealMensal,
      premissas.retiradaMensal,
      premissas.inflacao,
      displayMode,
    ]
  )

  const kpis = useMemo(() =>
    calcularKPIs(projecao, premissasCompletas, rendaMensalAtual, dadosPessoais.despesa)
  , [projecao, premissasCompletas, rendaMensalAtual, dadosPessoais.despesa])

  const dadosGrafico = useMemo(() =>
    projecao.map(p => ({
      ...p,
      valorNominal: Number(p.saldoNominal) || 0,
      poderCompraHoje: (Number(p.saldoNominal) || 0) / deflatorPorIdade(p.idade),
      valor:
        displayMode === "nominal"
          ? (Number(p.saldoNominal) || 0)
          : (Number(p.saldoNominal) || 0) / deflatorPorIdade(p.idade),
    }))
  , [projecao, displayMode, premissas.inflacao, idadeAtualCalculada])

  const ToggleNominalReal = (
    <div className="flex items-center gap-3">
      <div className="inline-flex rounded-lg bg-card p-1">
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
      <div
        className={`text-xs font-medium uppercase tracking-wide ${
          displayMode === "real" ? "text-muted-foreground" : "text-muted-foreground/60"
        }`}
      >
        INFLAÇÃO: <span className="text-foreground">{Number(premissas.inflacao) || 0}%</span>
      </div>
    </div>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Projeção</p>
        <h1 className="page-title text-[24px] text-foreground">
          Premissas da <span className="text-primary">Projeção</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Parâmetros que alimentam o modelo de simulação patrimonial
        </p>
      </div>

      {/* Card 1 — Acumulação */}
      <Card className="form-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Acumulação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="field-label">Saldo Inicial Líquido (R$)</Label>
              <Input value={formatCurrency(saldoInicialCalculado)} readOnly
                className="form-card text-foreground cursor-not-allowed opacity-70" />
              <p className="text-xs text-muted-foreground">Calculado automaticamente: Ativos Líquidos + Previdência</p>
            </div>
            <div className="space-y-2">
              <Label className="field-label">Rendimento Anual Bruto (%)</Label>
              <Input
                type="number"
                value={premissas.rendimentoBruto ?? ""}
                onChange={e => setPremissas({ rendimentoBruto: parseFloat(e.target.value) || 0 })}
                className="form-card text-foreground focus:border-primary" />
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={premissas.rendimentoBruto ?? 0}
                onChange={(e) => setPremissas({ rendimentoBruto: parseFloat(e.target.value) || 0 })}
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-2">
              <Label className="field-label">
                Alíquota de Imposto sobre Rendimento
              </Label>
              <Select
                value={String(premissas.aliquotaImpostoRendimento ?? 0.15)}
                onValueChange={(v) => setPremissas({ aliquotaImpostoRendimento: parseFloat(v) || 0 })}
              >
                <SelectTrigger className="form-card text-foreground focus:border-primary">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="form-card">
                  <SelectItem value="0.15">15% — renda fixa longo prazo</SelectItem>
                  <SelectItem value="0.175">17,5% — renda fixa 2-4 anos</SelectItem>
                  <SelectItem value="0.20">20% — renda fixa 1-2 anos</SelectItem>
                  <SelectItem value="0.225">22,5% — renda fixa até 1 ano</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Rendimento líquido utilizado nas simulações:{" "}
                <span className="text-foreground font-medium">
                  {rendimentoLiquidoPct.toFixed(1).replace(".", ",")}% a.a.
                </span>
              </p>
            </div>
            <div className="space-y-2">
              <Label className="field-label">Inflação Anual (%)</Label>
              <Input type="number" value={premissas.inflacao || ""}
                onChange={e => setPremissas({ inflacao: parseFloat(e.target.value) || 0 })}
                className="form-card text-foreground focus:border-primary" />
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
              <Label className="field-label">Idade Atual</Label>
              <Input type="number" value={idadeAtualCalculada || ""} readOnly
                className="form-card text-foreground cursor-not-allowed opacity-70" />
              <p className="text-xs text-muted-foreground">Calculada pela data de nascimento</p>
            </div>
            <div className="space-y-2">
              <Label className="field-label">Prazo de Simulação (anos)</Label>
              <Input type="number" value={premissas.prazo || ""}
                onChange={e => setPremissas({ prazo: parseInt(e.target.value) || 0 })}
                className="form-card text-foreground focus:border-primary" />
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

      {/* Card — Aporte Mensal */}
      <Card className="form-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Aporte Mensal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="field-label">Modo de Aporte</Label>
            <Select
              value={aporteModo}
              onValueChange={(v) => setPremissas({ aporteModo: (v as "fixo" | "periodos") || "fixo" })}
            >
              <SelectTrigger className="form-card text-foreground focus:border-primary">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="form-card">
                <SelectItem value="fixo">Aporte fixo</SelectItem>
                <SelectItem value="periodos">Personalizado por período</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {aporteModo === "fixo" ? (
            <div className="space-y-2">
              <Label className="field-label">Aporte Mensal (R$)</Label>
              <Input
                value={formatCurrency(aporteMensal)}
                readOnly
                className="form-card text-foreground cursor-not-allowed opacity-70"
              />
              <p className="text-xs text-muted-foreground">
                Calculado automaticamente: Renda ({formatarMoedaCompleta(rendaMensalAtual)}) − Despesa ({formatarMoedaCompleta(dadosPessoais.despesa)})
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="form-card px-4 py-3">
                <p className="text-sm text-foreground font-medium">Personalizado por período (blocos de 5 anos)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Os valores são em poder de compra de hoje (reais). O sistema converte para nominal no início de cada período.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blocosAporte.map((b) => {
                  const real = Number((premissas.aportePeriodosReal ?? [])[b.i] ?? aporteMensal) || 0
                  const inf = (Number(premissas.inflacao) || 0) / 100
                  const nominalNoInicio = real * Math.pow(1 + inf, b.inicio)
                  return (
                    <div key={b.i} className="rounded-xl border border-border bg-secondary p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Ano {b.inicio} ao {b.fim}
                      </p>
                      <div className="mt-3 space-y-2">
                        <Label className="field-label">Aporte (R$)</Label>
                        <Input
                          value={formatCurrency(real)}
                          onChange={(e) => {
                            const v = parseCurrency(e.target.value)
                            const cur = premissas.aportePeriodosReal ?? []
                            const next = Array.from({ length: blocosAporte.length }, (_, i) => (cur[i] ?? aporteMensal))
                            next[b.i] = v
                            setPremissas({ aportePeriodosReal: next, aporteModo: "periodos" })
                          }}
                          placeholder="0"
                          className="form-card text-foreground focus:border-primary"
                        />
                        <p className="text-xs text-muted-foreground">
                          Equivalente a <span className="text-foreground">{formatarMoedaCompleta(nominalNoInicio)}</span>{" "}
                          nominais no início do período
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2 — Aposentadoria */}
      <Card className="form-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Aposentadoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="field-label">Idade de Aposentadoria</Label>
              <Input type="number" value={premissas.idadeApos || ""}
                onChange={e => setPremissas({ idadeApos: parseInt(e.target.value) || 0 })}
                className="form-card text-foreground focus:border-primary" />
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
              <Label className="field-label">Retirada Mensal Desejada (R$)</Label>
              <Input value={formatCurrency(premissas.retiradaMensal)}
                onChange={e => setPremissas({ retiradaMensal: parseCurrency(e.target.value) })}
                className="form-card text-foreground focus:border-primary" />
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
              <Label className="field-label">
                Renda Mensal na Aposentadoria (R$)
              </Label>
              <Input
                value={formatCurrency(premissas.rendaAposentadoria ?? 0)}
                onChange={(e) => setPremissas({ rendaAposentadoria: parseCurrency(e.target.value) })}
                placeholder="0"
                className="form-card text-foreground focus:border-primary"
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
            const cor = cobreTudo ? "text-white" : "text-primary"

            return (
              <div className="form-card px-4 py-3">
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
      <Card className="form-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Nova Entrada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="field-label">Nova Entrada (R$)</Label>
              <Input
                value={premissas.novaEntrada ? formatCurrency(premissas.novaEntrada) : ""}
                onChange={e => setPremissas({ novaEntrada: parseCurrency(e.target.value) })}
                placeholder="Ex: 500.000 (herança, venda de imóvel...)"
                className="form-card text-foreground focus:border-primary" />
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
              <Label className="field-label">Idade da Entrada</Label>
              <Input type="number"
                value={premissas.idadeEntrada || ""}
                onChange={e => setPremissas({ idadeEntrada: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 45"
                className="form-card text-foreground focus:border-primary" />
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
            <div className="flex items-center gap-2 p-3 bg-[rgba(30,92,230,0.08)] rounded-lg border border-primary/30">
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
      <Card className="form-card">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base font-medium text-foreground">Simulação em tempo real</CardTitle>
          {ToggleNominalReal}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[rgba(30,92,230,0.08)] border border-primary/30 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="field-label">Patrimônio na Aposentadoria</p>
                  <p className="text-2xl font-bold text-primary mt-1">{formatarMoeda(kpis.patrimonioApos)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatarMoeda(kpis.patrimonioAposReal)} em valor real</p>
                </div>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="bg-[rgba(34,199,135,0.08)] border border-[#22C787]/30 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="field-label">Renda Mensal na Aposentadoria</p>
                  {(() => {
                    const anos = Math.max(0, (Number(premissas.idadeApos) || 0) - idadeAtualCalculada)
                    const patrimonioNominalApos = Number(kpis.patrimonioApos) || 0
                    const patrimonioRealApos = Number(kpis.patrimonioAposReal) || 0
                    const rendaNominalApos = Math.max(0, patrimonioNominalApos * taxaNominalMensal)
                    const rendaHojeEq = rendaNominalApos / Math.pow(1 + inflacaoAnual, anos)
                    const rendaRealApos = Math.max(0, patrimonioRealApos * taxaRealMensal)

                    if (displayMode === "nominal") {
                      return (
                        <>
                          <p className="text-2xl font-bold text-[#22C787] mt-1">{formatarMoedaCompleta(rendaNominalApos)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            ({formatarMoedaCompleta(rendaHojeEq)} hoje)
                          </p>
                        </>
                      )
                    }

                    return (
                      <>
                        <p className="text-2xl font-bold text-[#22C787] mt-1">{formatarMoedaCompleta(rendaRealApos)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Taxa real (Fisher): {(taxaReal * 100).toFixed(1).replace(".", ",")}% a.a.
                        </p>
                      </>
                    )
                  })()}
                </div>
                <DollarSign className="w-5 h-5 text-[#22C787]" />
              </div>
            </div>
            <div className="bg-secondary border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="field-label">Liberdade Financeira</p>
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
                  {...CHART_TOOLTIP_PROPS}
                  formatter={(value: number, _name: string, props: any) => {
                    const entry = props?.payload
                    const idade = Number(entry?.idade) || idadeAtualCalculada
                    const d = displayMode === "real" ? deflatorPorIdade(idade) : 1
                    const saldoNominal = Number(entry?.saldoNominal) || 0
                    const saldoRealHoje = saldoNominal / deflatorPorIdade(idade)
                    const poderCompraHoje = saldoNominal / deflatorPorIdade(idade)
                    const rendaNominal = Math.max(0, saldoNominal * taxaNominalMensal)
                    const rendaReal = Math.max(0, saldoRealHoje * taxaRealMensal)

                    return [
                      <div className="space-y-1">
                        <div>
                          {displayMode === "nominal" ? "Nominal" : "Real"}: {formatarMoedaCompleta(value)}
                        </div>
                        {displayMode === "nominal" && (
                          <div>Poder de compra hoje: {formatarMoedaCompleta(poderCompraHoje)}</div>
                        )}
                        <div>
                          Renda Mensal Gerada: {formatarMoedaCompleta(displayMode === "nominal" ? rendaNominal : rendaReal)}
                        </div>
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
                {displayMode === "nominal" && (
                  <Line
                    type="monotone"
                    dataKey="poderCompraHoje"
                    stroke="rgba(255,255,255,0.65)"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    dot={false}
                    isAnimationActive={false}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {displayMode === "nominal" && (
            <p className="text-xs text-muted-foreground">
              Valores nominais — a linha tracejada mostra o equivalente em poder de compra de hoje considerando inflação de{" "}
              <span className="text-foreground font-medium">{Number(premissas.inflacao) || 0}% a.a.</span>
              .
            </p>
          )}

          {dadosFluxo && dadosFluxo.length > 0 && (
            <FluxoAnualChart
              data={dadosFluxo}
              formatarMoeda={formatarMoeda}
              formatarMoedaCompleta={formatarMoedaCompleta}
            />
          )}

          {dadosRenda && dadosRenda.length > 0 && (
            <RendaCarteiraChart
              data={dadosRenda}
              displayMode={displayMode}
              formatarMoeda={formatarMoeda}
              formatarMoedaCompleta={formatarMoedaCompleta}
            />
          )}
        </CardContent>
      </Card>

      {/* Card — Cenários Alternativos */}
      <CenariosInvestimento
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        editable
      />

      {/* Card 4 — Modo de Cálculo */}
      <Card className="form-card">
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
      <div className="nav-footer">
        <Button
          variant="ghost"
          className="btn-back"
          onClick={() => onNavigate("fluxo-de-caixa")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={() => onNavigate("protecao")} className="btn-next">
          Próximo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
