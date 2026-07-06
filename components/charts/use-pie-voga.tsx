"use client"

import { useState } from "react"
import { Sector } from "recharts"
import { PIE_SLICE_BORDER, PIE_SLICE_HOVER } from "@/lib/chart-pie"

export function usePieVogaProps() {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined)

  return {
    stroke: PIE_SLICE_BORDER.stroke,
    strokeWidth: PIE_SLICE_BORDER.strokeWidth,
    activeIndex,
    activeShape: (props: {
      cx?: number
      cy?: number
      innerRadius?: number
      outerRadius?: number
      startAngle?: number
      endAngle?: number
      fill?: string
    }) => (
      <Sector
        cx={props.cx}
        cy={props.cy}
        innerRadius={props.innerRadius}
        outerRadius={(props.outerRadius ?? 0) + PIE_SLICE_HOVER.offset}
        startAngle={props.startAngle}
        endAngle={props.endAngle}
        fill={props.fill}
        stroke={PIE_SLICE_HOVER.stroke}
        strokeWidth={PIE_SLICE_HOVER.strokeWidth}
      />
    ),
    onMouseEnter: (_: unknown, index: number) => setActiveIndex(index),
    onMouseLeave: () => setActiveIndex(undefined),
  }
}
