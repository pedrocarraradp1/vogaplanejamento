export function fmtMoeda(n: number, moeda: "BRL" | "USD") {
  return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: moeda,
    maximumFractionDigits: 0,
  }).format(n)
}

export const RODAPE_CONSULTORIA =
  "Diagnóstico e recomendação gerados pelo planejador da Voga a partir dos dados informados. A execução (holding, doação, testamento) exige advogado e contador."

export const FASE_LABEL = {
  imediato: "Imediato",
  "90_dias": "90 dias",
  "12_meses": "12 meses",
} as const

export const RESP_LABEL = {
  cliente: "Cliente",
  assessor: "Assessor",
  advogado: "Advogado",
  contador: "Contador",
} as const
