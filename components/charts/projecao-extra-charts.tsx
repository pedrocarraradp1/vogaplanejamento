"use client"

import { useMemo } from "react"
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
} from "recharts"
import type { DadoFluxoGrafico, DadoRendaGrafico } from "@/lib/projecao-graficos-dados"

const CORES_FLUXO = {
  aporte: "#1E5CE6",
  rendimento: "#4A9EFF",
  previdencia: "#8B5CF6",
  inss: "#06B6D4",
  complemento: "#22C787",
  extra: "#34D399",
  objetivos: "#F5A623",
  dividas: "#FB923C",
  retirada: "#EF4444",
  ir: "#EC4899",
} as const

const ENTRADAS: { key: keyof typeof CORES_FLUXO; label: string }[] = [
  { key: "aporte", label: "Aporte" },
  { key: "rendimento", label: "Rendimento" },
  { key: "previdencia", label: "Previdência" },
  { key: "inss", label: "INSS" },
  { key: "complemento", label: "Complemento" },
  { key: "extra", label: "Extra" },
]

const SAIDAS: { key: keyof typeof CORES_FLUXO; label: string }[] = [
  { key: "objetivos", label: "Objetivos" },
  { key: "dividas", label: "Dívidas" },
  { key: "retirada", label: "Retirada" },
  { key: "ir", label: "IR" },
]

const CHART_HEIGHT = 280

interface ChartFormatters {
  formatarMoeda: (v: number) => string
  formatarMoedaCompleta: (v: number) => string
}

export function FluxoAnualChart({
  data,
  formatarMoeda,
  formatarMoedaCompleta,
}: { data: DadoFluxoGrafico[] } & ChartFormatters) {
  const dados = data ?? []
  const primeiroAno = dados[0]

  if (dados.length === 0) {
    return null
  }

  return (
    <div className="mt-8 w-full min-w-0 space-y-2">
      <h3 className="text-sm font-medium text-foreground">Fluxo Anual</h3>
      <div className="w-full min-w-0" style={{ height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={dados} margin={{ top: 28, right: 24, left: 8, bottom: 4 }} stackOffset="sign">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="idade"
              stroke="#4A5268"
              tick={{ fill: "#4A5268", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#4A5268"
              tick={{ fill: "#4A5268", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatarMoeda}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]?.payload as DadoFluxoGrafico
                const corLiq = p.fluxoLiquido >= 0 ? "#22C787" : "#EF4444"
                return (
                  <div className="rounded-lg border border-white/10 bg-[#131929] px-3 py-2 text-xs shadow-lg min-w-[200px]">
                    <p className="font-semibold text-white">
                      Ano {p.t} · Idade {p.idade}
                    </p>
                    <p className="text-muted-foreground mt-0.5">Fase: {p.fase}</p>
                    <p className="mt-2 text-white">Entradas: {formatarMoedaCompleta(p.entradasTotal)}</p>
                    <p className="text-white">Saídas: {formatarMoedaCompleta(Math.abs(p.saidasTotal))}</p>
                    <p className="mt-1 font-medium" style={{ color: corLiq }}>
                      Fluxo líquido: {formatarMoedaCompleta(p.fluxoLiquido)}
                    </p>
                  </div>
                )
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(value: string) => {
                const found = [...ENTRADAS, ...SAIDAS].find((s) => s.key === value)
                return found?.label ?? value
              }}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
            {ENTRADAS.map(({ key }) => (
              <Bar key={key} dataKey={key} stackId="fluxo" fill={CORES_FLUXO[key]} />
            ))}
            <Bar dataKey="objetivos" stackId="fluxo" fill={CORES_FLUXO.objetivos} name="objetivos" />
            <Bar dataKey="dividas" stackId="fluxo" fill={CORES_FLUXO.dividas} name="dividas" />
            <Bar dataKey="retirada" stackId="fluxo" fill={CORES_FLUXO.retirada} name="retirada" />
            <Bar dataKey="ir" stackId="fluxo" fill={CORES_FLUXO.ir} name="ir" />
            {primeiroAno && (
              <ReferenceDot
                x={primeiroAno.idade}
                y={primeiroAno.fluxoLiquido}
                r={0}
                label={{
                  value: formatarMoedaCompleta(primeiroAno.fluxoLiquido),
                  position: primeiroAno.fluxoLiquido >= 0 ? "top" : "bottom",
                  fill: primeiroAno.fluxoLiquido >= 0 ? "#22C787" : "#EF4444",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function RendaCarteiraChart({
  data,
  displayMode,
  formatarMoeda,
  formatarMoedaCompleta,
}: { data: DadoRendaGrafico[]; displayMode: "nominal" | "real" } & ChartFormatters) {
  const dados = data ?? []

  const areaIndependencia = useMemo(() => {
    const first = dados.find((d) => d.acimaMeta)
    if (!first) return null
    const last = dados[dados.length - 1]
    return { x1: first.idade, x2: last?.idade ?? first.idade }
  }, [dados])

  if (dados.length === 0) {
    return null
  }

  return (
    <div className="mt-8 w-full min-w-0 space-y-2">
      <h3 className="text-sm font-medium text-foreground">Renda Real da Carteira</h3>
      <div className="w-full min-w-0" style={{ height: CHART_HEIGHT, minHeight: CHART_HEIGHT }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={dados} margin={{ top: 16, right: 24, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="idade"
              stroke="#4A5268"
              tick={{ fill: "#4A5268", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#4A5268"
              tick={{ fill: "#4A5268", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatarMoeda}
            />
            {areaIndependencia && (
              <ReferenceArea
                x1={areaIndependencia.x1}
                x2={areaIndependencia.x2}
                fill="rgba(34,199,135,0.08)"
                strokeOpacity={0}
              />
            )}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]?.payload as DadoRendaGrafico
                const status = p.acimaMeta ? "Acima da meta" : "Abaixo da meta"
                const corStatus = p.acimaMeta ? "#22C787" : "#EF4444"
                return (
                  <div className="rounded-lg border border-white/10 bg-[#131929] px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-white">Idade {p.idade}</p>
                    <p className="mt-1 text-white">Renda nominal: {formatarMoedaCompleta(p.rendaNominal)}</p>
                    <p className="text-white/90">Renda real: {formatarMoedaCompleta(p.rendaPoderCompra)}</p>
                    <p className="text-white/80">Meta: {formatarMoedaCompleta(p.meta)}</p>
                    <p className="mt-1 font-medium" style={{ color: corStatus }}>
                      {status}
                    </p>
                  </div>
                )
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            {displayMode === "nominal" ? (
              <>
                <Line
                  type="monotone"
                  dataKey="rendaNominal"
                  name="Renda nominal"
                  stroke="#1E5CE6"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="rendaPoderCompra"
                  name="Poder de compra (hoje)"
                  stroke="#4A9EFF"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  isAnimationActive={false}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="rendaReal"
                name="Renda real (Fisher)"
                stroke="#1E5CE6"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )}
            <Line
              type="monotone"
              dataKey="meta"
              name="Meta aposentadoria"
              stroke="#EF4444"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
