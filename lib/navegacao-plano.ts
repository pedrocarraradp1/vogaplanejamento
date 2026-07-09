export type NavItem = { id: string; label: string }
export type NavGroup = { title: string; items: NavItem[] }

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
      { id: "cenarios", label: "Cenários" },
      { id: "fluxo-de-caixa", label: "Fluxo de Caixa" },
      { id: "plano-financeiro-completo", label: "Plano Financeiro Completo" },
    ],
  },
  {
    title: "Planejamento Sucessório",
    items: [{ id: "sucessorio", label: "Sucessório" }],
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
    items: [{ id: "diagnostico-financeiro", label: "Diagnóstico e Plano de Ação" }],
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
])

export const NAV_GROUPS_PUBLIC: NavGroup[] = NAV_GROUPS_FULL.map((group) => ({
  ...group,
  items: group.items.filter((item) => PUBLIC_PLANO_SECTION_IDS.has(item.id)),
})).filter((group) => group.items.length > 0)

export const DEFAULT_PUBLIC_SECTION = "dados-pessoais"
