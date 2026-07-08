/** Borda padrão dos slices em gráficos circulares Voga. */
import { VOGA } from "@/lib/voga-tokens"

export const PIE_SLICE_BORDER = {
  stroke: VOGA.branco,
  strokeWidth: 3,
} as const

/** Estilo de hover dos slices em gráficos circulares Voga. */
export const PIE_SLICE_HOVER = {
  stroke: VOGA.nuvem,
  strokeWidth: 4,
  offset: 6,
} as const
