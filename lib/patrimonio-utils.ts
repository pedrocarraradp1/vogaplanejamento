import type { Ativo, Passivo, PatrimonioState } from "@/lib/plano-context"

export const TIPOS_ATIVO_OPCOES = [
  { value: "imobilizado", label: "Imobilizado" },
  { value: "ativo_liquido", label: "Ativos Líquidos" },
  { value: "participacao_societaria", label: "Participações Societárias" },
  { value: "previdencia", label: "Previdência" },
] as const

export const TIPOS_ATIVO = TIPOS_ATIVO_OPCOES.map((o) => o.value) as readonly [
  "imobilizado",
  "ativo_liquido",
  "participacao_societaria",
  "previdencia",
]

export type TipoAtivoSlug = (typeof TIPOS_ATIVO)[number]
/** @deprecated Use TipoAtivoSlug */
export type TipoAtivoLabel = TipoAtivoSlug

export const DESCRICOES_ATIVOS_POR_TIPO: Record<TipoAtivoSlug, string[]> = {
  ativo_liquido: ["Ativos Nacionais", "Ativos Internacionais", "Outros"],
  imobilizado: [
    "Casa/Apto Residencial",
    "Imóvel Investimento",
    "Terreno",
    "Veículo/Carro",
    "Outros",
  ],
  participacao_societaria: ["Empresa", "Holding", "Fundo Exclusivo", "Outros"],
  previdencia: ["Previdência Privada", "Outros"],
}

export const SUBCATEGORIAS_LIQUIDO = [
  { value: "pre_fixado", label: "Pré-fixado" },
  { value: "pos_fixado", label: "Pós-fixado (CDI / Selic)" },
  { value: "inflacao", label: "Inflação (IPCA+ / IGPM+)" },
  { value: "acoes", label: "Ações" },
  { value: "fundos_imobiliarios", label: "Fundos Imobiliários (FII)" },
  { value: "alternativos", label: "Alternativos (Hedge / Private)" },
  { value: "cambial", label: "Cambial / Dólar" },
  { value: "multimercado", label: "Multimercado" },
  { value: "exterior", label: "Fundo de Exterior / ETF" },
  { value: "criptoativos", label: "Criptoativos" },
] as const

export type SubcategoriaLiquido = (typeof SUBCATEGORIAS_LIQUIDO)[number]["value"]

export const LOCALIZACAO_ATIVO = [
  { value: "nacional", label: "Nacional" },
  { value: "internacional", label: "Internacional" },
  { value: "outros", label: "Outros" },
] as const

export type LocalizacaoAtivo = (typeof LOCALIZACAO_ATIVO)[number]["value"]

export const CORES_SUBCATEGORIA: Record<string, string> = {
  pre_fixado: "#4B759B",
  pos_fixado: "#5DCAA5",
  inflacao: "#7F77DD",
  acoes: "#EF9F27",
  fundos_imobiliarios: "#E67E22",
  alternativos: "#C0392B",
  cambial: "#1ABC9C",
  multimercado: "#8E44AD",
  exterior: "#2980B9",
  criptoativos: "#F39C12",
}

export function labelSubcategoriaLiquido(value: string): string {
  return SUBCATEGORIAS_LIQUIDO.find((s) => s.value === value)?.label ?? value
}

export function labelLocalizacaoAtivo(value: string): string {
  return LOCALIZACAO_ATIVO.find((l) => l.value === value)?.label ?? value
}

export function isAtivoLiquidoTipo(tipo: string, descricao?: string): boolean {
  return normalizeAtivoTipo(tipo, descricao) === "ativo_liquido"
}

const LEGACY_TIPO_ATIVO: Record<string, TipoAtivoSlug> = {
  Líquido: "ativo_liquido",
  Imobilizado: "imobilizado",
  "Participação Societária": "participacao_societaria",
}

/** Descrições antigas → rótulo atual (migração / agregação). */
const LEGACY_DESCRICAO_ATIVO: Record<string, string> = {
  "Previdência Privada (PGBL/VGBL)": "Previdência Privada",
  "Casa / Apartamento Residencial": "Casa/Apto Residencial",
  "Imóvel para Investimento": "Imóvel Investimento",
  "Veículo / Carro": "Veículo/Carro",
  "Sociedade Empresarial (Quotas)": "Empresa",
  "Holding Familiar": "Holding",
}

