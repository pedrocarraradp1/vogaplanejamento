"use client"

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import {
  TooltipFlutuante,
  useTooltipHover,
  type DetalheHover,
} from "@/components/charts/chart-tooltip"
import {
  CORES_FLUXO_CAIXA,
  type AnoProjecaoOrcada,
  type MesOrcadoVsRealizado,
  type MesRealizadoCalculado,
  deveMostrarRotuloAno,
} from "@/lib/fluxo-caixa-utils"

const CHART_HEIGHT = 240
const PLOT_HEIGHT = 168
const LEFT_AXIS_WIDTH = 56
const RIGHT_AXIS_WIDTH = 76
const P3_CHART_HEIGHT = 196
const P3_PLOT_HEIGHT = 160

export function GraficoRealizadoMensal({
  dados,
  formatBRL,
  onHoverMes,
  getDetalhes,
}: {
  dados: MesRealizadoCalculado[]
  formatBRL: (v: number) => string
  onHoverMes: (idx: number | null) => void
  getDetalhes: (d: MesRealizadoCalculado) => DetalheHover[]
}) {
  const { containerRef, hoveredIdx, tooltipPos, updateTooltip, handleLeave } = useTooltipHover(onHoverMes)

  const maxPos = Math.max(1, ...dados.map((d) => d.rentabilidade + d.receita))
  const maxNeg = Math.max(1, ...dados.map((d) => d.despesa))
  const posZoneRatio = maxPos / (maxPos + maxNeg)
  const posZoneHeight = PLOT_HEIGHT * posZoneRatio
  const negZoneHeight = PLOT_HEIGHT * (1 - posZoneRatio)

  const saldoMin = Math.min(0, ...dados.map((d) => d.saldoAcumulado))
  const saldoMax = Math.max(0, ...dados.map((d) => d.saldoAcumulado))
  const saldoRange = saldoMax - saldoMin || 1

  const posTicks = [1, 0.75, 0.5, 0.25, 0].map((pct) => ({
    value: maxPos * pct,
    y: posZoneHeight * (1 - pct),
  }))
  const negTicks =
    maxNeg > 0
      ? [0.25, 0.5, 0.75, 1].map((pct) => ({
          value: maxNeg * pct,
          y: posZoneHeight + pct * negZoneHeight,
        }))
      : []

  const saldoTickValues = Array.from(
    new Set(
      [saldoMax, saldoMin, saldoMin < 0 && saldoMax > 0 ? 0 : null].filter(
        (v): v is number => v !== null,
      ),
    ),
  ).sort((a, b) => b - a)

  const saldoTicks = saldoTickValues.map((value) => ({
    value,
    y: ((saldoMax - value) / saldoRange) * PLOT_HEIGHT,
  }))

  const gridTicks = [
    ...posTicks.filter((t) => t.value > 0),
    { value: 0, y: posZoneHeight },
    ...negTicks,
  ]

  const hovered = hoveredIdx !== null ? dados[hoveredIdx] : null
  const detalhes = hovered ? getDetalhes(hovered) : undefined

  const saldoLinePoints = dados.map((d, i) => {
    const xPct = ((i + 0.5) / dados.length) * 100
    const yInPlot = ((saldoMax - d.saldoAcumulado) / saldoRange) * PLOT_HEIGHT
    return `${xPct},${yInPlot}`
  }).join(" ")

  return (
    <div
      ref={containerRef}
      className="w-full min-w-0 relative"
      style={{ height: CHART_HEIGHT }}
      onMouseLeave={handleLeave}
    >
      <div style={{ display: "flex", height: PLOT_HEIGHT }}>
        {/* Eixo primário (esquerda) */}
        <div
          style={{
            width: LEFT_AXIS_WIDTH,
            flexShrink: 0,
            position: "relative",
            pointerEvents: "none",
          }}
        >
          {posTicks.map((tick) => (
            <span
              key={`pos-${tick.value}`}
              style={{
                position: "absolute",
                right: 4,
                top: tick.y,
                transform: "translateY(-50%)",
                fontSize: 9,
                color: "#6B7280",
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {formatBRL(tick.value)}
            </span>
          ))}
          {negTicks.map((tick) => (
            <span
              key={`neg-${tick.value}`}
              style={{
                position: "absolute",
                right: 4,
                top: tick.y,
                transform: "translateY(-50%)",
                fontSize: 9,
                color: "#6B7280",
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {formatBRL(-tick.value)}
            </span>
          ))}
        </div>

        {/* Área do plot */}
        <div style={{ flex: 1, minWidth: 0, position: "relative", height: "100%" }}>
          {/* Grade horizontal */}
          {gridTicks.map((tick) => (
            <div
              key={`grid-${tick.value}-${tick.y}`}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: tick.y,
                height: tick.value === 0 ? 1 : 1,
                background: tick.value === 0 ? "rgba(0,0,0,0.22)" : "rgba(0,0,0,0.06)",
                pointerEvents: "none",
              }}
            />
          ))}

          {/* Linha saldo acumulado */}
          <svg
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              height: PLOT_HEIGHT,
              pointerEvents: "none",
              overflow: "visible",
            }}
            viewBox={`0 0 100 ${PLOT_HEIGHT}`}
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke={CORES_FLUXO_CAIXA.saldoAcumulado}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              points={saldoLinePoints}
            />
          </svg>

          {/* Barras mensais */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              height: "100%",
              position: "relative",
            }}
          >
            {dados.map((d, i) => {
              const hRent = (d.rentabilidade / maxPos) * posZoneHeight
              const hRec = (d.receita / maxPos) * posZoneHeight
              const hDesp = (d.despesa / maxNeg) * negZoneHeight

              return (
                <div
                  key={d.label}
                  className="mes-coluna"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: "100%",
                    position: "relative",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => updateTooltip(i, e.clientX, e.clientY)}
                  onMouseMove={(e) => updateTooltip(i, e.clientX, e.clientY)}
                >
                  <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                    {d.receita > 0 ? (
                      <div
                        style={{
                          position: "absolute",
                          left: 2,
                          right: 2,
                          top: posZoneHeight - hRec,
                          height: hRec,
                          background: CORES_FLUXO_CAIXA.receita,
                          borderRadius: d.rentabilidade <= 0 ? "3px 3px 0 0" : 0,
                        }}
                      />
                    ) : null}
                    {d.rentabilidade > 0 ? (
                      <div
                        style={{
                          position: "absolute",
                          left: 2,
                          right: 2,
                          top: posZoneHeight - hRec - hRent,
                          height: hRent,
                          background: CORES_FLUXO_CAIXA.rentabilidade,
                          borderRadius: "3px 3px 0 0",
                        }}
                      />
                    ) : null}
                    {d.despesa > 0 ? (
                      <div
                        style={{
                          position: "absolute",
                          left: 2,
                          right: 2,
                          top: posZoneHeight,
                          height: hDesp,
                          background: CORES_FLUXO_CAIXA.despesa,
                          borderRadius: "0 0 3px 3px",
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Eixo secundário (direita) — saldo acumulado */}
        <div
          style={{
            width: RIGHT_AXIS_WIDTH,
            flexShrink: 0,
            position: "relative",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              position: "absolute",
              right: 0,
              top: -2,
              fontSize: 8,
              fontWeight: 600,
              color: CORES_FLUXO_CAIXA.saldoAcumulado,
              whiteSpace: "nowrap",
              textAlign: "right",
              width: "100%",
            }}
          >
            Saldo acumulado
          </span>
          {saldoTicks.map((tick) => (
            <span
              key={`saldo-${tick.value}`}
              style={{
                position: "absolute",
                left: 4,
                top: tick.y,
                transform: "translateY(-50%)",
                fontSize: 9,
                color: CORES_FLUXO_CAIXA.saldoAcumulado,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {formatBRL(tick.value)}
            </span>
          ))}
        </div>
      </div>

      {/* Rótulos dos meses */}
      <div
        style={{
          display: "flex",
          marginTop: 6,
          height: 20,
          paddingLeft: LEFT_AXIS_WIDTH,
          paddingRight: RIGHT_AXIS_WIDTH,
        }}
      >
        {dados.map((d) => (
          <div
            key={`lbl-${d.label}`}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 11,
              color: "#6B7280",
            }}
          >
            {d.label}
          </div>
        ))}
      </div>

      {/* Tooltip — só no hover */}
      {hovered && tooltipPos ? (
        <TooltipFlutuante
          pos={tooltipPos}
          titulo={formatBRL(hovered.fluxoLiquido)}
          subtitulo={`Fluxo líquido em ${hovered.labelCompleto}`}
          detalhes={detalhes}
        />
      ) : null}
    </div>
  )
}

export function GraficoOrcadoVsRealizado({
  dados,
  formatBRL,
}: {
  dados: MesOrcadoVsRealizado[]
  formatBRL: (v: number) => string
}) {
  const { containerRef, hoveredIdx, tooltipPos, updateTooltip, handleLeave } = useTooltipHover()
  const hovered = hoveredIdx !== null ? dados[hoveredIdx] : null

  const CHART_MARGIN = { top: 8, right: 16, left: 8, bottom: 4 }
  const plotTop = CHART_MARGIN.top
  const plotBottom = 28
  const plotHeight = CHART_HEIGHT - plotTop - plotBottom

  return (
    <div
      ref={containerRef}
      className="w-full min-w-0 relative"
      style={{ height: CHART_HEIGHT }}
      onMouseLeave={handleLeave}
    >
      <div style={{ pointerEvents: "none" }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <ComposedChart data={dados} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "#6B7280", fontSize: 11 }}
              axisLine={{ stroke: "rgba(0,0,0,0.1)" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#6B7280", fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatBRL(v).replace("R$", "").trim()}
            />
            <Line
              type="monotone"
              dataKey="orcadoAcumulado"
              stroke={CORES_FLUXO_CAIXA.orcado}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="realizadoAcumulado"
              stroke={CORES_FLUXO_CAIXA.realizado}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Overlay de hover — coluna inteira por mês */}
      <div
        style={{
          position: "absolute",
          left: CHART_MARGIN.left,
          right: CHART_MARGIN.right,
          top: plotTop,
          height: plotHeight,
          display: "flex",
        }}
      >
        {dados.map((d, i) => (
          <div
            key={d.label}
            className="mes-coluna"
            style={{ flex: 1, minWidth: 0, height: "100%", cursor: "default" }}
            onMouseEnter={(e) => updateTooltip(i, e.clientX, e.clientY)}
            onMouseMove={(e) => updateTooltip(i, e.clientX, e.clientY)}
          />
        ))}
      </div>

      {hovered && tooltipPos ? (
        <TooltipFlutuante
          pos={tooltipPos}
          titulo={formatBRL(hovered.realizadoAcumulado)}
          subtitulo={hovered.labelCompleto}
          detalhes={[
            {
              id: "o",
              label: "Orçado",
              valor: formatBRL(hovered.orcadoAcumulado),
              fill: CORES_FLUXO_CAIXA.orcado,
            },
            {
              id: "r",
              label: "Realizado",
              valor: formatBRL(hovered.realizadoAcumulado),
              fill: CORES_FLUXO_CAIXA.realizado,
            },
            {
              id: "d",
              label: "Diferença",
              valor: formatBRL(hovered.diferenca),
              fill:
                hovered.diferenca >= 0 ? CORES_FLUXO_CAIXA.diffPositiva : CORES_FLUXO_CAIXA.diffNegativa,
              valorColor:
                hovered.diferenca >= 0 ? CORES_FLUXO_CAIXA.diffPositiva : CORES_FLUXO_CAIXA.diffNegativa,
            },
          ]}
        />
      ) : null}
    </div>
  )
}

export function GraficoProjecaoAnual({
  dados,
  formatBRL,
  anoInicio,
  anoFim,
  stepAnos,
}: {
  dados: AnoProjecaoOrcada[]
  formatBRL: (v: number) => string
  anoInicio: number
  anoFim: number
  stepAnos: number
}) {
  const { containerRef, hoveredIdx, tooltipPos, updateTooltip, handleLeave } = useTooltipHover()
  const hovered = hoveredIdx !== null ? dados[hoveredIdx] : null

  const maxAbs = Math.max(1, ...dados.map((r) => Math.max(r.entradasTotal, r.saidasTotal)))
  const posZoneHeight = P3_PLOT_HEIGHT / 2
  const negZoneHeight = P3_PLOT_HEIGHT / 2

  const detalhesP3 = hovered
    ? (
        [
          { id: "rent", label: "Rentabilidade", v: hovered.categorias.rentabilidade, fill: CORES_FLUXO_CAIXA.rentabilidade },
          { id: "ap", label: "Aportes", v: hovered.categorias.aportes, fill: CORES_FLUXO_CAIXA.aportes },
          { id: "pass", label: "Passivos", v: hovered.categorias.passivos, fill: CORES_FLUXO_CAIXA.passivos },
          { id: "obj", label: "Objetivos", v: hovered.categorias.objetivos, fill: CORES_FLUXO_CAIXA.objetivos },
          { id: "out", label: "Outros", v: hovered.categorias.outros, fill: CORES_FLUXO_CAIXA.outros },
        ] as const
      )
        .filter((d) => d.v > 0)
        .map((d) => ({ id: d.id, label: d.label, valor: formatBRL(d.v), fill: d.fill }))
    : undefined

  return (
    <div
      ref={containerRef}
      className="w-full min-w-0 relative"
      style={{ height: P3_CHART_HEIGHT }}
      onMouseLeave={handleLeave}
    >
      <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: P3_PLOT_HEIGHT }}>
        {dados.map((row, i) => {
          const mostrarAno = deveMostrarRotuloAno(row.ano, anoInicio, anoFim, stepAnos)
          const ent = row.entradasTotal
          const sai = row.saidasTotal
          const temDados = ent > 0 || sai > 0

          const entradas = [
            { id: "rent", valor: row.categorias.rentabilidade, fill: CORES_FLUXO_CAIXA.rentabilidade },
            { id: "ap", valor: row.categorias.aportes, fill: CORES_FLUXO_CAIXA.aportes },
          ].filter((s) => s.valor > 0)

          const saidas = [
            { id: "pass", valor: row.categorias.passivos, fill: CORES_FLUXO_CAIXA.passivos },
            { id: "obj", valor: row.categorias.objetivos, fill: CORES_FLUXO_CAIXA.objetivos },
            { id: "out", valor: row.categorias.outros, fill: CORES_FLUXO_CAIXA.outros },
          ].filter((s) => s.valor > 0)

          return (
            <div
              key={row.ano}
              className="ano-coluna"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 0,
                height: "100%",
                justifyContent: "center",
                cursor: "default",
              }}
              onMouseEnter={(e) => updateTooltip(i, e.clientX, e.clientY)}
              onMouseMove={(e) => updateTooltip(i, e.clientX, e.clientY)}
            >
              <div
                style={{
                  flex: 1,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  pointerEvents: "none",
                }}
              >
                {temDados ? (
                  <>
                    <div style={{ height: posZoneHeight, position: "relative" }}>
                      {(() => {
                        let offset = 0
                        return entradas.map((s, idx) => {
                          const h = (s.valor / maxAbs) * posZoneHeight
                          const top = posZoneHeight - offset - h
                          offset += h
                          return (
                            <div
                              key={s.id}
                              style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                top,
                                height: h,
                                background: s.fill,
                                borderRadius: idx === entradas.length - 1 ? "3px 3px 0 0" : 0,
                              }}
                            />
                          )
                        })
                      })()}
                    </div>
                    <div style={{ height: 1, background: "rgba(0,0,0,0.15)", width: "100%" }} />
                    <div style={{ height: negZoneHeight, position: "relative" }}>
                      {(() => {
                        let offset = 0
                        return saidas.map((s, idx) => {
                          const h = (s.valor / maxAbs) * negZoneHeight
                          const top = offset
                          offset += h
                          return (
                            <div
                              key={s.id}
                              style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                top,
                                height: h,
                                background: s.fill,
                                borderRadius: idx === saidas.length - 1 ? "0 0 3px 3px" : 0,
                              }}
                            />
                          )
                        })
                      })()}
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: 4,
                      background: "var(--border, #D9D9D9)",
                      borderRadius: 2,
                      margin: "auto 0",
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  marginTop: 8,
                  fontSize: 10,
                  color: "#6B7280",
                  visibility: mostrarAno ? "visible" : "hidden",
                  height: 14,
                  pointerEvents: "none",
                }}
              >
                {mostrarAno ? row.ano : "\u00A0"}
              </span>
            </div>
          )
        })}
      </div>

      {hovered && tooltipPos ? (
        <TooltipFlutuante
          pos={tooltipPos}
          titulo={formatBRL(hovered.fluxoLiquido)}
          subtitulo={`Saldo líquido em ${hovered.ano}`}
          detalhes={detalhesP3}
        />
      ) : null}
    </div>
  )
}

export interface CategoriaLegenda {
  id: string
  label: string
  fill: string
  dashed?: boolean
}

export function LegendaFluxo({ itens }: { itens: CategoriaLegenda[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 16px", marginBottom: 12 }}>
      {itens.map((item) => (
        <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: item.dashed ? 18 : 10,
              height: item.dashed ? 0 : 10,
              borderRadius: item.dashed ? 0 : 2,
              background: item.dashed ? "transparent" : item.fill,
              border: item.dashed ? `2px dashed ${item.fill}` : "none",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, color: "#4B5563" }}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
