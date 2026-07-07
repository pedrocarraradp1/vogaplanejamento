"use client"

import { useRef, useState, type CSSProperties } from "react"

export type DetalheHover = {
  id: string
  label: string
  valor: string
  fill: string
  valorColor?: string
}

const TOOLTIP_STYLE: CSSProperties = {
  position: "absolute",
  pointerEvents: "none",
  zIndex: 20,
  minWidth: 200,
  maxWidth: 280,
  padding: "10px 14px",
  background: "#fff",
  borderRadius: 8,
  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
  border: "1px solid rgba(0,0,0,0.06)",
}

export function TooltipFlutuante({
  pos,
  titulo,
  subtitulo,
  detalhes,
}: {
  pos: { x: number; y: number }
  titulo: string
  subtitulo: string
  detalhes?: DetalheHover[]
}) {
  return (
    <div
      style={{
        ...TOOLTIP_STYLE,
        left: pos.x,
        top: pos.y,
        transform: "translate(-50%, calc(-100% - 12px))",
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
        {titulo}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6B7280", textAlign: "center" }}>{subtitulo}</p>
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
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: item.fill,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    color: "#374151",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.label}
                </span>
              </div>
              <span
                style={{
                  fontWeight: 600,
                  color: item.valorColor ?? "#1A1A1A",
                  flexShrink: 0,
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
  )
}

export function useTooltipHover(onHover?: (idx: number | null) => void) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)

  const updateTooltip = (idx: number | null, clientX: number, clientY: number) => {
    const el = containerRef.current
    if (!el || idx === null) {
      setHoveredIdx(null)
      setTooltipPos(null)
      onHover?.(null)
      return
    }
    const rect = el.getBoundingClientRect()
    setHoveredIdx(idx)
    setTooltipPos({ x: clientX - rect.left, y: clientY - rect.top })
    onHover?.(idx)
  }

  const handleLeave = () => {
    setHoveredIdx(null)
    setTooltipPos(null)
    onHover?.(null)
  }

  return { containerRef, hoveredIdx, tooltipPos, updateTooltip, handleLeave }
}
