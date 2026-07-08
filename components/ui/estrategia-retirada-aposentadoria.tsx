"use client"

import { useMemo, useState } from "react"
import { TrendingUp, ShieldCheck, TrendingDown } from "lucide-react"
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
import {
  calcularFluxoAnual,
  encontrarRendaDeConsumoMensalReal,
  encontrarRendaDePreservacaoMensalReal,
  projecaoEstrategiaRetirada,
  horizontePosAposentadoriaAnos,
  type Objetivo,
  type Passivo,
  type Premissas,
  type ProjecaoAno,
} from "@/lib/engine"
import { CHART_TOOLTIP_PROPS } from "@/lib/chart-tooltip"
import { VOGA } from "@/lib/voga-tokens"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"

const CENARIO_VERDE = "#1F6D3E"

type DisplayMode = "nominal" | "real"

export interface EstrategiaRetiradaAposentadoriaProps {
  premissasCompletas: Premissas
  objetivosEngine: Objetivo[]
  passivos: Passivo[]
  rentabilidadeLiquidaPct: number
  displayMode: DisplayMode
  inflacaoGlobal: number
  idadeAtualCalculada: number
  projecaoModerada: ProjecaoAno[]
  aliquotaIR: number
  fmtFull: (v: number) => string
  formatarMoeda: (v: number) => string
}

type EstrategiaKey = "acumulacao" | "preservacao" | "consumo"

