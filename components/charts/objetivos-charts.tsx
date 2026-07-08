"use client"

import type { Objetivo } from "@/lib/plano-context"
import { TooltipFlutuante, useTooltipHover } from "@/components/charts/chart-tooltip"

const CHART_HEIGHT = 140

type CorObjetivo = { fill: string; text: string }

export function GraficoCapitalPorAno({
  anosVisiveis,
  capitalMap,
  capitalPorObjetivoMap,
  objetivos,
  coresPorObjetivoId,
  maxCapitalPeriodo,
  rotuloStep,
  formatCurrency,
}: {
  anosVisiveis: number[]
  capitalMap: Map<number, number>
  capitalPorObjetivoMap: Map<number, Map<string, number>>
  objetivos: Objetivo[]
  coresPorObjetivoId: Map<string, CorObjetivo>
  maxCapitalPeriodo: number
  rotuloStep: number
  formatCurrency: (v: number) => string
}) {
  const { containerRef, hoveredIdx, tooltipPos, updateTooltip, handleLeave } = useTooltipHover()

  const hoveredAno = hoveredIdx !== null ? anosVisiveis[hoveredIdx] : null
  const valorHover = hoveredAno !== null ? (capitalMap.get(hoveredAno) ?? 0) : 0

  const contribuicoesHover =
    hoveredAno !== null
      ? objetivos
          .map((o) => ({
            id: o.id,
            nome: (o.descricao || "Objetivo").trim(),
            valor: capitalPorObjetivoMap.get(hoveredAno)?.get(o.id) ?? 0,
            cor: coresPorObjetivoId.get(o.id) ?? { fill: "#1066DA", text: "#393939" },
          }))
          .filter((item) => item.valor > 0)
      : []

  const segmentosPorAno = (ano: number) => {
    const porObj = capitalPorObjetivoMap.get(ano)
    if (!porObj) return []
    return objetivos
      .map((o) => ({
        id: o.id,
        valor: porObj.get(o.id) ?? 0,
        cor: coresPorObjetivoId.get(o.id) ?? { fill: "#1066DA", text: "#393939" },
      }))
      .filter((s) => s.valor > 0)
  }

  const anoInicioVisivel = anosVisiveis[0]
  const anoFimVisivel = anosVisiveis[anosVisiveis.length - 1]

  return (
    <div
      ref={containerRef}
      className="w-full min-w-0 relative"
      style={{ height: CHART_HEIGHT + 22 }}
      onMouseLeave={handleLeave}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 4,
          height: CHART_HEIGHT,
        }}
      >
        {anosVisiveis.map((ano, i) => {
          const valor = capitalMap.get(ano) ?? 0
          const segmentos = segmentosPorAno(ano)
          const mostrarAno =
            ano === anoFimVisivel || (ano - anoInicioVisivel) % rotuloStep === 0
          const barHeight =
            valor > 0 && maxCapitalPeriodo > 0
              ? Math.max(20, Math.round((valor / maxCapitalPeriodo) * 100))
              : 4

          return (
            <div
              key={ano}
              className="ano-coluna"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 0,
                height: "100%",
                justifyContent: "flex-end",
                cursor: "default",
              }}
              onMouseEnter={(e) => updateTooltip(i, e.clientX, e.clientY)}
              onMouseMove={(e) => updateTooltip(i, e.clientX, e.clientY)}
            >
              {valor > 0 ? (
                <div
                  style={{
                    width: "100%",
                    height: barHeight,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    pointerEvents: "none",
                  }}
                >
                  {(() => {
                    const heights = segmentos.map((seg) =>
                      Math.max(2, Math.round((seg.valor / valor) * barHeight)),
                    )
                    const used = heights.slice(0, -1).reduce((s, h) => s + h, 0)
                    if (heights.length > 0) {
                      heights[heights.length - 1] = Math.max(2, barHeight - used)
                    }
                    return segmentos.map((seg, idx) => {
                      const isTop = idx === segmentos.length - 1
                      return (
                        <div
                          key={seg.id}
                          style={{
                            width: "100%",
                            height: heights[idx],
                            background: seg.cor.fill,
                            borderRadius: isTop ? "3px 3px 0 0" : 0,
                          }}
                        />
                      )
                    })
                  })()}
                </div>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 4,
                    borderRadius: 2,
                    background: "var(--border, #E2E2E2)",
                    pointerEvents: "none",
                  }}
                />
              )}
              <span
                style={{
                  marginTop: 8,
                  fontSize: 10,
                  color: "#5F85B8",
                  visibility: mostrarAno ? "visible" : "hidden",
                  height: 14,
                  lineHeight: "14px",
                  pointerEvents: "none",
                }}
              >
                {mostrarAno ? ano : "\u00A0"}
              </span>
            </div>
          )
        })}
      </div>

      {hoveredAno !== null && tooltipPos ? (
        <TooltipFlutuante
          pos={tooltipPos}
          titulo={formatCurrency(valorHover)}
          subtitulo={
            valorHover > 0
              ? `Ano de ${hoveredAno}`
              : `Ano de ${hoveredAno} · sem objetivo neste ano`
          }
          detalhes={contribuicoesHover.map((item) => ({
            id: item.id,
            label: item.nome,
            valor: formatCurrency(item.valor),
            fill: item.cor.fill,
            valorColor: item.cor.text,
          }))}
        />
      ) : null}
    </div>
  )
}
