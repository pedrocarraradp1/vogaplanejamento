import type { Ativo, Passivo, PatrimonioState } from "@/lib/plano-context"

export const TIPOS_ATIVO = ["Líquido", "Imobilizado", "Participação Societária"] as const
export type TipoAtivoLabel = (typeof TIPOS_ATIVO)[number]

export const DESCRICOES_ATIVOS_POR_TIPO: Record<TipoAtivoLabel, string[]> = {
  "Líquido": [
    "Ativos Nacionais",
    "Ativos Internacionais",
    "Previdência Privada",
    "Outros",
  ],
  Imobilizado: [
    "Casa/Apto Residencial",
    "Imóvel Investimento",
    "Terreno",
    "Veículo/Carro",
    "Outros",
  ],
  "Participação Societária": ["Empresa", "Holding", "Fundo Exclusivo", "Outros"],
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

export function isTipoAtivoLabel(tipo: string): tipo is TipoAtivoLabel {
  return (TIPOS_ATIVO as readonly string[]).includes(tipo)
}

export function resolveTipoAtivoLabel(tipo: string | undefined | null): TipoAtivoLabel {
  const t = (tipo ?? "").trim()
  return isTipoAtivoLabel(t) ? t : "Líquido"
}

export function resolveDescricaoAtivo(
  tipo: TipoAtivoLabel,
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
    "Considera apenas ativos do tipo Líquido.",
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
  tipo: "Líquido",
  categorias: DESCRICOES_ATIVOS_POR_TIPO["Líquido"],
  cor: "#4B759B",
  totalLabel: "Total",
} as const

export const SECAO_IMOBILIZADO = {
  id: "imobilizado",
  title: "Imobilizado",
  tipo: "Imobilizado",
  categorias: DESCRICOES_ATIVOS_POR_TIPO["Imobilizado"],
  cor: "#033252",
  totalLabel: "Total",
} as const

export const SECAO_PARTICIPACOES = {
  id: "participacoes",
  title: "Participações Societárias",
  tipo: "Participação Societária",
  categorias: DESCRICOES_ATIVOS_POR_TIPO["Participação Societária"],
  cor: "#345E7B",
  totalLabel: "Total",
} as const

export const SECOES_ATIVOS = [SECAO_LIQUIDO, SECAO_IMOBILIZADO, SECAO_PARTICIPACOES] as const

export type SecaoAtivoConfig = (typeof SECOES_ATIVOS)[number]

export function matchesAtivoCategoria(ativo: Ativo, tipo: string, categoria: string): boolean {
  if ((ativo.tipo ?? "").trim() !== tipo) return false
  const desc = normalizeAtivoDescricao(ativo.descricao ?? "")
  const cats = DESCRICOES_ATIVOS_POR_TIPO[tipo as TipoAtivoLabel] ?? []
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

export function sumAtivoTipo(ativos: Ativo[], tipo: string): number {
  return (ativos ?? [])
    .filter((a) => (a.tipo ?? "").trim() === tipo)
    .reduce((s, a) => s + (Number(a.valor) || 0), 0)
}

export function computePatrimonioTotals(ativos: Ativo[], passivos: Passivo[]): PatrimonioState {
  return {
    ativosLiquidos: sumAtivoTipo(ativos, "Líquido"),
    imobilizado: sumAtivoTipo(ativos, "Imobilizado"),
    participacoes: sumAtivoTipo(ativos, "Participação Societária"),
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
