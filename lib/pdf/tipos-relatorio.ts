export type RelatorioKpi = { label: string; valor: string; hint?: string }
export type RelatorioTabela = { colunas: string[]; linhas: string[][] }
export type RelatorioSecaoA4 = {
  titulo: string
  kpis?: RelatorioKpi[]
  tabela?: RelatorioTabela
  memoria?: { label: string; valor: string }[]
  pontos?: string[]
  paragrafos?: string[]
}

export type RelatorioA4Input = {
  titulo: string
  cliente: string
  assessor: string
  data: string
  secoes: RelatorioSecaoA4[]
  /** Primeira página de capa (parecer da consultoria). */
  capa?: boolean
}
