"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight, TrendingUp, DollarSign, Clock, Info, Check, AlertTriangle } from "lucide-react"
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
  encontrarAporteNecessario,
  encontrarRendaDeConsumoMensalReal,
  encontrarRendaDePreservacaoMensalReal,
  saldoRealNaIdadeApos,
  rodarMonteCarlo,
  VOLATILIDADE_MONTE_CARLO_ANUAL,
  pvAnuidade,
  pmtDeAnuidade,
  horizonteRendaSustentavelAnos,
  horizontePosAposentadoriaAnos,
  rendaMensalGeradaReal,
  rendaMensalGeradaNominal,
  totalObjetivosEternosAnuais,
  type ResultadoMonteCarlo,
  type ProjecaoAno,
} from "@/lib/engine"
import { VOGA } from "@/lib/voga-tokens"
import { buildDadosFluxoGrafico, buildDadosRendaGrafico } from "@/lib/projecao-graficos-dados"
import { CHART_TOOLTIP_PROPS } from "@/lib/chart-tooltip"
import { CenariosInvestimento } from "@/components/ui/cenarios-investimento"
import { GraficoFluxoAnual } from "@/components/charts/grafico-fluxo-anual"
import { RendaCarteiraChart } from "@/components/charts/projecao-extra-charts"
import { IndependenciaChart, type PontoIndependencia } from "@/components/charts/independencia-chart"
import { MonteCarloChart } from "@/components/charts/monte-carlo-chart"
import { EstrategiaRetiradaAposentadoria } from "@/components/ui/estrategia-retirada-aposentadoria"