export function normalizeAtivoDescricao(descricao: string): string {
  const d = (descricao ?? "").trim()
  return LEGACY_DESCRICAO_ATIVO[d] ?? d
}

export function isTipoAtivoSlug(tipo: string): tipo is TipoAtivoSlug {
  return (TIPOS_ATIVO as readonly string[]).includes(tipo)
}

/** @deprecated Use isTipoAtivoSlug */
export const isTipoAtivoLabel = isTipoAtivoSlug

export function normalizeAtivoTipo(tipo: string, descricao?: string): TipoAtivoSlug {
  const t = (tipo ?? "").trim()
  if (isTipoAtivoSlug(t)) return t
  if (t === "Líquido" && normalizeAtivoDescricao(descricao ?? "") === "Previdência Privada") {
    return "previdencia"
  }
  return LEGACY_TIPO_ATIVO[t] ?? "ativo_liquido"
}

export function resolveTipoAtivoSlug(tipo: string | undefined | null, descricao?: string): TipoAtivoSlug {
  return normalizeAtivoTipo(tipo ?? "", descricao)
}

/** @deprecated Use resolveTipoAtivoSlug */
export const resolveTipoAtivoLabel = resolveTipoAtivoSlug

export function labelTipoAtivo(tipo: string, descricao?: string): string {
  const slug = normalizeAtivoTipo(tipo, descricao)
  return TIPOS_ATIVO_OPCOES.find((o) => o.value === slug)?.label ?? slug
}

export function normalizeAtivoRecord(ativo: Ativo): Ativo {
  const tipo = normalizeAtivoTipo(ativo.tipo, ativo.descricao)
  const subcategoria = (ativo.subcategoria ?? "").trim() || undefined
  const localizacao = (ativo.localizacao ?? "").trim() || undefined
  const observacao = (ativo.observacao ?? "").trim() || undefined
  const instituicao = (ativo.instituicao ?? "").trim()
  let descricao = (ativo.descricao ?? "").trim()
  if (tipo === "ativo_liquido" && subcategoria) {
    descricao = labelSubcategoriaLiquido(subcategoria)
  } else {
    descricao = resolveDescricaoAtivo(tipo, descricao)
  }
  return { ...ativo, tipo, descricao, subcategoria, localizacao, observacao, instituicao }
}

export function resolveDescricaoAtivo(
  tipo: TipoAtivoSlug,
  descricao: string | undefined | null,
): string {
  const cats = DESCRICOES_ATIVOS_POR_TIPO[tipo]
  const d = (descricao ?? "").trim()
  if (cats.includes(d)) return d
  return cats[0]
}

export const CATEGORIAS_PASSIVO = [
  "Financiamento Imóvel",
  "Financiamento Veículo",
  "Cartão de Crédito",
  "Empréstimo Pessoal",
  "Consórcio",
  "Outro",
] as const

export type CategoriaPassivo = (typeof CATEGORIAS_PASSIVO)[number]

export const DEFAULT_CATEGORIA_PASSIVO = CATEGORIAS_PASSIVO[0]

export const INSTITUICOES_FINANCEIRAS = [
  "XP",
  "BTG",
  "Itaú",
  "BB",
  "Genial",
  "Santander",
  "BRB",
  "Bradesco",
  "Nubank",
  "Outros",
] as const

export type InstituicaoFinanceira = (typeof INSTITUICOES_FINANCEIRAS)[number]

export function isInstituicaoFinanceiraListada(value: string): value is InstituicaoFinanceira {
  return (INSTITUICOES_FINANCEIRAS as readonly string[]).includes(value)
}

/** Instituição no modal de ativos líquidos. */
export function exibeInstituicaoAtivo(tipo: string, descricao?: string): boolean {
  return isAtivoLiquidoTipo(tipo, descricao)
}

/** Empresário(a) ou profissão customizada que indique empresário. */
export function isProfissaoEmpresario(profissao: string): boolean {
  return /empres[aá]ri/i.test((profissao ?? "").trim())
}

/** Meta de reserva: empresário 12m, com filhos 9m, demais 6m. */
export function metaReservaEmergenciaMeses(profissao: string, quantidadeFilhos: number): number {
  if (isProfissaoEmpresario(profissao)) return 12
  if (quantidadeFilhos > 0) return 9
  return 6
}

