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

export const CATEGORIAS_PASSIVO = [
  "Financiamento Imóvel",
  "Financiamento Veículo",
  "Empréstimo Pessoal",
  "Outros",
] as const

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

export function matchesPassivoCategoria(passivo: Passivo, categoria: string): boolean {
  const tipo = (passivo.tipo ?? "").trim()
  if (categoria === "Outros") {
    return (
      tipo === "Outros" ||
      (tipo !== "" &&
        !CATEGORIAS_PASSIVO.slice(0, -1).includes(tipo as (typeof CATEGORIAS_PASSIVO)[number]))
    )
  }
  return tipo === categoria
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
    passivos: (passivos ?? []).reduce((s, p) => s + (Number(p.valor) || 0), 0),
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
    .reduce((s, p) => s + (Number(p.valor) || 0), 0)
}
