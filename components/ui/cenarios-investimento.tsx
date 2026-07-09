"use client"

import { useMemo, useState } from "react"
import { Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { usePlano } from "@/lib/plano-context"
import { calcularProjecao, encontrarIdadeLiberdadeFinanceira } from "@/lib/engine"
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
import { TabelaComparacaoCenarios } from "@/components/ui/tabela-comparacao-cenarios"
import { CenarioSecaoBox } from "@/components/ui/cenario-secao-box"
import { buildDadosLinhaCenarios, useDadosCenarios } from "@/lib/use-dados-cenarios"
import { cn } from "@/lib/utils"

type DisplayMode = "nominal" | "real"

export interface CenariosInvestimentoProps {
  /** Se omitido, o componente mantém estado interno. */
  displayMode?: DisplayMode
  onDisplayModeChange?: (mode: DisplayMode) => void
  /** Se false, exibe rentabilidades como texto (sem inputs). Default: true */
  editable?: boolean
  /** `resumo`: só perfis de rentabilidade (Plano Financeiro Completo). */
  layout?: "full" | "resumo"
  className?: string
}

export function CenariosInvestimento(props: CenariosInvestimentoProps) {
  const { setPremissas } = usePlano()
  const dados = useDadosCenarios()
  const {
    premissas,
    cenarioConservador,
    cenarioModerado,
    cenarioAgressivo,
    aliquotaIR,
    inflacaoGlobal,
    idadeAtualCalculada,
    objetivosEngine,
    projecaoConservadora,
    projecaoModerada,
    projecaoAgressiva,
    rentabilidadeLiquidaDeBruta,
    fmtFull,
    formatarMoeda,
  } = dados

  const [showCenarios, setShowCenarios] = useState(true)
  const editable = props.editable ?? true
  const layout = props.layout ?? "full"
  const resumo = layout === "resumo"

  const aliquotaIRPct = Math.round(aliquotaIR * 100)
  const fmtPct = (v: number) => v.toFixed(1).replace(".", ",")

  const [displayModeInternal, setDisplayModeInternal] = useState<DisplayMode>("real")
  const displayMode = props.displayMode ?? displayModeInternal
  const setDisplayMode = props.onDisplayModeChange ?? setDisplayModeInternal

  const anosAteAposentadoria = Math.max(0, (premissas.idadeApos || 0) - idadeAtualCalculada)
  const retiradaDesejada = premissas.retiradaMensal ?? 0
  const rendimentoBrutoPlano = Number(premissas.rendimentoBruto) || 0
  const moderadoCoincideComPlano = Math.abs(cenarioModerado - rendimentoBrutoPlano) < 1e-9

  const deflatorAposentadoria = useMemo(() => {
    const inf = inflacaoGlobal / 100
    return Math.pow(1 + inf, anosAteAposentadoria)
  }, [inflacaoGlobal, anosAteAposentadoria])

  const patrimonioNaIdadeApos = (projecaoLocal: ReturnType<typeof calcularProjecao>) => {
    const row = projecaoLocal.find((p) => p.idade === premissas.idadeApos)
    return {
      nominal: Number(row?.saldoNominal) || 0,
      real: Number(row?.saldoReal) || 0,
    }
  }

  const inflacaoAnual = inflacaoGlobal / 100

  const rendaMensalRealNaApos = (patrimonioReal: number, taxaLiquidaPct: number) => {
    const taxaNominalAnual = Math.max(0, (Number(taxaLiquidaPct) || 0) / 100)
    const taxaReal = (1 + taxaNominalAnual) / (1 + inflacaoAnual) - 1
    const taxaRealMensal = Math.pow(1 + Math.max(0, taxaReal), 1 / 12) - 1
    return Math.max(0, Math.max(0, patrimonioReal) * taxaRealMensal)
  }

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
      projecaoLocal: ReturnType<typeof calcularProjecao>,
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
        idadeIF: encontrarIdadeLiberdadeFinanceira(
          projecaoLocal,
          taxaLiquida,
          inflacaoGlobal,
          retiradaDesejada,
          objetivosEngine,
        ),
      }
    }

    return [
      build(
        "conservador",
        "Conservador",
        "Maior previsibilidade",
        "Baixa",
        "#1F6D3E",
        "bg-[rgba(31,109,62,0.06)]",
        "border-[#1F6D3E]/25",
        cenarioConservador,
        pCon,
        projecaoConservadora,
      ),
      build(
        "moderado",
        "Moderado",
        "Equilíbrio risco/retorno",
        "Média",
        "#1066DA",
        "bg-[rgba(16,102,218,0.06)]",
        "border-[#1066DA]/25",
        cenarioModerado,
        pMod,
        projecaoModerada,
      ),
      build(
        "agressivo",
        "Agressivo",
        "Maior retorno esperado",
        "Alta",
        "#01121E",
        "bg-[rgba(1,18,30,0.06)]",
        "border-[#01121E]/25",
        cenarioAgressivo,
        pAgr,
        projecaoAgressiva,
      ),
    ]
  }, [
    cenarioConservador,
    cenarioModerado,
    cenarioAgressivo,
    inflacaoGlobal,
    retiradaDesejada,
    objetivosEngine,
    projecaoConservadora,
    projecaoModerada,
    projecaoAgressiva,
    rentabilidadeLiquidaDeBruta,
  ])

  const dadosLinhaCenarios = useMemo(
    () => buildDadosLinhaCenarios(projecaoConservadora, projecaoModerada, projecaoAgressiva),
    [projecaoConservadora, projecaoModerada, projecaoAgressiva],
  )

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

      <div
        className={`text-xs font-medium uppercase tracking-wide ${
          displayMode === "real" ? "text-muted-foreground" : "text-muted-foreground/60"
        }`}
      >
        INFLAÇÃO: <span className="text-foreground">{inflacaoGlobal}%</span>
      </div>
    </div>
  )

  const headerRight = (
    <div className="flex items-center gap-3">
      {ToggleNominalReal}
      {!resumo ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCenarios((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
        >
          {showCenarios ? "Ocultar Cenários" : "Ver Cenários"}
        </Button>
      ) : null}
    </div>
  )

  if (!showCenarios) {
    return (
      <CenarioSecaoBox
        title="Cenários alternativos de investimento"
        headerRight={headerRight}
        className={cn(props.className)}
      >
        <p className="text-sm text-muted-foreground">Cenários ocultos.</p>
      </CenarioSecaoBox>
    )
  }

  return (
    <CenarioSecaoBox
      title="Cenários alternativos de investimento"
      headerRight={headerRight}
      className={cn(props.className)}
    >
      <div className="space-y-6">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Comparação ilustrativa com três rentabilidades brutas alternativas ( Conservador / Moderado / Agressivo),
          reutilizando aporte, objetivos e renda desejada do plano.{" "}
          {moderadoCoincideComPlano ? (
            <>
              O perfil Moderado ({cenarioModerado}% a.a. bruto) coincide com a rentabilidade das Premissas — a linha
              Liberdade Financeira dessa coluna deve bater com o KPI da Projeção.
            </>
          ) : (
            <>
              O Moderado usa {cenarioModerado}% a.a. bruto; as Premissas do cliente estão em {rendimentoBrutoPlano}% a.a.
              bruto — números de Liberdade Financeira só coincidem com o KPI quando essas taxas forem iguais.
            </>
          )}
        </p>

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
                      Rentabilidade bruta anual. O IR de {aliquotaIRPct}% sobre rendimentos é descontado automaticamente
                      no cálculo.
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
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      % a.a.
                    </span>
                  </div>
                ) : (
                  <div className="form-card px-3 py-2 text-sm text-foreground tabular-nums">{c.taxaBruta}% a.a.</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {!resumo ? (
          <>
            <div className="rounded-xl border border-border bg-secondary overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Comparação de Resultados
                </p>
              </div>
              <TabelaComparacaoCenarios
                colunas={cenarios.map((c) => ({ key: c.key, nome: c.nome }))}
                linhas={[
                  {
                    label: "Rentabilidade",
                    values: cenarios.map((c) => `${c.taxaBruta}% a.a. bruto (${fmtPct(c.taxaLiquida)}% líq.)`),
                  },
                  {
                    label: "Patrimônio na Aposentadoria",
                    values: cenarios.map((c) =>
                      fmtFull(
                        displayMode === "real" ? c.patrimonioApos / deflatorAposentadoria : c.patrimonioApos,
                      ),
                    ),
                  },
                  {
                    label: "Renda Mensal na Aposentadoria (real)",
                    values: cenarios.map((c) => fmtFull(c.rendaMensalAposReal)),
                  },
                  {
                    label: "Liberdade Financeira",
                    values: cenarios.map((c) => (c.idadeIF ? `${c.idadeIF} anos` : "—")),
                  },
                ]}
              />
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
                    <Line
                      type="monotone"
                      dataKey="conservador"
                      name="conservador"
                      stroke="#1F6D3E"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="moderado"
                      name="moderado"
                      stroke="#1066DA"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="agressivo"
                      name="agressivo"
                      stroke="#01121E"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </CenarioSecaoBox>
  )
}
