export type CategoriaDespesa =
  | "Moradia"
  | "Transporte"
  | "Alimentação"
  | "Educação"
  | "Saúde"
  | "Lazer"
  | "Financiamento/Empréstimo"
  | "Outros"

export interface DespesaItem {
  id: string
  categoria: CategoriaDespesa
  descricao: string
  valor: number
  temporaria: boolean
  /** Daqui quantos meses começa (0 = já ativa). */
  inicioMeses?: number
  /** Por quantos meses dura (undefined = permanente, só se temporaria). */
  duracaoMeses?: number
}

export const CATEGORIAS_DESPESA: CategoriaDespesa[] = [
  "Moradia",
  "Transporte",
  "Alimentação",
  "Educação",
  "Saúde",
  "Lazer",
  "Financiamento/Empréstimo",
  "Outros",
]

export const DESCRICOES_DESPESA_PADRAO: Record<CategoriaDespesa, string> = {
  Moradia: "Moradia",
  Transporte: "Transporte",
  Alimentação: "Alimentação",
  Educação: "Educação",
  Saúde: "Saúde",
  Lazer: "Lazer",
  "Financiamento/Empréstimo": "Financiamento / empréstimo",
  Outros: "Outros",
}

const CATEGORIAS_VALIDAS = new Set<string>(CATEGORIAS_DESPESA)

export function criarDespesa(partial?: Partial<DespesaItem>): DespesaItem {
  const categoria = partial?.categoria ?? "Outros"
  return {
    id: partial?.id ?? `desp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    categoria: CATEGORIAS_VALIDAS.has(categoria) ? categoria : "Outros",
    descricao: partial?.descricao ?? DESCRICOES_DESPESA_PADRAO[categoria as CategoriaDespesa] ?? "Despesa",
    valor: Number(partial?.valor) || 0,
    temporaria: Boolean(partial?.temporaria),
    inicioMeses: partial?.temporaria ? Math.max(0, Number(partial.inicioMeses) || 0) : undefined,
    duracaoMeses:
      partial?.temporaria && partial.duracaoMeses != null
        ? Math.max(1, Number(partial.duracaoMeses) || 1)
        : undefined,
  }
}

export function normalizarDespesa(raw: unknown): DespesaItem {
  const r = raw as Partial<DespesaItem> | null | undefined
  const cat = String(r?.categoria ?? "Outros")
  const categoria = CATEGORIAS_VALIDAS.has(cat) ? (cat as CategoriaDespesa) : "Outros"
  const temporaria = Boolean(r?.temporaria)
  return criarDespesa({
    id: String(r?.id ?? `desp-${Date.now()}`),
    categoria,
    descricao: String(r?.descricao ?? DESCRICOES_DESPESA_PADRAO[categoria]),
    valor: Number(r?.valor) || 0,
    temporaria,
    inicioMeses: temporaria ? Math.max(0, Number(r?.inicioMeses) || 0) : undefined,
    duracaoMeses:
      temporaria && r?.duracaoMeses != null ? Math.max(1, Number(r.duracaoMeses) || 1) : undefined,
  })
}

export function normalizarDespesas(raw: unknown, legacyDespesa = 0): DespesaItem[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map(normalizarDespesa)
  }
  const desp = Number(legacyDespesa) || 0
  if (desp > 0) {
    return [
      criarDespesa({
        id: "legacy-despesa",
        categoria: "Outros",
        descricao: "Despesa mensal",
        valor: desp,
        temporaria: false,
      }),
    ]
  }
  return []
}

/** Despesa vigente no mês de simulação (0 = mês atual). */
export function despesaMensalEm(despesas: DespesaItem[], mesSimulacao: number): number {
  const mes = Math.max(0, Math.floor(Number(mesSimulacao) || 0))
  return (despesas ?? []).reduce((total, d) => {
    if (!d.temporaria) return total + (Number(d.valor) || 0)
    const inicio = Math.max(0, Number(d.inicioMeses) || 0)
    const duracao = d.duracaoMeses != null ? Math.max(1, Number(d.duracaoMeses) || 1) : Infinity
    const fim = inicio + duracao
    return mes >= inicio && mes < fim ? total + (Number(d.valor) || 0) : total
  }, 0)
}

/** Snapshot do mês 0 (hoje). */
export function despesaMensalAtual(despesas: DespesaItem[]): number {
  return despesaMensalEm(despesas, 0)
}

export function labelDespesa(d: DespesaItem): string {
  if (!d.temporaria) return "Contínua"
  const inicio = Math.max(0, Number(d.inicioMeses) || 0)
  const duracao = d.duracaoMeses != null ? Number(d.duracaoMeses) : null
  if (duracao == null) return `A partir do mês ${inicio}`
  return `Mês ${inicio}–${inicio + duracao - 1}`
}

export function getDespesas(dadosPessoais: {
  despesas?: DespesaItem[]
  despesa?: number
}): DespesaItem[] {
  return normalizarDespesas(dadosPessoais.despesas, dadosPessoais.despesa)
}
