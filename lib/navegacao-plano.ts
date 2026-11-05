import { ADMIN_SECTION_ID } from "@/lib/profile-role"

export type NavItem = { id: string; label: string }
export type NavGroup = { title: string; items: NavItem[] }

export const NAV_GROUP_ADMIN: NavGroup = {
  title: "Gestão",
  items: [{ id: ADMIN_SECTION_ID, label: "Admin" }],
}

export const NAV_GROUPS_FULL: NavGroup[] = [
  {
    title: "Cadastro do Cliente",
    items: [{ id: "dados-pessoais", label: "Dados Pessoais" }],
  },
  {
    title: "Planejamento Financeiro",
    items: [
      { id: "patrimonio", label: "Balanço Patrimonial" },
      { id: "objetivos", label: "Objetivos" },
      { id: "projecao", label: "Projeções / Aposentadoria" },
      { id: "projecao-livre", label: "Projeção Livre" },
      { id: "cenarios", label: "Cenários" },
      { id: "fluxo-de-caixa", label: "Fluxo de Caixa" },
      { id: "plano-financeiro-completo", label: "Plano Financeiro Completo" },
    ],
  },
  {
    title: "Planejamento Sucessório",
    items: [
      { id: "sucessorio", label: "Sucessório" },
      { id: "documentos", label: "Documentos" },
    ],
  },
  {
    title: "Gestão de Risco e Proteção",
    items: [
      { id: "protecao", label: "Proteção Financeira" },
      { id: "simulador-seguros", label: "Simulador de Seguros" },
    ],
  },
  {
    title: "Planejamento Fiscal",
    items: [
      { id: "pgbl-vs-vgbl", label: "PGBL vs VGBL" },
      { id: "eficiencia-tributaria", label: "Eficiência Tributária" },
    ],
  },
  {
    title: "Diagnóstico",
    items: [
      { id: "diagnostico-financeiro", label: "Diagnóstico e Plano de Ação" },
      { id: "infoclient", label: "InfoClient" },
    ],
  },
]

/** Abas visíveis no link público compartilhado com o cliente. */
export const PUBLIC_PLANO_SECTION_IDS = new Set([
  "dados-pessoais",
  "patrimonio",
  "objetivos",
  "fluxo-de-caixa",
  "projecao",
  "cenarios",
  "plano-financeiro-completo",
  "sucessorio",
])

export const NAV_GROUPS_PUBLIC: NavGroup[] = NAV_GROUPS_FULL.map((group) => ({
  ...group,
  items: group.items.filter((item) => PUBLIC_PLANO_SECTION_IDS.has(item.id)),
})).filter((group) => group.items.length > 0)

export const DEFAULT_PUBLIC_SECTION = "dados-pessoais"

export function navGroupsForSession(opts: {
  variant?: "full" | "public"
  isAdmin?: boolean
}): NavGroup[] {
  const variant = opts.variant ?? "full"
  const base = variant === "public" ? NAV_GROUPS_PUBLIC : NAV_GROUPS_FULL
  if (variant === "public" || !opts.isAdmin) return base
  return [NAV_GROUP_ADMIN, ...base]
}