export function descricaoMetaReservaEmergencia(profissao: string, quantidadeFilhos: number): string {
  const meta = metaReservaEmergenciaMeses(profissao, quantidadeFilhos)
  if (isProfissaoEmpresario(profissao)) return `Meta: ${meta} meses (empresário)`
  if (quantidadeFilhos > 0) return `Meta: ${meta} meses (com filhos)`
  return `Meta: ${meta} meses`
}

export type NivelSaude = "green" | "yellow" | "red"

export function nivelReservaEmergencia(meses: number, meta: number): NivelSaude {
  if (meses >= meta) return "green"
  if (meses >= meta / 2) return "yellow"
  return "red"
}

export const TOOLTIP_PATRIMONIO_LIQUIDO =
  "Cálculo: soma de todos os ativos menos o total de passivos (saldo devedor).\n\nEsperado: patrimônio líquido positivo indica ativos superiores às dívidas."

export const TOOLTIP_ATIVOS_TOTAIS =
  "Cálculo: soma de ativos líquidos, imobilizado e participações societárias cadastrados.\n\nEsperado: quanto maior em relação aos passivos, mais sólida a posição patrimonial."

export const TOOLTIP_PASSIVOS_TOTAIS =
  "Cálculo: soma dos saldos devedores de todos os passivos cadastrados.\n\nEsperado: manter o menor percentual possível sobre o total de ativos."

export function tooltipReservaEmergencia(profissao: string, quantidadeFilhos: number): string {
  const meta = metaReservaEmergenciaMeses(profissao, quantidadeFilhos)
  const perfil = isProfissaoEmpresario(profissao)
    ? "empresário"
    : quantidadeFilhos > 0
      ? "com filhos"
      : "sem filhos"
  return [
    "Cálculo: Ativos Líquidos ÷ Despesa Mensal (aba Dados Pessoais).",
    "Considera apenas ativos do tipo Ativos Líquidos (sem previdência).",
    "",
    "Meta recomendada:",
    "• Empresário: 12 meses",
    "• Com filhos: 9 meses",
    "• Sem filhos: 6 meses",
    "",
    `Sua meta: ${meta} meses (${perfil}).`,
    "",
    "Indicador:",
    "• Verde: ≥ meta",
    "• Amarelo: ≥ metade da meta",
    "• Vermelho: abaixo da metade da meta",
  ].join("\n")
}

export const TOOLTIP_COMPROMETIMENTO_RENDA = [
  "Cálculo: (soma das parcelas mensais dos passivos ÷ Renda Mensal) × 100.",
  "A parcela usa o valor informado ou, se ausente, saldo devedor ÷ 120.",
  "",
  "Indicador:",
  "• Verde: < 20%",
  "• Amarelo: 20% a 30%",
  "• Vermelho: > 30%",
].join("\n")

export const TOOLTIP_INDICE_LIQUIDEZ = [
  "Cálculo: Ativos Líquidos ÷ Total de Passivos.",
  "Mede a capacidade de cobrir dívidas com recursos líquidos.",
  "",
  "Indicador:",
  "• Verde: > 1,5",
  "• Amarelo: 1,0 a 1,5",
  "• Vermelho: < 1,0",
].join("\n")

export const TOOLTIP_TAXA_POUPANCA = [
  "Cálculo: (Renda Mensal − Despesa Mensal) ÷ Renda Mensal × 100.",
  "Valores negativos são tratados como 0%.",
  "",
  "Indicador:",
  "• Verde: > 20%",
  "• Amarelo: 10% a 20%",
  "• Vermelho: < 10%",
].join("\n")

export const TOOLTIP_CUSTO_JUROS_PROJETADO =
  "Cálculo: por passivo, (parcela mensal × prazo restante em meses) − saldo devedor. Soma de todos os passivos.\nEstima o custo total de juros até quitar as dívidas.\n\nEsperado: quanto menor, menor o peso financeiro das dívidas."

export const TOOLTIP_INDICE_ALAVANCAGEM =
  "Cálculo: (Total de Passivos ÷ Ativos Totais) × 100.\n\nEsperado: quanto menor o percentual, menor a dependência de endividamento no patrimônio."