const GOLD = VOGA.brasilia
const GREEN = VOGA.brasilia
const RED = VOGA.alerta

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
  const [displayMode, setDisplayMode] = useState<"nominal" | "real">("real")

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
  const taxaReal = (1 + taxaNominalAnual) / (1 + inflacaoAnual) - 1

  const horizonteApos = useMemo(
    () => horizontePosAposentadoriaAnos(premissasCompletas),
    [premissasCompletas],
  )
  const idadeFimSimulacao =
    idadeAtualCalculada + Math.max(0, Number(premissas.prazo) || 0)

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
        // Mesma fonte que a projeção de saldo deduz (calcularFluxoAnual usa os mesmos
        // objetivosAno/dividasAno de calcularProjecao) — sem duplicar o cálculo.
        objetivosPorAno: fluxoAnual.map((r) => r.objetivos),
        passivosPorAno: fluxoAnual.map((r) => r.dividas),
        aportePorAno: fluxoAnual.map((r) => r.aporte),
        retiradaPorAno: fluxoAnual.map((r) => r.retirada),
      }),
    [
      projecao,
      fluxoAnual,
      displayMode,
      premissas.inflacao,
      premissas.idadeApos,
      premissas.retiradaMensal,
      taxaNominalAnual,
      aporteMensal,
      idadeAtualCalculada,
    ]
  )

  const objetivosEternosAnuais = useMemo(
    () => totalObjetivosEternosAnuais(objetivosEngine, taxaReal),
    [objetivosEngine, taxaReal],
  )

  const kpis = useMemo(() =>
    calcularKPIs(projecao, premissasCompletas, rendaMensalAtual, dadosPessoais.despesa, objetivosEngine)
  , [projecao, premissasCompletas, rendaMensalAtual, dadosPessoais.despesa, objetivosEngine])

  const objetivosEternosMensal = objetivosEternosAnuais / 12
  const necessidadeMensalTotal = (Number(premissas.retiradaMensal) || 0) + objetivosEternosMensal

  const dadosGrafico = useMemo(() => {
    const idadeApos = Number(premissas.idadeApos) || 0
    const retiradaDesejada = Number(premissas.retiradaMensal) || 0
    const rendaApos = Number(premissas.rendaAposentadoria) || 0
    // Mesma fórmula do loop: só o excedente da renda desejada sobre a renda permanente
    // é sacado do patrimônio.
    const retiradaEfetivaMensalHoje = Math.max(0, retiradaDesejada - rendaApos)

    return projecao.map((p, i) => {
      const saldoNominal = Number(p.saldoNominal) || 0
      const deflator = deflatorPorIdade(p.idade)
      const patrimonioReal = Number(p.saldoReal) || 0
      const prev = i > 0 ? projecao[i - 1] : null
      const saldoNominalInicio =
        prev ? Number(prev.saldoNominal) || 0 : premissasCompletas.saldoInicial
      const patrimonioRealInicio = saldoNominalInicio / deflator
      const patrimonioRealAnterior = prev ? Number(prev.saldoReal) || 0 : patrimonioReal
      const deltaPatrimonioReal = patrimonioReal - patrimonioRealAnterior

      const optsRendaGerada = { aliquotaIR: 0 }
      const horizonteNesseAno = horizonteRendaSustentavelAnos(p.idade, idadeApos, horizonteApos)
      const rendaSustentavelReal = pmtDeAnuidade(patrimonioReal, taxaReal, horizonteNesseAno) / 12
      const rendaSustentavelNominal = rendaSustentavelReal * deflator
      const rendaGeradaReal = rendaMensalGeradaReal(
        patrimonioRealInicio,
        taxaNominalAnual,
        inflacaoAnual,
        optsRendaGerada,
      )
      const rendaGeradaNominal = rendaMensalGeradaNominal(
        saldoNominalInicio,
        taxaNominalAnual,
        inflacaoAnual,
        deflator,
        optsRendaGerada,
      )

      const isAposentado = !!p.isAposentado
      // Retirada APLICADA na simulação (PP de hoje) — diferente da "renda gerada" do ano.
      const retiradaAplicadaMensalReal = isAposentado ? retiradaEfetivaMensalHoje : 0
      const retiradaAplicadaMensal =
        displayMode === "nominal"
          ? retiradaAplicadaMensalReal * deflator
          : retiradaAplicadaMensalReal

      return {
        ...p,
        valorNominal: saldoNominal,
        poderCompraHoje: saldoNominal / deflator,
        valor: displayMode === "nominal" ? saldoNominal : saldoNominal / deflator,
        rendaSustentavelReal,
        rendaSustentavelNominal,
        rendaGeradaReal,
        rendaGeradaNominal,
        retiradaAplicadaMensal,
        retiradaAplicadaMensalReal,
        deltaPatrimonioReal,
      }
    })
  }, [
    projecao,
    fluxoAnual,
    premissasCompletas.saldoInicial,
    displayMode,
    premissas.inflacao,
    premissas.retiradaMensal,
    premissas.rendaAposentadoria,
    horizonteApos,
    premissas.idadeApos,
    taxaReal,
    taxaNominalAnual,
    inflacaoAnual,
    idadeAtualCalculada,
  ])

  const rendaConsumoPatrimonioRealApos = useMemo(
    () =>
      encontrarRendaDeConsumoMensalReal({
        premissas: premissasCompletas,
        objetivos: objetivosEngine,
        passivos: state.passivos,
        tolerancia: 1000,
      }),
    [premissasCompletas, objetivosEngine, state.passivos],
  )

  /** Série de objetivos/dívidas REAIS usada pelo KPI e pelos testes — mesma fonte do loop. */
  const seriesFluxoAposentadoriaReal = useMemo(() => {
    const idadeApos = Number(premissas.idadeApos) || 0
    const idxApos = fluxoAnual.findIndex((r) => r.idade === idadeApos)
    const objetivos: number[] = []
    const dividas: number[] = []
    for (let ano = 0; ano < horizonteApos; ano++) {
      const row = idxApos >= 0 ? fluxoAnual[idxApos + ano] : undefined
      const deflator = deflatorPorIdade(idadeApos + ano)
      objetivos.push(((Number(row?.objetivos) || 0) / deflator) || 0)
      dividas.push(((Number(row?.dividas) || 0) / deflator) || 0)
    }
    const media = (arr: number[]) =>
      arr.length === 0 ? 0 : arr.reduce((s, v) => s + Math.max(0, v), 0) / arr.length
    return {
      objetivos,
      dividas,
      mediaObjetivos: media(objetivos),
      mediaDividas: media(dividas),
      amostra: objetivos.slice(0, 6).map((obj, i) => ({
        idade: idadeApos + i,
        objetivosAno: Math.round(obj),
        dividasAno: Math.round(dividas[i] || 0),
      })),
    }
  }, [fluxoAnual, premissas.idadeApos, horizonteApos, deflatorPorIdade])

  // Gráfico de renda: consumo é o valor fixo do KPI (linha flat), não recalculado por idade.
  const dadosRenda = useMemo(
    () =>
      buildDadosRendaGrafico(projecao, {
        taxaRealAnual: taxaReal,
        taxaNominalAnual,
        inflacaoAnual,
        horizonteAnos: horizonteApos,
        metaMensal: Number(premissas.retiradaMensal) || 0,
        idadeAposentadoria: Number(premissas.idadeApos) || 0,
        saldoInicial: premissasCompletas.saldoInicial,
        objetivosEternosAnuais,
        aliquotaIR: Number(premissas.aliquotaImpostoRendimento) || 0.15,
        fluxoAnual,
        premissas: premissasCompletas,
        objetivos: objetivosEngine,
        passivos: state.passivos,
      }),
    [
      projecao,
      taxaReal,
      taxaNominalAnual,
      inflacaoAnual,
      horizonteApos,
      premissas.retiradaMensal,
      premissas.idadeApos,
      premissas.aliquotaImpostoRendimento,
      premissasCompletas,
      objetivosEngine,
      state.passivos,
      objetivosEternosAnuais,
      fluxoAnual,
    ]
  )

  const pontoAposentadoria = useMemo(() => {
    return (
      dadosGrafico.find((d) => d.idade === (Number(premissas.idadeApos) || 0)) ??
      dadosGrafico[dadosGrafico.length - 1]
    )
  }, [dadosGrafico, premissas.idadeApos])

  const rendaGeradaApos = useMemo(() => {
    const idadeApos = Number(premissas.idadeApos) || 0
    const idxApos = projecao.findIndex((p) => p.idade === idadeApos)
    if (idxApos < 0) return { valor: 0, valorHoje: 0, diagnostic: null as null | object }

    const saldoNominalInicio =
      idxApos > 0
        ? Number(projecao[idxApos - 1].saldoNominal) || 0
        : premissasCompletas.saldoInicial
    const idadeInicio =
      idxApos > 0 ? projecao[idxApos - 1].idade : idadeAtualCalculada
    const patrimonioRealInicio = saldoNominalInicio / deflatorPorIdade(idadeInicio)

    // Mesma lógica ano a ano do loop (objetivos/dívidas reais) — NÃO média isolada.
    // Busca W tal que patrimônio final ≈ patrimônio inicial (Preservação).
    const real = encontrarRendaDePreservacaoMensalReal({
      premissas: premissasCompletas,
      objetivos: objetivosEngine,
      passivos: state.passivos,
      tolerancia: 1000,
    })

    // Comparativo legado (só diagnóstico): média vs série real do loop.
    const mediaLegacy = rendaMensalGeradaReal(patrimonioRealInicio, taxaNominalAnual, inflacaoAnual, {
      objetivosAnuaisReal: seriesFluxoAposentadoriaReal.mediaObjetivos,
      dividasAnuaisReal: seriesFluxoAposentadoriaReal.mediaDividas,
      aliquotaIR: 0,
    })
    const puraLegacy = rendaMensalGeradaReal(patrimonioRealInicio, taxaNominalAnual, inflacaoAnual, {
      aliquotaIR: 0,
    })

    return {
      valorHoje: real,
      valor: displayMode === "nominal" ? real * deflatorPorIdade(idadeApos) : real,
      diagnostic: {
        patrimonioRealInicio: Math.round(patrimonioRealInicio),
        taxaReal,
        horizonteApos,
        amostraLoop: seriesFluxoAposentadoriaReal.amostra,
        mediaObjetivos: Math.round(seriesFluxoAposentadoriaReal.mediaObjetivos),
        mediaDividas: Math.round(seriesFluxoAposentadoriaReal.mediaDividas),
        kpiPreservacaoAnoAAno: Math.round(real),
        kpiLegacyMedia: Math.round(mediaLegacy),
        kpiLegacyPura: Math.round(puraLegacy),
      },
    }
  }, [
    projecao,
    premissas.idadeApos,
    premissasCompletas,
    objetivosEngine,
    state.passivos,
    idadeAtualCalculada,
    deflatorPorIdade,
    taxaReal,
    taxaNominalAnual,
    inflacaoAnual,
    horizonteApos,
    seriesFluxoAposentadoriaReal,
    displayMode,
  ])

  // Instrumentação pedida: compara série do loop vs média no console (uma vez por mudança).
  useEffect(() => {
    if (!rendaGeradaApos.diagnostic) return
    // eslint-disable-next-line no-console
    console.log("[diagnostico-renda-gerada]", rendaGeradaApos.diagnostic)
  }, [rendaGeradaApos.diagnostic])

  const rendaConsumoApos = useMemo(() => {
    if (!pontoAposentadoria) return { valor: 0, valorHoje: 0 }
    const anosAteApos = Math.max(0, (Number(premissas.idadeApos) || 0) - idadeAtualCalculada)
    const deflatorApos = Math.pow(1 + inflacaoAnual, anosAteApos)
    return {
      valor:
        displayMode === "nominal"
          ? rendaConsumoPatrimonioRealApos * deflatorApos
          : rendaConsumoPatrimonioRealApos,
      valorHoje: rendaConsumoPatrimonioRealApos,
    }
  }, [
    pontoAposentadoria,
    displayMode,
    rendaConsumoPatrimonioRealApos,
    premissas.idadeApos,
    idadeAtualCalculada,
    inflacaoAnual,
  ])

  // ── Independência financeira (anuidade, sem taxa de retirada fixa) ─────────
  const anoBase = new Date().getFullYear()
  const horizonte = horizonteApos
  const rendaMensalDesejada = Number(premissas.retiradaMensal) || 0

  const patrimonioNecessario = kpis.patrimonioNecessarioLF

  // ── Bloco 2: aporte necessário (busca na simulação real do Bloco 1) ────────
  const b2Resultado = useMemo(() => {
    const alvo = patrimonioNecessario
    const idadeApos = Number(premissas.idadeApos) || 0
    if (idadeApos <= idadeAtualCalculada) {
      return { alvo, aporteNecessario: 0, patrimonioProjetado: saldoInicialCalculado, invalido: true }
    }
    const premissasBusca = { ...premissasCompletas, aportePorAnoNominal: undefined }
    const aporteNecessario = encontrarAporteNecessario({
      premissas: premissasBusca,
      objetivos: objetivosEngine,
      passivos: state.passivos,
      patrimonioNecessario: alvo,
    })
    const patrimonioProjetado = saldoRealNaIdadeApos(
      { ...premissasBusca, aporteM: aporteNecessario },
      objetivosEngine,
      state.passivos,
      aporteNecessario,
    )
    return { alvo, aporteNecessario, patrimonioProjetado, invalido: false }
  }, [
    patrimonioNecessario,
    premissasCompletas,
    objetivosEngine,
    state.passivos,
    premissas.idadeApos,
    idadeAtualCalculada,
    saldoInicialCalculado,
  ])

  const gapAporte = aporteMensal - b2Resultado.aporteNecessario
  const maiorAporteComparativo = Math.max(aporteMensal, b2Resultado.aporteNecessario, 1)

  const idadeIndependencia = useMemo(() => {
    for (const p of projecao) {
      if ((Number(p.saldoReal) || 0) >= patrimonioNecessario) return p.idade
    }
    return null
  }, [projecao, patrimonioNecessario])

  const dadosIndependencia = useMemo<PontoIndependencia[]>(
    () =>
      projecao.map((p) => ({
        idade: p.idade,
        ano: anoBase + p.t,
        patrimonio: Number(p.saldoReal) || 0,
      })),
    [projecao, anoBase],
  )

  const anosAteIndependencia =
    idadeIndependencia != null ? Math.max(0, idadeIndependencia - idadeAtualCalculada) : null

  const PAINEL_BG = "#F5F5F5"
  const [monteCarloLoading, setMonteCarloLoading] = useState(false)
  const [monteCarloResultado, setMonteCarloResultado] = useState<ResultadoMonteCarlo | null>(null)

  const rodarMonteCarloSobDemanda = async () => {
    setMonteCarloLoading(true)
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    try {
      const resultado = rodarMonteCarlo(
        premissasCompletas,
        objetivosEngine,
        state.passivos,
        1000,
        VOLATILIDADE_MONTE_CARLO_ANUAL,
      )
      setMonteCarloResultado(resultado)
    } finally {
      setMonteCarloLoading(false)
    }
  }

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
        <p className="text-sm text-muted-foreground">Planejamento</p>
        <h1 className="page-title text-[24px] text-foreground">
          Projeções financeiras / <span className="text-primary">aposentadoria</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-[rgba(30,92,230,0.08)] border border-primary/30 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="field-label">Patrimônio na Aposentadoria</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: "var(--voga-brasilia)" }}>
                    {formatarMoeda(kpis.patrimonioAposReal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatarMoeda(kpis.patrimonioApos)} nominal
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
            </div>
            <div className="bg-[rgba(16,102,218,0.08)] border border-[#1066DA]/30 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="field-label font-semibold text-foreground">Renda mensal gerada</p>
                  <p className="text-2xl font-bold text-[#1066DA] mt-1">{formatarMoedaCompleta(rendaGeradaApos.valor)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Perpetuidade {displayMode === "nominal" ? `· (${formatarMoedaCompleta(rendaGeradaApos.valorHoje)} hoje)` : ""}
                  </p>
                </div>
                <DollarSign className="w-5 h-5 text-[#1066DA]" />
              </div>
            </div>
            <div className="bg-[rgba(75,117,155,0.10)] border border-[var(--voga-nuvem)]/30 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="field-label font-semibold text-foreground">Renda de consumo do patrimônio</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: "var(--voga-nuvem)" }}>
                    {formatarMoedaCompleta(rendaConsumoApos.valor)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {displayMode === "nominal"
                      ? `(${formatarMoedaCompleta(rendaConsumoApos.valorHoje)} hoje · anuidade por ${horizonte} anos)`
                      : `Zera aos ${idadeFimSimulacao} anos`}
                  </p>
                  {displayMode === "nominal" && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Zera aos {idadeFimSimulacao} anos
                    </p>
                  )}
                </div>
                <DollarSign className="w-5 h-5" style={{ color: "var(--voga-nuvem)" }} />
              </div>
            </div>
            <div className="bg-secondary border border-border rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="field-label">Liberdade Financeira</p>
                  <p className="text-2xl font-bold text-[#1066DA] mt-1">
                    {kpis.idadeLF ? `${kpis.idadeLF} anos` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {kpis.idadeLF ? `Em ${kpis.idadeLF - idadeAtualCalculada} anos` : "Ajuste as premissas"}
                  </p>
                  <div className="text-xs text-muted-foreground mt-2 space-y-0.5 border-t border-border/50 pt-2">
                    <p>Renda desejada: {formatarMoedaCompleta(rendaMensalDesejada)}/mês</p>
                    <p>Objetivos eternos (equiv.): {formatarMoedaCompleta(objetivosEternosMensal)}/mês</p>
                    <p className="text-foreground font-medium">
                      Necessidade total: {formatarMoedaCompleta(necessidadeMensalTotal)}/mês
                    </p>
                  </div>
                </div>
                <Clock className="w-5 h-5 text-[#1066DA]" />
              </div>
            </div>
          </div>

          <div
            className="rounded-xl"
            style={{
              background: "var(--surface-1)",
              padding: "12px 16px",
              color: "var(--text-secondary)",
              fontSize: "12px",
              fontFamily: "var(--font-body)",
            }}
          >
            <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>
              Renda de consumo do patrimônio
            </span>{" "}
            e o valor mensal que, se retirado todo mês pelo restante do horizonte simulado, esgota exatamente o
            patrimônio no último ano da simulação - diferente da renda mensal gerada, que preserva o patrimônio
            para sempre. É uma renda maior, mas o principal se consome ao longo do caminho, não sobra herança nem
            reserva além do horizonte considerado.
          </div>

          {/* Gráfico */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="idade" stroke="rgba(0,0,0,0.35)"
                  tick={{ fill: "var(--text-label)", fontSize: 12 }} tickLine={false}
                  axisLine={{ stroke: "rgba(0,0,0,0.08)" }} interval="preserveStartEnd" />
                <YAxis stroke="rgba(0,0,0,0.35)" tick={{ fill: "var(--text-label)", fontSize: 12 }}
                  tickLine={false} axisLine={false} tickFormatter={formatarMoeda} />
                <Tooltip
                  {...CHART_TOOLTIP_PROPS}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    const entry = payload[0]?.payload as {
                      valor?: number
                      saldoNominal?: number
                      idade?: number
                      isAposentado?: boolean
                      rendaGeradaReal?: number
                      rendaGeradaNominal?: number
                      retiradaAplicadaMensal?: number
                      retiradaAplicadaMensalReal?: number
                      deltaPatrimonioReal?: number
                    }
                    const idade = Number(entry?.idade) || Number(label) || 0
                    const patrimonio = Number(entry?.valor) || 0
                    const rendaGerada =
                      displayMode === "nominal"
                        ? Number(entry?.rendaGeradaNominal) || 0
                        : Number(entry?.rendaGeradaReal) || 0
                    const retiradaAplicada = Number(entry?.retiradaAplicadaMensal) || 0
                    const deltaReal = Number(entry?.deltaPatrimonioReal) || 0
                    const sinalDelta = deltaReal > 0 ? "+" : ""

                    return (
                      <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md space-y-1">
                        <p className="font-medium text-foreground">Idade: {idade} anos</p>
                        <p>
                          Patrimônio ({displayMode === "nominal" ? "nominal" : "real"}):{" "}
                          {formatarMoedaCompleta(patrimonio)}
                        </p>
                        {entry?.isAposentado ? (
                          <p>
                            Retirada aplicada (simulação): {formatarMoedaCompleta(retiradaAplicada)}
                            /mês
                          </p>
                        ) : (
                          <p className="text-muted-foreground">Ainda em acumulação (sem retirada)</p>
                        )}
                        <p>
                          Variação real vs. ano anterior: {sinalDelta}
                          {formatarMoedaCompleta(deltaReal)}
                        </p>
                        <p className="text-muted-foreground border-t border-border pt-1 mt-1">
                          Renda mensal gerada (hipótese se parasse aqui):{" "}
                          {formatarMoedaCompleta(rendaGerada)}/mês
                        </p>
                      </div>
                    )
                  }}
                />
                <ReferenceLine x={premissas.idadeApos} stroke="#1066DA" strokeDasharray="5 5"
                  label={{ value: "Aposentadoria", position: "top", fill: "#1066DA", fontSize: 12 }} />
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
                    stroke="rgba(0,0,0,0.45)"
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

          {dadosRenda && dadosRenda.length > 0 && (
            <RendaCarteiraChart
              data={dadosRenda}
              formatarMoeda={formatarMoeda}
              formatarMoedaCompleta={formatarMoedaCompleta}
            />
          )}
        </CardContent>
      </Card>

      <GraficoFluxoAnual
        title="Fluxo Anual"
        data={dadosFluxo ?? []}
        anoBase={new Date().getFullYear()}
        anoPlanoFim={new Date().getFullYear() + Math.max(0, Number(premissas.prazo) || 0)}
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        formatarMoeda={formatarMoeda}
        formatarMoedaCompleta={formatarMoedaCompleta}
      />

      {/* Card — Cenários Alternativos */}
      <CenariosInvestimento
        displayMode={displayMode}
        onDisplayModeChange={setDisplayMode}
        editable
        showEstrategiaRetirada={false}
      />

      <Card className="form-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-foreground">
            Estratégia de retirada na aposentadoria
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Acumulação / preservação / consumo — escolhe-se a retirada mensal; a rentabilidade é independente.
          </p>
        </CardHeader>
        <CardContent>
          <EstrategiaRetiradaAposentadoria
            premissasCompletas={premissasCompletas}
            objetivosEngine={objetivosEngine}
            passivos={state.passivos}
            rentabilidadeLiquidaPct={rendimentoLiquidoPct}
            displayMode={displayMode}
            inflacaoGlobal={Number(premissas.inflacao) || 0}
            idadeAtualCalculada={idadeAtualCalculada}
            projecaoModerada={projecao}
            aliquotaIR={Number(premissas.aliquotaImpostoRendimento) || 0.15}
            fmtFull={formatarMoedaCompleta}
            formatarMoeda={formatarMoeda}
          />
        </CardContent>
      </Card>

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

      {/* Bloco 1 — Tempo até a independência financeira */}
      <Card className="form-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">
            Tempo até a independência financeira
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Patrimônio necessário calculado pelo valor presente de uma anuidade sobre a necessidade
            total (renda desejada + objetivos eternos) e o horizonte de aposentadoria ({horizonte} anos)
            — sem taxa de retirada fixa.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "14px 16px" }}>
              <p className="text-xs text-muted-foreground mb-1">Independência em</p>
              <p className="text-xl font-bold" style={{ color: GREEN }}>
                {anosAteIndependencia != null ? `${anosAteIndependencia} anos` : "Além do prazo"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {idadeIndependencia != null
                  ? `Aos ${idadeIndependencia} anos · ${anoBase + (idadeIndependencia - idadeAtualCalculada)}`
                  : "Ajuste aporte, prazo ou renda desejada"}
              </p>
            </div>
            <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "14px 16px" }}>
              <p className="text-xs text-muted-foreground mb-1">Patrimônio necessário</p>
              <p className="text-xl font-bold" style={{ color: GOLD }}>
                {formatarMoedaCompleta(patrimonioNecessario)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Valor presente de {horizonte} anos de necessidade total
              </p>
              <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                <p>Renda: {formatarMoedaCompleta(rendaMensalDesejada)}/mês</p>
                <p>+ Objetivos eternos: {formatarMoedaCompleta(objetivosEternosMensal)}/mês</p>
                <p>= {formatarMoedaCompleta(necessidadeMensalTotal)}/mês</p>
              </div>
            </div>
            <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "14px 16px" }}>
              <p className="text-xs text-muted-foreground mb-1">Necessidade mensal total</p>
              <p className="text-xl font-bold text-foreground">
                {formatarMoedaCompleta(necessidadeMensalTotal)}<span className="text-sm font-medium text-muted-foreground">/mês</span>
              </p>
              <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                <p>Renda desejada: {formatarMoedaCompleta(rendaMensalDesejada)}/mês</p>
                <p>Objetivos eternos (equiv.): {formatarMoedaCompleta(objetivosEternosMensal)}/mês</p>
              </div>
            </div>
          </div>

          <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
            <IndependenciaChart
              data={dadosIndependencia}
              necessario={patrimonioNecessario}
              idadeIndependencia={idadeIndependencia}
              formatarMoeda={formatarMoeda}
              formatarMoedaCompleta={formatarMoedaCompleta}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Barras: patrimônio acumulado ano a ano (mesma projeção da Simulação em tempo real,
              poder de compra de hoje). Linha dourada: patrimônio necessário.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bloco 2 — Aporte necessário */}
      <Card className="form-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">
            Aporte necessário
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Para atingir a renda mensal desejada na aposentadoria, com base nas premissas já definidas acima
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
              <p className="text-xs text-muted-foreground mb-1">Aporte necessário</p>
              <p className="text-[30px] leading-none font-bold" style={{ color: "#1066DA" }}>
                {b2Resultado.invalido ? "—" : formatarMoedaCompleta(b2Resultado.aporteNecessario)}
              </p>
            </div>
            <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
              <p className="text-xs text-muted-foreground mb-1">Aporte atual</p>
              <p className="text-[30px] leading-none font-bold text-foreground">
                {formatarMoedaCompleta(aporteMensal)}
              </p>
            </div>
          </div>

          <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
            <p className="text-xs text-muted-foreground mb-4">Comparativo mensal</p>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-sm font-medium text-foreground">Necessário</span>
                  <span className="text-sm tabular-nums text-foreground">
                    {b2Resultado.invalido ? "—" : formatarMoedaCompleta(b2Resultado.aporteNecessario)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/80 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(b2Resultado.aporteNecessario / maiorAporteComparativo) * 100}%`,
                      background: "#1066DA",
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-sm font-medium text-foreground">Atual</span>
                  <span className="text-sm tabular-nums text-foreground">
                    {formatarMoedaCompleta(aporteMensal)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/80 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(aporteMensal / maiorAporteComparativo) * 100}%`,
                      background: "#01121E",
                    }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Alvo: {formatarMoedaCompleta(b2Resultado.alvo)}
              {b2Resultado.invalido ? " · idade de aposentadoria deve ser maior que a idade atual" : ""}
            </p>
          </div>

          <div
            style={{
              borderRadius: 12,
              padding: "16px",
              background: gapAporte >= 0 ? "#D0E0F0" : "#FBEAEA",
              color: gapAporte >= 0 ? "#0C447C" : "var(--voga-alerta-texto)",
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: gapAporte >= 0 ? "#1066DA" : "var(--voga-alerta)",
                  color: "#FFFFFF",
                }}
              >
                {gapAporte >= 0 ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className="text-[26px] leading-tight font-bold">
                  {gapAporte >= 0
                    ? `+${formatarMoedaCompleta(gapAporte)}/mês de folga`
                    : `Faltam ${formatarMoedaCompleta(Math.abs(gapAporte))}/mês`}
                </p>
                <p className="text-sm mt-2 opacity-90">
                  {gapAporte >= 0
                    ? "O aporte atual já supera o necessário — dá pra manter o ritmo ou redirecionar o excedente pra outro objetivo."
                    : "O aporte atual não é suficiente para atingir a renda desejada na idade de aposentadoria planejada."}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="form-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">
            Simulação Monte Carlo
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Roda 1.000 cenários com retornos variando aleatoriamente, em vez de uma única trajetória fixa,
            pra estimar a probabilidade do plano dar certo.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!monteCarloResultado && !monteCarloLoading ? (
            <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "20px" }}>
              <Button onClick={rodarMonteCarloSobDemanda} className="btn-next">
                Rodar simulação Monte Carlo
              </Button>
            </div>
          ) : null}

          {monteCarloLoading ? (
            <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "20px" }}>
              <p className="text-sm font-medium text-foreground">Processando cenários...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Simulando 1.000 trajetórias com volatilidade anual de {(VOLATILIDADE_MONTE_CARLO_ANUAL * 100).toFixed(0)}%.
              </p>
            </div>
          ) : null}

          {monteCarloResultado ? (
            <>
              <div className="flex justify-end">
                <Button variant="outline" onClick={rodarMonteCarloSobDemanda}>
                  Rodar novamente
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  style={{ background: "#D0E0F0", borderRadius: 12, padding: "16px", color: "#0C447C" }}
                >
                  <p className="text-xs uppercase tracking-wide opacity-80">Probabilidade de sucesso</p>
                  <p className="text-[32px] leading-none font-bold mt-2">
                    {monteCarloResultado.probabilidadeSucesso.toFixed(1).replace(".", ",")}%
                  </p>
                  <p className="text-sm mt-2 opacity-90">
                    Percentual de cenários em que o patrimônio não esgota antes do fim do horizonte.
                  </p>
                </div>
                <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
                  <p className="text-xs text-muted-foreground mb-1">Patrimônio final · mediana</p>
                  <p className="text-[30px] leading-none font-bold text-foreground">
                    {formatarMoedaCompleta(monteCarloResultado.patrimonioFinalMediana)}
                  </p>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Pior 10%</p>
                      <p className="text-lg font-semibold" style={{ color: "var(--voga-alerta)" }}>
                        {formatarMoedaCompleta(monteCarloResultado.patrimonioFinalP10)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Melhor 10%</p>
                      <p className="text-lg font-semibold" style={{ color: "#1066DA" }}>
                        {formatarMoedaCompleta(monteCarloResultado.patrimonioFinalP90)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
                <MonteCarloChart
                  data={monteCarloResultado.trajetorias}
                  idadeApos={Number(premissas.idadeApos) || 0}
                  formatarMoeda={formatarMoeda}
                  formatarMoedaCompleta={formatarMoedaCompleta}
                />
              </div>
            </>
          ) : null}
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