function SparklinePatrimonio({
  data,
  color,
  alertaNoUltimoPonto = false,
}: {
  data: { patrimonio: number }[]
  color: string
  alertaNoUltimoPonto?: boolean
}) {
  if (data.length < 2) {
    return <div className="h-12 flex items-center text-xs text-muted-foreground">—</div>
  }

  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <Line
            type="monotone"
            dataKey="patrimonio"
            stroke={color}
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, index } = props
              if (cx == null || cy == null) return <g />
              const isLast = index === data.length - 1
              const fill = alertaNoUltimoPonto && isLast ? VOGA.alerta : color
              const r = isLast ? 3 : 0
              if (r === 0) return <g />
              return <circle cx={cx} cy={cy} r={r} fill={fill} stroke="none" />
            }}
            activeDot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EstrategiaRetiradaAposentadoria({
  premissasCompletas,
  objetivosEngine,
  passivos,
  rentabilidadeLiquidaPct,
  displayMode,
  inflacaoGlobal,
  idadeAtualCalculada,
  projecaoModerada,
  aliquotaIR: _aliquotaIR,
  fmtFull,
  formatarMoeda,
}: EstrategiaRetiradaAposentadoriaProps) {
  const [pctAcumulacao, setPctAcumulacao] = useState(70)

  const idadeApos = Number(premissasCompletas.idadeApos) || 0
  const horizonte = horizontePosAposentadoriaAnos(premissasCompletas)
  const taxaNominalAnual = Math.max(0, rentabilidadeLiquidaPct) / 100
  const inflacaoAnual = Math.max(0, inflacaoGlobal) / 100
  const taxaReal = (1 + taxaNominalAnual) / (1 + inflacaoAnual) - 1

  const premissasModerado = useMemo(
    () => ({
      ...premissasCompletas,
      rendimento: rentabilidadeLiquidaPct,
    }),
    [premissasCompletas, rentabilidadeLiquidaPct],
  )

  /**
   * Patrimônio REAL no INÍCIO da aposentadoria (antes da 1ª retirada) —
   * saldo do ano anterior, deflacionado. Mesma base do KPI de consumo.
   */
  const baseDecumulacao = useMemo(() => {
    const idxApos = projecaoModerada.findIndex((p) => p.idade === idadeApos)
    const saldoNominalInicioApos =
      idxApos > 0
        ? Number(projecaoModerada[idxApos - 1].saldoNominal) || 0
        : Number(premissasCompletas.saldoInicial) || 0
    const anos = Math.max(0, idadeApos - idadeAtualCalculada)
    const deflatorApos = Math.pow(1 + inflacaoAnual, anos)
    const patrimonioReal = saldoNominalInicioApos / deflatorApos

    // Fluxo nominal → real ano a ano (objetivos/passivos do motor; eternos já inclusos).
    const fluxo = calcularFluxoAnual(
      premissasModerado,
      objetivosEngine,
      passivos,
      0,
      "nominal",
    )
    const idxFluxo = fluxo.findIndex((r) => r.idade === idadeApos)
    const objetivosPorAnoReal: number[] = []
    const passivosPorAnoReal: number[] = []
    for (let ano = 0; ano < horizonte; ano++) {
      const row = idxFluxo >= 0 ? fluxo[idxFluxo + ano] : undefined
      const idade = idadeApos + ano
      const anosDef = Math.max(0, idade - idadeAtualCalculada)
      const deflator = Math.pow(1 + inflacaoAnual, anosDef)
      objetivosPorAnoReal.push(((Number(row?.objetivos) || 0) / deflator) || 0)
      passivosPorAnoReal.push(((Number(row?.dividas) || 0) / deflator) || 0)
    }

    // Mesma lógica do KPI: W tal que patrim. final ≈ inicial na decumulação
    // ano a ano (objetivos/dívidas reais do fluxo — sem média isolada).
    const rendaGeradaMensal = encontrarRendaDePreservacaoMensalReal({
      patrimonioRealInicioApos: patrimonioReal,
      taxaRealAnual: taxaReal,
      horizonteAnos: horizonte,
      objetivosPorAnoReal,
      passivosPorAnoReal,
      tolerancia: 1000,
    })

    const rendaConsumoMensal = encontrarRendaDeConsumoMensalReal({
      patrimonioRealInicioApos: patrimonioReal,
      taxaRealAnual: taxaReal,
      horizonteAnos: horizonte,
      objetivosFinitosPorAnoReal: objetivosPorAnoReal,
      passivosPorAnoReal,
      tolerancia: 1000,
    })

    return {
      patrimonioReal,
      objetivosPorAnoReal,
      passivosPorAnoReal,
      rendaGeradaMensal,
      rendaConsumoMensal,
    }
  }, [
    projecaoModerada,
    idadeApos,
    premissasCompletas.saldoInicial,
    idadeAtualCalculada,
    inflacaoAnual,
    premissasModerado,
    objetivosEngine,
    passivos,
    horizonte,
    taxaNominalAnual,
    taxaReal,
  ])

  const retiradas = useMemo(
    () => ({
      acumulacao: baseDecumulacao.rendaGeradaMensal * (pctAcumulacao / 100),
      preservacao: baseDecumulacao.rendaGeradaMensal,
      consumo: baseDecumulacao.rendaConsumoMensal,
    }),
    [baseDecumulacao, pctAcumulacao],
  )

  const projecoesEstrategia = useMemo(() => {
    // Sempre em poder de compra (real): Preservação flat e Consumo→0 são propriedades
    // do patrimônio REAL. Em nominal a Preservação “cresce” com a inflação e confunde.
    const run = (retirada: number) =>
      projecaoEstrategiaRetirada({
        patrimonioRealInicioApos: baseDecumulacao.patrimonioReal,
        taxaRealAnual: taxaReal,
        horizonteAnos: horizonte,
        idadeApos,
        retiradaMensalReal: retirada,
        objetivosPorAnoReal: baseDecumulacao.objetivosPorAnoReal,
        passivosPorAnoReal: baseDecumulacao.passivosPorAnoReal,
        inflacaoAnual,
        displayMode: "real",
      })
    return {
      acumulacao: run(retiradas.acumulacao),
      preservacao: run(retiradas.preservacao),
      consumo: run(retiradas.consumo),
    }
  }, [baseDecumulacao, taxaReal, horizonte, idadeApos, inflacaoAnual, retiradas])

  const toSerie = (rows: ProjecaoAno[]) =>
    rows.map((row) => ({
      idade: row.idade,
      patrimonio: Number(row.saldoReal) || 0,
    }))

  const series = useMemo(
    () => ({
      acumulacao: toSerie(projecoesEstrategia.acumulacao),
      preservacao: toSerie(projecoesEstrategia.preservacao),
      consumo: toSerie(projecoesEstrategia.consumo),
    }),
    [projecoesEstrategia],
  )

  const dadosComparativo = useMemo(() => {
    const byIdade = new Map<
      number,
      { idade: number; acumulacao: number; preservacao: number; consumo: number }
    >()
    const merge = (key: EstrategiaKey, pts: { idade: number; patrimonio: number }[]) => {
      for (const p of pts) {
        const row = byIdade.get(p.idade) ?? {
          idade: p.idade,
          acumulacao: 0,
          preservacao: 0,
          consumo: 0,
        }
        row[key] = p.patrimonio
        byIdade.set(p.idade, row)
      }
    }
    merge("acumulacao", series.acumulacao)
    merge("preservacao", series.preservacao)
    merge("consumo", series.consumo)
    return Array.from(byIdade.values()).sort((a, b) => a.idade - b.idade)
  }, [series])

  const estrategias: {
    key: EstrategiaKey
    titulo: string
    descricao: string
    icon: typeof TrendingUp
    cor: string
    retirada: number
    serie: { idade: number; patrimonio: number }[]
    destaque?: boolean
    alertaNoUltimoPonto?: boolean
    slider?: boolean
  }[] = [
    {
      key: "acumulacao",
      titulo: "Acumulação",
      descricao: "Retirada abaixo da perpetuidade — patrimônio cresce ao longo do horizonte.",
      icon: TrendingUp,
      cor: VOGA.brasilia,
      retirada: retiradas.acumulacao,
      serie: series.acumulacao,
      slider: true,
    },
    {
      key: "preservacao",
      titulo: "Preservação",
      descricao: "Renda gerada (perpetuidade) — patrimônio real estável.",
      icon: ShieldCheck,
      cor: VOGA.noite,
      retirada: retiradas.preservacao,
      serie: series.preservacao,
      destaque: true,
    },
    {
      key: "consumo",
      titulo: "Consumo",
      descricao: "Renda de consumo do patrimônio — patrimônio tende a zero no fim do horizonte.",
      icon: TrendingDown,
      cor: CENARIO_VERDE,
      retirada: retiradas.consumo,
      serie: series.consumo,
      alertaNoUltimoPonto: true,
    },
  ]

  const patrimonioFinal = (serie: { patrimonio: number }[]) =>
    serie.length > 0 ? serie[serie.length - 1].patrimonio : 0

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          Estratégia de retirada na aposentadoria
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Mesmo patrimônio na aposentadoria, rentabilidade do cenário moderado e horizonte de{" "}
          {horizonte} anos — apenas a retirada mensal muda (simulação de decumulação já validada).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {estrategias.map((e) => {
          const Icon = e.icon
          const final = patrimonioFinal(e.serie)
          return (
            <div
              key={e.key}
              className={`rounded-xl border bg-card p-5 ${
                e.destaque ? "border-2 border-[var(--cenario-1)]" : "border-border"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${e.cor}18`, color: e.cor }}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold text-foreground">{e.titulo}</h4>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{e.descricao}</p>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Retirada mensal</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">{fmtFull(e.retirada)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Patrimônio no fim do horizonte
                  </p>
                  <p className="text-sm font-medium tabular-nums text-foreground">{fmtFull(final)}</p>
                </div>

                <SparklinePatrimonio
                  data={e.serie}
                  color={e.cor}
                  alertaNoUltimoPonto={e.alertaNoUltimoPonto}
                />

                {e.slider && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs text-muted-foreground">
                        % da renda gerada (perpetuidade)
                      </Label>
                      <span className="text-xs font-medium tabular-nums text-foreground">{pctAcumulacao}%</span>
                    </div>
                    <Slider
                      value={[pctAcumulacao]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(v) => setPctAcumulacao(v[0] ?? 70)}
                      className="[&_[data-slot=slider-range]]:bg-[var(--voga-brasilia)] [&_[data-slot=slider-thumb]]:border-[var(--voga-brasilia)]"
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border border-border bg-secondary p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Comparativo de patrimônio — estratégias de retirada
          <span className="normal-case font-normal tracking-normal"> (poder de compra de hoje)</span>
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosComparativo} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
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
                  if (value === "acumulacao") return "Acumulação"
                  if (value === "preservacao") return "Preservação"
                  if (value === "consumo") return "Consumo"
                  return String(value)
                }}
              />
              <Line
                type="monotone"
                dataKey="acumulacao"
                name="acumulacao"
                stroke={VOGA.brasilia}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="preservacao"
                name="preservacao"
                stroke={VOGA.noite}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="consumo"
                name="consumo"
                stroke={CENARIO_VERDE}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