/** Paleta de gráficos — tokens Voga (azuis, verde, cinza). */
export const CORES_GRAFICO_VOGA = [
  "#4B759B",
  "#033252",
  "#345E7B",
  "#6B8FB0",
  "#00954F",
  "#9A9B9B",
  "#C8E2F5",
] as const

export const COR_GRAFICO_LIQUIDOS = "#4B759B"
export const COR_GRAFICO_IMOBILIZADO = "#033252"
export const COR_GRAFICO_PREVIDENCIA = "#00954F"
export const COR_GRAFICO_INVESTIMENTOS = "#345E7B"

export const SECAO_LIQUIDO = {
  id: "liquidos",
  title: "Ativos Líquidos",
  tipo: "ativo_liquido",
  categorias: DESCRICOES_ATIVOS_POR_TIPO.ativo_liquido,
  cor: "#4B759B",
  totalLabel: "Total",
} as const

export const SECAO_PREVIDENCIA = {
  id: "previdencia",
  title: "Previdência",
  tipo: "previdencia",
  categorias: DESCRICOES_ATIVOS_POR_TIPO.previdencia,
  cor: "#00954F",
  totalLabel: "Total",
} as const

export const SECAO_IMOBILIZADO = {
  id: "imobilizado",
  title: "Imobilizado",
  tipo: "imobilizado",
  categorias: DESCRICOES_ATIVOS_POR_TIPO.imobilizado,
  cor: "#033252",
  totalLabel: "Total",
} as const

export const SECAO_PARTICIPACOES = {
  id: "participacoes",
  title: "Participações Societárias",
  tipo: "participacao_societaria",
  categorias: DESCRICOES_ATIVOS_POR_TIPO.participacao_societaria,
  cor: "#345E7B",
  totalLabel: "Total",
} as const

export const SECOES_ATIVOS = [
  SECAO_LIQUIDO,
  SECAO_PREVIDENCIA,
  SECAO_IMOBILIZADO,
  SECAO_PARTICIPACOES,
] as const

export type SecaoAtivoConfig = (typeof SECOES_ATIVOS)[number]

export function matchesAtivoCategoria(ativo: Ativo, tipo: TipoAtivoSlug, categoria: string): boolean {
  if (normalizeAtivoTipo(ativo.tipo, ativo.descricao) !== tipo) return false
  const desc = normalizeAtivoDescricao(ativo.descricao ?? "")
  const cats = DESCRICOES_ATIVOS_POR_TIPO[tipo] ?? []
  if (categoria === "Outros") {
    return desc === "Outros" || (desc !== "" && !cats.slice(0, -1).includes(desc))
  }
  return desc === categoria
}

export function resolvePassivoCategoria(passivo: Passivo): string {
  const cat = (passivo.categoria ?? passivo.tipo ?? "").trim()
  if (cat && (CATEGORIAS_PASSIVO as readonly string[]).includes(cat)) return cat
  if (cat === "Outros") return "Outro"
  return cat || DEFAULT_CATEGORIA_PASSIVO
}

export function matchesPassivoCategoria(passivo: Passivo, categoria: string): boolean {
  const cat = resolvePassivoCategoria(passivo)
  if (categoria === "Outro" || categoria === "Outros") {
    return cat === "Outro" || cat === "Outros"
  }
  return cat === categoria
}

/** Normaliza passivos legados (tipo/valor) para o modelo completo. */
export function normalizePassivo(raw: Partial<Passivo> & Record<string, unknown>): Passivo {
  const saldo =
    Number(raw.saldoDevedor) > 0
      ? Number(raw.saldoDevedor)
      : Number(raw.valor) > 0
        ? Number(raw.valor)
        : 0
  const prazoRestante =
    Number(raw.prazoRestanteMeses) > 0
      ? Number(raw.prazoRestanteMeses)
      : Number(raw.prazo) > 0
        ? Number(raw.prazo)
        : 0
  const taxaJuros =
    Number(raw.taxaJurosMensal) > 0
      ? Number(raw.taxaJurosMensal)
      : Number(raw.taxa) > 0
        ? Number(raw.taxa)
        : 0
  let parcelaMensal = Number(raw.parcelaMensal) || 0
  if (parcelaMensal <= 0 && saldo > 0 && prazoRestante <= 0) {
    parcelaMensal = saldo / 120
  }

  const categoria = resolvePassivoCategoria({
    ...raw,
    categoria: String(raw.categoria ?? raw.tipo ?? DEFAULT_CATEGORIA_PASSIVO),
  } as Passivo)

  return {
    id: String(raw.id ?? `passivo-${Date.now()}`),
    categoria,
    descricao: String(raw.descricao ?? categoria).trim() || categoria,
    saldoDevedor: saldo,
    parcelaMensal,
    taxaJurosMensal: taxaJuros,
    prazoRestanteMeses: prazoRestante,
    instituicao: String(raw.instituicao ?? "").trim(),
    bemVinculado: String(raw.bemVinculado ?? "").trim(),
    valor: saldo,
    tipo: categoria,
    modelo: raw.modelo,
    taxa: taxaJuros,
    prazo: prazoRestante,
  }
}

