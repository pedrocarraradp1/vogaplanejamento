"use client"

import { useRef, useState } from "react"
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"
import { CORES_FLUXO_CAIXA, type MesRealizadoCalculado } from "@/lib/fluxo-caixa-utils"

const CHART_HEIGHT = 220
const PLOT_HEIGHT = 168

type DetalheHover = { id: string; label: string; valor: string; fill: string; valorColor?: string }

function segmentHeights(values: number[], total: number, zoneHeight: number): number[] {
  if (total <= 0) return values.map(() => 0)
  const raw = values.map((v) => Math.max(0, (v / total) * zoneHeight))
  if (raw.length === 0) return raw
  const used = raw.slice(0, -1).reduce((s, h) => s + h, 0)
  raw[raw.length - 1] = Math.max(0, zoneHeight - used)
  return raw
}

export function GraficoRealizadoMensal({
  dados,
  formatBRL,
  onHoverMes,
  valorPadrao,
  subtituloPadrao,
  getDetalhes,
}: {
  dados: MesRealizadoCalculado[]
  formatBRL: (v: number) => string
  onHoverMes: (idx: number | null) => void
  valorPadrao: string
  subtituloPadrao: string
  getDetalhes: (d: MesRealizadoCalculado) => DetalheHover[]
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  const maxPos = Math.max(1, ...dados.map((d) => d.rentabilidade + d.receita))
  const maxNeg = Math.max(1, ...dados.map((d) => d.despesa))
  const posZoneRatio = maxPos / (maxPos + maxNeg)
  const posZoneHeight = PLOT_HEIGHT * posZoneRatio
  const negZoneHeight = PLOT_HEIGHT * (1 - posZoneRatio)

  const saldoMin = Math.min(0, ...dados.map((d) => d.saldoAcumulado))
  const saldoMax = Math.max(0, ...dados.map((d) => d.saldoAcumulado))
  const saldoRange = saldoMax - saldoMin || 1

  const updateTooltip = (idx: number | null, clientX: number, clientY: number) => {
    const el = containerRef.current
    if (!el || idx === null) {
      setHoveredIdx(null)
      setTooltipPos(null)
      onHoverMes(null)
      return
    }
    const rect = el.getBoundingClientRect()
    setHoveredIdx(idx)
    setTooltipPos({ x: clientX - rect.left, y: clientY - rect.top })
    onHoverMes(idx)
  }

  const handleLeave = () => {
    setHoveredIdx(null)
    setTooltipPos(null)
    onHoverMes(null)
  }

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
      {/* Eixo secundário — saldo acumulado */}
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: PLOT_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          fontSize: 10,
          color: CORES_FLUXO_CAIXA.saldoAcumulado,
          paddingLeft: 4,
          pointerEvents: "none",
        }}
      >
        <span>{formatBRL(saldoMax).replace("R$", "").trim()}</span>
        <span>{formatBRL(saldoMin).replace("R$", "").trim()}</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          height: PLOT_HEIGHT,
          paddingRight: 44,
          position: "relative",
        }}
      >
        {/* Linha saldo acumulado (SVG) */}
        <svg
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "calc(100% - 44px)",
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

        {dados.map((d, i) => {
          const posTotal = d.rentabilidade + d.receita
          const posBarH = (posTotal / maxPos) * posZoneHeight
          const negBarH = (d.despesa / maxNeg) * negZoneHeight
          const [hRent, hRec] = segmentHeights(
            [d.rentabilidade, d.receita],
            posTotal,
            posBarH,
          )

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
              {/* Zona positiva (acima da baseline) */}
              <div
                style={{
                  position: "absolute",
                  left: 2,
                  right: 2,
                  top: 0,
                  height: posZoneHeight,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-end",
                  pointerEvents: "none",
                }}
              >
                {posTotal > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    {d.rentabilidade > 0 ? (
                      <div
                        style={{
                          height: hRent,
                          background: CORES_FLUXO_CAIXA.rentabilidade,
                          borderRadius: hRec <= 0 ? "3px 3px 0 0" : 0,
                        }}
                      />
                    ) : null}
                    {d.receita > 0 ? (
                      <div
                        style={{
                          height: hRec,
                          background: CORES_FLUXO_CAIXA.receita,
                          borderRadius: "3px 3px 0 0",
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>

              {/* Linha de zero */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: posZoneHeight,
                  height: 1,
                  background: "rgba(0,0,0,0.2)",
                  pointerEvents: "none",
                }}
              />

              {/* Zona negativa (abaixo da baseline) */}
              <div
                style={{
                  position: "absolute",
                  left: 2,
                  right: 2,
                  top: posZoneHeight + 1,
                  height: negZoneHeight,
                  pointerEvents: "none",
                }}
              >
                {d.despesa > 0 ? (
                  <div
                    style={{
                      height: negBarH,
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

      {/* Rótulos dos meses */}
      <div
        style={{
          display: "flex",
          paddingRight: 44,
          marginTop: 6,
          height: 20,
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

      {/* Tooltip flutuante — mesmo nó, só atualiza posição e texto */}
      {hovered && tooltipPos ? (
        <div
          style={{
            position: "absolute",
            left: tooltipPos.x,
            top: tooltipPos.y,
            transform: "translate(-50%, calc(-100% - 12px))",
            pointerEvents: "none",
            zIndex: 20,
            minWidth: 200,
            maxWidth: 280,
            padding: "10px 14px",
            background: "#fff",
            borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: "#1A1A1A",
              fontVariantNumeric: "tabular-nums",
              textAlign: "center",
            }}
          >
            {formatBRL(hovered.fluxoLiquido)}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6B7280", textAlign: "center" }}>
            Fluxo líquido em {hovered.labelCompleto}
          </p>
          {detalhes && detalhes.length > 0 ? (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
              {detalhes.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: 11,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: item.fill,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: "#374151" }}>{item.label}</span>
                  </div>
                  <span
                    style={{
                      fontWeight: 600,
                      color: item.valorColor ?? "#1A1A1A",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {item.valor}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 8,
            transform: "translateX(-50%)",
            pointerEvents: "none",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1A1A1A" }}>{valorPadrao}</p>
          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#6B7280" }}>{subtituloPadrao}</p>
        </div>
      )}
    </div>
  )
}

export function GraficoOrcadoVsRealizado({
  dados,
  formatBRL,
  onHoverMes,
}: {
  dados: Array<{
    label: string
    orcadoAcumulado: number
    realizadoAcumulado: number
  }>
  formatBRL: (v: number) => string
  onHoverMes: (idx: number | null) => void
}) {
  return (
    <div className="w-full min-w-0" style={{ height: CHART_HEIGHT }}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        <ComposedChart
          data={dados}
          margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
          onMouseMove={(state) => {
            const idx = state?.activeTooltipIndex
            onHoverMes(typeof idx === "number" ? idx : null)
          }}
          onMouseLeave={() => onHoverMes(null)}
        >
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

export function DestaqueHover({
  valor,
  subtitulo,
  detalhes,
  subtituloColor,
}: {
  valor: string
  subtitulo: string
  subtituloColor?: string
  detalhes?: Array<{ id: string; label: string; valor: string; fill: string; valorColor?: string }>
}) {
  return (
    <div style={{ textAlign: "center", marginBottom: 12, minHeight: detalhes?.length ? 100 : 52 }}>
      <p
        style={{
          margin: 0,
          fontSize: 22,
          fontWeight: 700,
          color: "#1A1A1A",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {valor}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12, color: subtituloColor ?? "#6B7280" }}>{subtitulo}</p>
      {detalhes && detalhes.length > 0 ? (
        <div
          style={{
            marginTop: 12,
            textAlign: "left",
            maxWidth: 360,
            marginLeft: "auto",
            marginRight: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {detalhes.map((d) => (
            <div
              key={d.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: d.fill,
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: "#374151" }}>{d.label}</span>
              </div>
              <span
                style={{
                  fontWeight: 600,
                  color: d.valorColor ?? "#1A1A1A",
                  flexShrink: 0,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {d.valor}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
