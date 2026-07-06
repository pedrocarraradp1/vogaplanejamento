/** Estilos padrão para tooltips do Recharts (tema navy Voga). */
export const CHART_TOOLTIP_STYLE = {
  backgroundColor: "#012137",
  border: "none",
  borderRadius: 6,
  padding: 10,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
} as const

export const CHART_TOOLTIP_LABEL_STYLE = {
  color: "#C8E2F5",
  fontWeight: 600,
  marginBottom: 4,
} as const

export const CHART_TOOLTIP_ITEM_STYLE = {
  color: "#ffffff",
} as const

/** Props padrão para `<Tooltip />` do Recharts. */
export const CHART_TOOLTIP_PROPS = {
  contentStyle: CHART_TOOLTIP_STYLE,
  labelStyle: CHART_TOOLTIP_LABEL_STYLE,
  itemStyle: CHART_TOOLTIP_ITEM_STYLE,
} as const

export function formatDonutTooltipPct(valor: number, total: number): string {
  if (total <= 0) return "0.0"
  return ((valor / total) * 100).toFixed(1)
}

export function donutTooltipFormatter(
  formatCurrency: (v: number) => string,
  total: number,
): (value: number) => [string, string] {
  return (value: number) => {
    const pct = formatDonutTooltipPct(value, total)
    return [`${formatCurrency(value)} (${pct}%)`, ""]
  }
}