export function getSaldoDevedorPassivo(passivo: Passivo): number {
  const saldo = Number(passivo.saldoDevedor)
  if (saldo > 0) return saldo
  return Math.max(0, Number(passivo.valor) || 0)
}

export function getParcelaMensalPassivo(passivo: Passivo): number {
  const parcela = Number(passivo.parcelaMensal)
  if (parcela > 0) return parcela
  const saldo = getSaldoDevedorPassivo(passivo)
  if (saldo > 0) return saldo / 120
  return 0
}

export function sumAtivoTipo(ativos: Ativo[], tipo: TipoAtivoSlug): number {
  return (ativos ?? [])
    .filter((a) => normalizeAtivoTipo(a.tipo, a.descricao) === tipo)
    .reduce((s, a) => s + (Number(a.valor) || 0), 0)
}

export interface TotaisAtivos {
  totalAtivoLiquido: number
  totalPrevidencia: number
  totalImobilizado: number
  totalParticipacoes: number
  totalAtivosFinanceiros: number
  patrimonioBruto: number
}

export function computeTotaisAtivos(ativos: Ativo[]): TotaisAtivos {
  const totalAtivoLiquido = sumAtivoTipo(ativos, "ativo_liquido")
  const totalPrevidencia = sumAtivoTipo(ativos, "previdencia")
  const totalImobilizado = sumAtivoTipo(ativos, "imobilizado")
  const totalParticipacoes = sumAtivoTipo(ativos, "participacao_societaria")
  const totalAtivosFinanceiros = totalAtivoLiquido + totalPrevidencia
  const patrimonioBruto =
    totalAtivoLiquido + totalPrevidencia + totalImobilizado + totalParticipacoes
  return {
    totalAtivoLiquido,
    totalPrevidencia,
    totalImobilizado,
    totalParticipacoes,
    totalAtivosFinanceiros,
    patrimonioBruto,
  }
}

export function computePatrimonioTotals(ativos: Ativo[], passivos: Passivo[]): PatrimonioState {
  const totais = computeTotaisAtivos(ativos)
  return {
    ativosLiquidos: totais.totalAtivoLiquido,
    previdencia: totais.totalPrevidencia,
    imobilizado: totais.totalImobilizado,
    participacoes: totais.totalParticipacoes,
    passivos: (passivos ?? []).reduce((s, p) => s + getSaldoDevedorPassivo(p), 0),
  }
}

/** Patrimônio líquido consolidado: todos os ativos − passivos (mesmo cálculo do Dashboard). */
export function getPatrimonioTotalConsolidado(ativos: Ativo[], passivos: Passivo[]): number {
  const totalAtivos = (ativos ?? []).reduce((s, a) => s + Math.max(0, Number(a.valor) || 0), 0)
  const totalPassivos = (passivos ?? []).reduce((s, p) => s + getSaldoDevedorPassivo(p), 0)
  return totalAtivos - totalPassivos
}

export function sumAtivoCategoria(ativos: Ativo[], tipo: string, categoria: string): number {
  return ativos
    .filter((a) => matchesAtivoCategoria(a, tipo, categoria))
    .reduce((s, a) => s + (Number(a.valor) || 0), 0)
}

export function sumPassivoCategoria(passivos: Passivo[], categoria: string): number {
  return passivos
    .filter((p) => matchesPassivoCategoria(p, categoria))
    .reduce((s, p) => s + getSaldoDevedorPassivo(p), 0)
}
