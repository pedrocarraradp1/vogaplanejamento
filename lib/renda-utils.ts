import type { DespesaItem } from "@/lib/despesa-utils"
import { despesaMensalEm, despesaMensalAtual } from "@/lib/despesa-utils"

export type TipoFonteRenda = "salario" | "aluguel" | "venda_participacao" | "outros"

export type PrazoFonteRenda =
  | { tipo: "continua" }
  | { tipo: "ate_data"; anoFim: number; mesFim: number }
  | { tipo: "evento_unico"; ano: number; mes: number }

export interface FonteRenda {
  id: string
  tipo: TipoFonteRenda
  descricao: string
  valorMensal: number
  prazo: PrazoFonteRenda
}

export const TIPOS_FONTE_RENDA: Record<
  TipoFonteRenda,
  { label: string; descricaoPadrao: string }
> = {
  salario: { label: "Salário", descricaoPadrao: "Salário" },
  aluguel: { label: "Aluguel", descricaoPadrao: "Aluguel" },
  venda_participacao: { label: "Venda de participação", descricaoPadrao: "Venda de participação" },
  outros: { label: "Outros", descricaoPadrao: "Outros" },
}

export function criarFonteRenda(partial?: Partial<FonteRenda>): FonteRenda {
  const tipo = partial?.tipo ?? "salario"
  const meta = TIPOS_FONTE_RENDA[tipo]
  const ano = new Date().getFullYear()
  return {
    id: partial?.id ?? `fr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    tipo,
    descricao: partial?.descricao ?? meta.descricaoPadrao,
    valorMensal: Number(partial?.valorMensal) || 0,
    prazo: partial?.prazo ?? { tipo: "continua" },
  }
}

export function normalizarPrazoFonte(raw: unknown): PrazoFonteRenda {
  const p = raw as Partial<PrazoFonteRenda> | null | undefined
  if (p?.tipo === "ate_data") {
    return {
      tipo: "ate_data",
      anoFim: Number((p as { anoFim?: number }).anoFim) || new Date().getFullYear(),
      mesFim: Math.min(12, Math.max(1, Number((p as { mesFim?: number }).mesFim) || 12)),
    }
  }
  if (p?.tipo === "evento_unico") {
    return {
      tipo: "evento_unico",
      ano: Number((p as { ano?: number }).ano) || new Date().getFullYear(),
      mes: Math.min(12, Math.max(1, Number((p as { mes?: number }).mes) || 1)),
    }
  }
  return { tipo: "continua" }
}

export function normalizarFonteRenda(raw: unknown): FonteRenda {
  const r = raw as Partial<FonteRenda> | null | undefined
  const tipo = (r?.tipo as TipoFonteRenda) ?? "salario"
  const tipoValido =
    tipo === "salario" || tipo === "aluguel" || tipo === "venda_participacao" || tipo === "outros"
      ? tipo
      : "outros"
  return {
    id: String(r?.id ?? `fr-${Date.now()}`),
    tipo: tipoValido,
    descricao: String(r?.descricao ?? TIPOS_FONTE_RENDA[tipoValido].descricaoPadrao),
    valorMensal: Number(r?.valorMensal) || 0,
    prazo: normalizarPrazoFonte(r?.prazo),
  }
}

export function normalizarFontesRenda(raw: unknown, legacyRenda = 0): FonteRenda[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map(normalizarFonteRenda)
  }
  const renda = Number(legacyRenda) || 0
  if (renda > 0) {
    return [
      criarFonteRenda({
        id: "legacy-renda",
        tipo: "salario",
        descricao: "Renda mensal",
        valorMensal: renda,
        prazo: { tipo: "continua" },
      }),
    ]
  }
  return []
}

/** Fonte vigente no mês/ano calendário indicado. */
export function fonteAtivaEm(fonte: FonteRenda, ano: number, mes: number): boolean {
  const m = Math.min(12, Math.max(1, mes))
  const prazo = fonte.prazo

  if (prazo.tipo === "continua") return true

  if (prazo.tipo === "ate_data") {
    if (ano < prazo.anoFim) return true
    if (ano > prazo.anoFim) return false
    return m <= prazo.mesFim
  }

  if (prazo.tipo === "evento_unico") {
    return ano === prazo.ano && m === prazo.mes
  }

  return false
}

export function receitaMensalEm(fontes: FonteRenda[], ano: number, mes: number): number {
  return fontes.reduce((s, f) => {
    if (!fonteAtivaEm(f, ano, mes)) return s
    return s + (Number(f.valorMensal) || 0)
  }, 0)
}

export function receitaMensalAtual(fontes: FonteRenda[], ref = new Date()): number {
  return receitaMensalEm(fontes, ref.getFullYear(), ref.getMonth() + 1)
}

function mesCalendarioAPartirDe(ref: Date, mesSimulacao: number): { ano: number; mes: number } {
  const d = new Date(ref)
  d.setDate(1)
  d.setMonth(d.getMonth() + Math.max(0, Math.floor(mesSimulacao)))
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}

export function aporteMensalEm(
  fontes: FonteRenda[],
  despesas: DespesaItem[],
  mesSimulacao: number,
  ref = new Date(),
): number {
  const { ano, mes } = mesCalendarioAPartirDe(ref, mesSimulacao)
  const receita = receitaMensalEm(fontes, ano, mes)
  const despesa = despesaMensalEm(despesas, mesSimulacao)
  return Math.max(0, receita - despesa)
}

/** @deprecated Use `aporteMensalEm(fontes, despesas, mesSimulacao)`. */
export function aporteMensalEmLegado(
  fontes: FonteRenda[],
  despesaFixa: number,
  ano: number,
  mes: number,
): number {
  return Math.max(0, receitaMensalEm(fontes, ano, mes) - (Number(despesaFixa) || 0))
}

export function buildAportePorAnoNominal(
  fontes: FonteRenda[],
  despesas: DespesaItem[],
  prazo: number,
  inflacaoPct: number,
  anoBase = new Date().getFullYear(),
  ref = new Date(),
): number[] {
  const inf = (Number(inflacaoPct) || 0) / 100
  const horizonte = Math.max(0, prazo)

  return Array.from({ length: horizonte + 1 }, (_, t) => {
    const fatorInf = Math.pow(1 + inf, t)
    let sumReal = 0
    for (let m = 0; m < 12; m++) {
      const mesSim = t * 12 + m
      sumReal += aporteMensalEm(fontes, despesas, mesSim, ref)
    }
    const monthlyEquivReal = sumReal / 12
    return monthlyEquivReal * fatorInf
  })
}

export function aporteMensalAtual(
  fontes: FonteRenda[],
  despesas: DespesaItem[],
  ref = new Date(),
): number {
  return aporteMensalEm(fontes, despesas, 0, ref)
}

export function labelPrazoFonte(prazo: PrazoFonteRenda): string {
  if (prazo.tipo === "continua") return "Contínua"
  if (prazo.tipo === "ate_data") {
    const mm = String(prazo.mesFim).padStart(2, "0")
    return `Até ${mm}/${prazo.anoFim}`
  }
  const mm = String(prazo.mes).padStart(2, "0")
  return `Evento · ${mm}/${prazo.ano}`
}

export function mesesLabel(mes: number): string {
  return (
    ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][
      Math.min(11, Math.max(0, mes - 1))
    ] ?? ""
  )
}

export interface BlocoAporte {
  i: number
  inicio: number
  fim: number
}

export const BLOCO_APORTE_ANOS = 5

/** Anos de acumulação (índices 0..n-1) — aporte só até antes da aposentadoria. */
export function anosAcumulacaoAporte(idadeAtual: number, idadeApos: number): number {
  return Math.max(0, (Number(idadeApos) || 0) - Math.max(0, Number(idadeAtual) || 0))
}

/** Blocos de aporte personalizado (ex.: 5 anos), limitados à fase de acumulação. */
export function buildBlocosAporte(prazoAcumulacao: number, tamanhoBloco = BLOCO_APORTE_ANOS): BlocoAporte[] {
  const prazo = Math.max(0, Number(prazoAcumulacao) || 0)
  if (prazo === 0) return []

  const blocos = Math.ceil(prazo / tamanhoBloco)
  return Array.from({ length: blocos }, (_, i) => {
    const inicio = i * tamanhoBloco
    const fim = Math.min((i + 1) * tamanhoBloco, prazo)
    return { i, inicio, fim }
  })
}

/** Resolve aporteM e série anual nominal a partir das fontes de renda (e overrides manuais). */
export function resolveAporteParaPremissas(
  fontes: FonteRenda[],
  despesas: DespesaItem[],
  premissas: {
    prazo: number
    inflacao: number
    aporteModo: "fixo" | "periodos"
    aportePeriodosReal: number[]
    idadeApos?: number
    idadeAtual?: number
  },
  blocosAporte?: BlocoAporte[],
  anoBase = new Date().getFullYear(),
): { aporteM: number; aportePorAnoNominal: number[] } {
  const aporteM = aporteMensalAtual(fontes, despesas)
  const prazo = Math.max(0, Number(premissas.prazo) || 0)
  const fromFontes = buildAportePorAnoNominal(fontes, despesas, prazo, premissas.inflacao, anoBase)

  const anosAcum = anosAcumulacaoAporte(premissas.idadeAtual ?? 0, premissas.idadeApos ?? 0)
  const blocosEfetivos =
    blocosAporte ??
    (premissas.aporteModo === "periodos" ? buildBlocosAporte(anosAcum) : undefined)

  if (premissas.aporteModo !== "periodos" || !blocosEfetivos?.length) {
    return { aporteM, aportePorAnoNominal: fromFontes }
  }

  const inf = (Number(premissas.inflacao) || 0) / 100
  const periodos = premissas.aportePeriodosReal ?? []
  const byYear = [...fromFontes]

  for (const b of blocosEfetivos) {
    if (b.inicio >= anosAcum) continue
    const manualReal = periodos[b.i]
    if (manualReal === undefined || manualReal === null) continue
    const real = Number(manualReal) || 0
    const fimEfetivo = Math.min(b.fim, anosAcum)
    // anosDecorridos = t desde o ano 0 da simulação (nunca reinicia no bloco)
    for (let t = b.inicio; t < fimEfetivo; t++) {
      byYear[t] = real * Math.pow(1 + inf, t)
    }
  }

  for (let t = anosAcum; t <= prazo; t++) byYear[t] = 0

  if (prazo > 0 && prazo < anosAcum && byYear[prazo] === 0) {
    byYear[prazo] = byYear[prazo - 1] ?? 0
  }

  return { aporteM, aportePorAnoNominal: byYear }
}

export function getFontesRenda(dadosPessoais: {
  fontesRenda?: FonteRenda[]
  renda?: number
}): FonteRenda[] {
  return normalizarFontesRenda(dadosPessoais.fontesRenda, dadosPessoais.renda)
}
