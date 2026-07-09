export interface EntradaCapital {
  id: string
  descricao: string
  /** Valor em poder de compra de hoje (real). */
  valor: number
  /** Idade em que a entrada pontual ocorre. */
  idade: number
}

export function criarEntradaCapital(partial?: Partial<EntradaCapital>): EntradaCapital {
  return {
    id: partial?.id ?? `entrada-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    descricao: partial?.descricao ?? "",
    valor: Number(partial?.valor) || 0,
    idade: Number(partial?.idade) || 0,
  }
}

/** Migra campo legado único e normaliza a lista persistida. */
export function normalizarEntradasCapitais(premissas: {
  entradasCapitais?: EntradaCapital[]
  novaEntrada?: number
  idadeEntrada?: number
}): EntradaCapital[] {
  const raw = Array.isArray(premissas.entradasCapitais) ? premissas.entradasCapitais : []
  const list = raw
    .map((e) => ({
      id: String(e?.id || criarEntradaCapital().id),
      descricao: String(e?.descricao || "").trim() || "Entrada",
      valor: Math.max(0, Number(e?.valor) || 0),
      idade: Math.max(0, Number(e?.idade) || 0),
    }))
    .filter((e) => e.valor > 0 && e.idade > 0)

  if (list.length > 0) return list

  const nova = Number(premissas.novaEntrada) || 0
  const idade = Number(premissas.idadeEntrada) || 0
  if (nova > 0 && idade > 0) {
    return [
      {
        id: "mig-entrada-legada",
        descricao: "Entrada extraordinária",
        valor: nova,
        idade,
      },
    ]
  }

  return []
}

/** Soma nominal das entradas pontuais que caem na idade informada (corrigidas pela inflação). */
export function entradaCapitalNominalNoAno(
  premissas: {
    entradasCapitais?: EntradaCapital[]
    novaEntrada?: number
    idadeEntrada?: number
  },
  idade: number,
  fatorInflacao: number,
): number {
  const entradas = normalizarEntradasCapitais(premissas)
  let total = 0
  for (const e of entradas) {
    if (e.idade === idade) total += e.valor * fatorInflacao
  }
  return total
}

export function totalEntradasCapitaisValorHoje(entradas: EntradaCapital[]): number {
  return entradas.reduce((s, e) => s + (Number(e.valor) || 0), 0)
}
