"use client"

import { useMemo, useState } from "react"
import { Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePlano } from "@/lib/plano-context"
import { getFontesRenda, resolveAporteParaPremissas } from "@/lib/renda-utils"
import { calcularProjecao, type ProjecaoAno } from "@/lib/engine"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts"
import { CHART_TOOLTIP_PROPS } from "@/lib/chart-tooltip"
import { EstrategiaRetiradaAposentadoria } from "@/components/ui/estrategia-retirada-aposentadoria"

type DisplayMode = "nominal" | "real"

export interface CenariosInvestimentoProps {
  /** Se omitido, o componente mantém estado interno. */
  displayMode?: DisplayMode
  onDisplayModeChange?: (mode: DisplayMode) => void
  /** Se false, exibe rentabilidades como texto (sem inputs). Default: true */
  editable?: boolean
}

type LinhaCenarios = {
  idade: number
  conservador: number
  moderado: number
  agressivo: number
}

export function CenariosInvestimento(props: CenariosInvestimentoProps) {
  const { state, setPremissas, getSaldoInicialLiquido } = usePlano()
  const { premissas, objetivos, dadosPessoais, passivos } = state
  const moeda = state.moeda ?? "BRL"

  const [showCenarios, setShowCenarios] = useState(true)
  const editable = props.editable ?? true

  const cenarioConservador = premissas.rentabilidadeConservador ?? 7
  const cenarioModerado = premissas.rentabilidadeModerado ?? 10
  const cenarioAgressivo = premissas.rentabilidadeAgressivo ?? 13

  const aliquotaIR = Math.max(0, Math.min(1, Number(premissas.aliquotaImpostoRendimento) || 0.15))
  const aliquotaIRPct = Math.round(aliquotaIR * 100)

  const rentabilidadeLiquidaDeBruta = (bruta: number) =>
    Math.max(0, (Number(bruta) || 0) * (1 - aliquotaIR))

  const fmtPct = (v: number) => v.toFixed(1).replace(".", ",")

  const [displayModeInternal, setDisplayModeInternal] = useState<DisplayMode>("nominal")

  const displayMode = props.displayMode ?? displayModeInternal
  const setDisplayMode = props.onDisplayModeChange ?? setDisplayModeInternal
  const inflacaoGlobal = Number(premissas.inflacao) || 0

  const saldoInicialCalculado = useMemo(
    () => getSaldoInicialLiquido(),
    [getSaldoInicialLiquido],
  )

  const idadeAtualCalculada = useMemo(() => {
    if (!dadosPessoais.nascimento) return 0
    const hoje = new Date()
    const nascimento = new Date(dadosPessoais.nascimento)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const m = hoje.getMonth() - nascimento.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--
    return Math.max(0, idade)
  }, [dadosPessoais.nascimento])

  const fontesRenda = useMemo(() => getFontesRenda(dadosPessoais), [dadosPessoais])
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

  const { aporteM: aporteMensal, aportePorAnoNominal } = useMemo(
    () => resolveAporteParaPremissas(fontesRenda, dadosPessoais.despesa, premissas, blocosAporte),
    [fontesRenda, dadosPessoais.despesa, premissas, blocosAporte],
  )

  const premissasCompletas = useMemo(
    () => ({
      ...premissas,
      saldoInicial: saldoInicialCalculado,
      aporteM: aporteMensal,
      aportePorAnoNominal,
      idadeAtual: idadeAtualCalculada,
    }),
    [premissas, saldoInicialCalculado, aporteMensal, aportePorAnoNominal, idadeAtualCalculada],
  )

  const objetivosEngine = useMemo(
    () =>
      objetivos.map((obj) => ({
        id: obj.id,
        descricao: obj.descricao,
        prazoAnos: obj.prazoAnos,
        valor: obj.valor,
        recorrente: obj.recorrente,
        frequenciaAnos: obj.frequenciaAnos,
        duracaoTipo: obj.duracaoTipo,
        duracaoAnos: obj.duracaoAnos,
      })),
    [objetivos],
  )

  const anosAteAposentadoria = Math.max(0, (premissas.idadeApos || 0) - idadeAtualCalculada)
  const retiradaDesejada = premissas.retiradaMensal ?? 0
  const rendaApos = premissas.rendaAposentadoria ?? 0
  const retiradaLiquida = Math.max(0, retiradaDesejada - rendaApos)

  const deflatorAposentadoria = useMemo(() => {
    const inf = inflacaoGlobal / 100
    return Math.pow(1 + inf, anosAteAposentadoria)
  }, [inflacaoGlobal, anosAteAposentadoria])

  const fmtFull = (v: number) =>
    new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: moeda === "USD" ? "USD" : "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v)

  const formatarMoeda = (valor: number) => {
    const prefix = moeda === "USD" ? "US$ " : "R$ "
    if (Math.abs(valor) >= 1_000_000) return `${prefix}${(valor / 1_000_000).toFixed(1)}M`
    if (Math.abs(valor) >= 1_000) return `${prefix}${(valor / 1_000).toFixed(0)}K`
    return `${prefix}${valor.toFixed(0)}`
  }

  const objetivoPatrimonioParaTaxa = (taxaAnualPct: number) => {
    const taxa = (Number(taxaAnualPct) || 0) / 100
    return taxa > 0 ? (retiradaLiquida * 12) / taxa : Infinity
  }

  const idadeIndependenciaNaProjecao = (projecaoLocal: ProjecaoAno[], taxaAnualPct: number) => {
    const objetivoPatrimonio = objetivoPatrimonioParaTaxa(taxaAnualPct)
    if (!isFinite(objetivoPatrimonio)) return null
    for (const ano of projecaoLocal) {
      if (!ano.isAposentado && (ano.saldoNominal ?? 0) >= objetivoPatrimonio) return ano.idade
    }
    return null
  }

  const patrimonioNaIdadeApos = (projecaoLocal: ProjecaoAno[]) => {
    const row = projecaoLocal.find((p) => p.idade === premissas.idadeApos)
    return {
      nominal: Number(row?.saldoNominal) || 0,
      real: Number(row?.saldoReal) || 0,
    }
  }

  const inflacaoAnual = inflacaoGlobal / 100

  /** Renda mensal real (Fisher) — mesmo método da simulação principal. */
  const rendaMensalRealNaApos = (patrimonioReal: number, taxaLiquidaPct: number) => {
    const taxaNominalAnual = Math.max(0, (Number(taxaLiquidaPct) || 0) / 100)
    const taxaReal = (1 + taxaNominalAnual) / (1 + inflacaoAnual) - 1
    const taxaRealMensal = Math.pow(1 + Math.max(0, taxaReal), 1 / 12) - 1
    return Math.max(0, Math.max(0, patrimonioReal) * taxaRealMensal)
  }

  const projecaoConservadora = useMemo(() => {
    return calcularProjecao(
      { ...premissasCompletas, rendimento: rentabilidadeLiquidaDeBruta(cenarioConservador) },
      objetivosEngine,
      passivos,
    )
  }, [premissasCompletas, objetivosEngine, passivos, cenarioConservador, aliquotaIR])

  const projecaoModerada = useMemo(() => {
    return calcularProjecao(
      { ...premissasCompletas, rendimento: rentabilidadeLiquidaDeBruta(cenarioModerado) },
      objetivosEngine,
      passivos,
    )
  }, [premissasCompletas, objetivosEngine, passivos, cenarioModerado, aliquotaIR])

  const projecaoAgressiva = useMemo(() => {
    return calcularProjecao(
      { ...premissasCompletas, rendimento: rentabilidadeLiquidaDeBruta(cenarioAgressivo) },
      objetivosEngine,
      passivos,
    )
  }, [premissasCompletas, objetivosEngine, passivos, cenarioAgressivo, aliquotaIR])

  const cenarios = useMemo(() => {
    const pCon = patrimonioNaIdadeApos(projecaoConservadora)
    const pMod = patrimonioNaIdadeApos(projecaoModerada)
    const pAgr = patrimonioNaIdadeApos(projecaoAgressiva)

    const build = (
      key: "conservador" | "moderado" | "agressivo",
      nome: string,
      sub: string,
      vol: string,
      cor: string,
      corBg: string,
      corBorder: string,
      taxaBruta: number,
      patrimonio: { nominal: number; real: number },
      projecaoLocal: ProjecaoAno[],
    ) => {
      const taxaLiquida = rentabilidadeLiquidaDeBruta(taxaBruta)
      return {
        key,
        nome,
        sub,
        vol,
        cor,
        corBg,
        corBorder,
        taxaBruta,
        taxaLiquida,
        patrimonioApos: patrimonio.nominal,
        patrimonioAposReal: patrimonio.real,
        rendaMensalAposReal: rendaMensalRealNaApos(patrimonio.real, taxaLiquida),
        idadeIF: idadeIndependenciaNaProjecao(projecaoLocal, taxaLiquida),
      }
    }

    return [
      build(
        "conservador",
        "Conservador",
        "Maior previsibilidade",
        "Baixa",
        "#1066DA",
        "bg-[rgba(16,102,218,0.06)]",
        "border-[#1066DA]/25",
        cenarioConservador,
        pCon,
        projecaoConservadora,
      ),
      build(
        "moderado",
        "Moderado",
        "Equilíbrio risco/retorno",
        "Média",
        "var(--accent)",
        "bg-[rgba(30,92,230,0.06)]",
        "border-primary/25",
        cenarioModerado,
        pMod,
        projecaoModerada,
      ),
      build(
        "agressivo",
        "Agressivo",
        "Maior retorno esperado",
        "Alta",
        "#1066DA",
        "bg-[rgba(245,166,35,0.06)]",
        "border-[#1066DA]/25",
        cenarioAgressivo,
        pAgr,
        projecaoAgressiva,
      ),
    ]
  }, [
    cenarioConservador,
    cenarioModerado,
    cenarioAgressivo,
    aliquotaIR,
    inflacaoGlobal,
    projecaoConservadora,
    projecaoModerada,
    projecaoAgressiva,
  ])

  const dadosLinhaCenarios = useMemo(() => {
    const byIdade = new Map<number, LinhaCenarios>()
    const push = (idade: number, key: keyof Omit<LinhaCenarios, "idade">, value: number) => {
      const row = byIdade.get(idade) ?? { idade, conservador: 0, moderado: 0, agressivo: 0 }
      row[key] = value
      byIdade.set(idade, row)
    }

    for (const ano of projecaoConservadora) push(ano.idade, "conservador", Number(ano.saldoNominal) || 0)
    for (const ano of projecaoModerada) push(ano.idade, "moderado", Number(ano.saldoNominal) || 0)
    for (const ano of projecaoAgressiva) push(ano.idade, "agressivo", Number(ano.saldoNominal) || 0)

    return Array.from(byIdade.values()).sort((a, b) => a.idade - b.idade)
  }, [projecaoConservadora, projecaoModerada, projecaoAgressiva])

  const dadosLinhaCenariosDisplay = useMemo(() => {
    if (displayMode === "nominal") return dadosLinhaCenarios
    const deflatorPorIdade = (idade: number) => {
      const anos = Math.max(0, idade - idadeAtualCalculada)
      const inf = inflacaoGlobal / 100
      return Math.pow(1 + inf, anos)
    }
    return dadosLinhaCenarios.map((row) => {
      const d = deflatorPorIdade(row.idade)
      return {
        idade: row.idade,
        conservador: row.conservador / d,
        moderado: row.moderado / d,
        agressivo: row.agressivo / d,
      }
    })
  }, [dadosLinhaCenarios, displayMode, inflacaoGlobal, idadeAtualCalculada])

  const ToggleNominalReal = (
    <div className="flex items-center gap-3">
      <div className="inline-flex rounded-lg bg-card p-1">
        {(["nominal", "real"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setDisplayMode(m)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              displayMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            type="button"
          >
            {m === "nominal" ? "Nominal" : "Real"}
          </button>
        ))}
      </div>

      <div className={`text-xs font-medium uppercase tracking-wide ${displayMode === "real" ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
        INFLAÇÃO: <span className="text-foreground">{inflacaoGlobal}%</span>
      </div>
    </div>
  )

  return (
    <Card className="form-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium text-foreground">Cenários Alternativos de Investimento</CardTitle>
        <div className="flex items-center gap-3">
          {ToggleNominalReal}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCenarios((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
          >
            {showCenarios ? "Ocultar Cenários" : "Ver Cenários"}
          </Button>
        </div>
      </CardHeader>

      {showCenarios && (
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cenarios.map((c) => (
              <div key={c.key} className={`rounded-xl border p-5 ${c.corBg} ${c.corBorder}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
                      <p className="text-sm font-semibold text-foreground">{c.nome}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.sub}</p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    Volatilidade: <span className="text-foreground font-medium">{c.vol}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label className="field-label">Rentabilidade Bruta</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label="Informação sobre rentabilidade bruta"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent sideOffset={8} className="max-w-[280px]">
                        Rentabilidade bruta anual. O IR de {aliquotaIRPct}% sobre rendimentos é descontado
                        automaticamente no cálculo.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {editable ? (
                    <div className="relative">
                      <Input
                        type="number"
                        value={c.taxaBruta}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0
                          if (c.key === "conservador") setPremissas({ rentabilidadeConservador: v })
                          if (c.key === "moderado") setPremissas({ rentabilidadeModerado: v })
                          if (c.key === "agressivo") setPremissas({ rentabilidadeAgressivo: v })
                        }}
                        className="form-card text-foreground focus:border-primary pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">% a.a.</span>
                    </div>
                  ) : (
                    <div className="form-card px-3 py-2 text-sm text-foreground tabular-nums">
                      {c.taxaBruta}% a.a.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <EstrategiaRetiradaAposentadoria
            premissasCompletas={premissasCompletas}
            objetivosEngine={objetivosEngine}
            passivos={passivos}
            rentabilidadeLiquidaPct={rentabilidadeLiquidaDeBruta(cenarioModerado)}
            displayMode={displayMode}
            inflacaoGlobal={inflacaoGlobal}
            idadeAtualCalculada={idadeAtualCalculada}
            projecaoModerada={projecaoModerada}
            aliquotaIR={aliquotaIR}
            fmtFull={fmtFull}
            formatarMoeda={formatarMoeda}
          />

          <div className="rounded-xl border border-border bg-secondary overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comparação de Resultados</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 px-4 text-left field-label">
                      Métrica
                    </th>
                    {cenarios.map((c) => (
                      <th
                        key={c.key}
                        className="py-3 px-4 text-right field-label"
                      >
                        {c.nome}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      label: "Rentabilidade",
                      values: cenarios.map(
                        (c) => `${c.taxaBruta}% a.a. bruto (${fmtPct(c.taxaLiquida)}% líq.)`,
                      ),
                    },
                    {
                      label: "Patrimônio na Aposentadoria",
                      values: cenarios.map((c) =>
                        fmtFull(displayMode === "real" ? c.patrimonioApos / deflatorAposentadoria : c.patrimonioApos),
                      ),
                    },
                    {
                      label: "Renda Mensal na Aposentadoria (real)",
                      values: cenarios.map((c) => fmtFull(c.rendaMensalAposReal)),
                    },
                    { label: "Independência Financeira", values: cenarios.map((c) => (c.idadeIF ? `${c.idadeIF} anos` : "—")) },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-border last:border-b-0">
                      <td className="py-3 px-4 text-sm text-muted-foreground">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="py-3 px-4 text-right text-sm text-foreground tabular-nums">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-secondary p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Evolução Patrimonial Comparativa
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosLinhaCenariosDisplay} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis
                    dataKey="idade"
                    stroke="rgba(0,0,0,0.35)"
                    tick={{ fill: "var(--text-label)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="rgba(0,0,0,0.35)"
                    tick={{ fill: "var(--text-label)", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatarMoeda}
                  />
                  <RechartsTooltip
                    {...CHART_TOOLTIP_PROPS}
                    labelFormatter={(label) => `Idade: ${label} anos`}
                    formatter={(value: number) => fmtFull(value)}
                  />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value) => {
                      if (value === "conservador") return `Conservador (${cenarioConservador}% a.a.)`
                      if (value === "moderado") return `Moderado (${cenarioModerado}% a.a.)`
                      if (value === "agressivo") return `Agressivo (${cenarioAgressivo}% a.a.)`
                      return String(value)
                    }}
                  />
                  <Line type="monotone" dataKey="conservador" name="conservador" stroke="#1066DA" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="moderado" name="moderado" stroke="var(--accent)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="agressivo" name="agressivo" stroke="#1066DA" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

