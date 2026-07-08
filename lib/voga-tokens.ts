/**
 * Tokens oficiais Voga — valores hex para uso em gráficos (Recharts) e estilos inline.
 * Mantém paridade com as variáveis CSS em app/globals.css.
 */
export const VOGA = {
  brasilia: "#1066DA",
  noite: "#01121E",
  lago: "#071D2D",
  remo: "#033252",
  mare: "#022945",
  onda: "#173C6E",
  nautico: "#032D45",
  petroleo: "#1B4665",
  chuva: "#2F5373",
  nuvem: "#4B759B",
  gelo: "#D0E0F0",
  estrela: "#CDE6FF",
  moeda: "#B3DAF8",
  credito: "#81ADD4",
  nota: "#5F85B8",
  branco: "#FFFFFF",
  prata: "#E2E2E2",
  concreto: "#393939",
  preto: "#000000",
  verdeQuadrado: "#DFF0D1",
  amareloExplanada: "#FBF3CC",
  alerta: "#B33A3A",
  alertaTexto: "#7A2828",
} as const

/** Escala de azuis para séries/categorias neutras em gráficos empilhados. */
export const VOGA_CHART_SCALE = [
  VOGA.nuvem,
  VOGA.brasilia,
  VOGA.noite,
  VOGA.onda,
  VOGA.petroleo,
  VOGA.credito,
] as const

export const VOGA_CHART_COLORS = [...VOGA_CHART_SCALE, VOGA.brasilia, VOGA.credito] as const

export const CORES_GRUPOS_ATIVO: Record<string, string> = {
  imobilizado: VOGA.noite,
  previdencia: VOGA.nuvem,
  ativo_liquido: VOGA.brasilia,
  participacao_societaria: VOGA.onda,
}

export const CORES_SUBCATEGORIA: Record<string, string> = {
  carteira_geral: VOGA.concreto,
  pre_fixado: VOGA.noite,
  pos_fixado: VOGA.nuvem,
  inflacao: VOGA.brasilia,
  acoes: VOGA.onda,
  fundos_imobiliarios: VOGA.petroleo,
  alternativos: VOGA.chuva,
  cambial: VOGA.nautico,
  multimercado: VOGA.mare,
  exterior: VOGA.credito,
  criptoativos: VOGA.nota,
}

export const CORES_FLUXO_CAIXA = {
  rentabilidade: VOGA.brasilia,
  receita: VOGA.nuvem,
  despesa: VOGA.alerta,
  saldoAcumulado: VOGA.noite,
  orcado: VOGA.noite,
  realizado: VOGA.brasilia,
  aportes: VOGA.brasilia,
  passivos: VOGA.alerta,
  objetivos: VOGA.petroleo,
  outros: VOGA.nota,
  diffPositiva: VOGA.brasilia,
  diffNegativa: VOGA.alertaTexto,
} as const

export const CORES_FLUXO_PROJECAO = {
  rendimento: VOGA.nuvem,
  aporte: VOGA.brasilia,
  objetivos: VOGA.petroleo,
  passivos: VOGA.alerta,
  retirada: VOGA.alerta,
  metaRenda: VOGA.brasilia,
  positivo: VOGA.brasilia,
  negativo: VOGA.alerta,
  eixo: VOGA.nota,
} as const
