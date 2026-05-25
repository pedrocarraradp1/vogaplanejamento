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

export const SECAO_LIQUIDO = {
  id: "liquidos",
  title: "Ativos Líquidos",
  tipo: "Líquido",
  categorias: DESCRICOES_ATIVOS_POR_TIPO["Líquido"],
  cor: "#1E5CE6",
  totalLabel: "Total",
} as const

export const SECAO_IMOBILIZADO = {
  id: "imobilizado",
  title: "Imobilizado",
  tipo: "Imobilizado",
  categorias: DESCRICOES_ATIVOS_POR_TIPO["Imobilizado"],
  cor: "#1D9E75",
  totalLabel: "Total",
} as const

export const SECAO_PARTICIPACOES = {
  id: "participacoes",
  title: "Participações Societárias",
  tipo: "Participação Societária",
  categorias: DESCRICOES_ATIVOS_POR_TIPO["Participação Societária"],
  cor: "#7C3AED",
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
