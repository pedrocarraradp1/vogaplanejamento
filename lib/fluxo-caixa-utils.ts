import type { DadosPessoais, Objetivo, Passivo, Premissas } from "@/lib/plano-context"
import { calcularFluxoAnual } from "@/lib/engine"

export interface FluxoMesRealizado {
  rentabilidade: number
  receita: number
  despesa: number
}

export interface FluxoDeCaixaState {
  modoRealizado: "mensal" | "anual"
  meses: FluxoMesRealizado[]
  anualUnico: FluxoMesRealizado
}

export const MESES_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
] as const

export const MESES_LABELS_COMPLETOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
] as const

/** Paleta oficial Voga — hex exatos para Fluxo de Caixa */
export const VOGA_PALETA = {
  navy: "#1B2A4A",
  dourado: "#C9A84C",
  verde: "#10B981",
  vermelho: "#EF4444",
  laranja: "#F97316",
  cinza: "#64748B",
  diffVerde: "#065f46",
  diffVermelho: "#991B1B",
} as const

export const CORES_FLUXO_CAIXA = {
  rentabilidade: VOGA_PALETA.dourado,
  receita: VOGA_PALETA.verde,
  despesa: VOGA_PALETA.vermelho,
  saldoAcumulado: VOGA_PALETA.navy,
  orcado: VOGA_PALETA.navy,
  realizado: VOGA_PALETA.verde,
  aportes: VOGA_PALETA.verde,
  passivos: VOGA_PALETA.vermelho,
  objetivos: VOGA_PALETA.laranja,
  outros: VOGA_PALETA.cinza,
  diffPositiva: VOGA_PALETA.diffVerde,
  diffNegativa: VOGA_PALETA.diffVermelho,
} as const

export function mesVazio(): FluxoMesRealizado {
  return { rentabilidade: 0, receita: 0, despesa: 0 }
}

export function criarFluxoDeCaixaInicial(): FluxoDeCaixaState {
  return {
    modoRealizado: "mensal",
    meses: Array.from({ length: 12 }, () => mesVazio()),
    anualUnico: mesVazio(),
  }
}

export function normalizarFluxoDeCaixa(raw: unknown): FluxoDeCaixaState {
  const base = criarFluxoDeCaixaInicial()
  if (!raw || typeof raw !== "object") return base
  const r = raw as Partial<FluxoDeCaixaState>
  const normMes = (m: unknown): FluxoMesRealizado => {
    const x = (m ?? {}) as Partial<FluxoMesRealizado>
    return {
      rentabilidade: Number(x.rentabilidade) || 0,
      receita: Number(x.receita) || 0,
      despesa: Number(x.despesa) || 0,
    }
  }
  return {
    modoRealizado: r.modoRealizado === "anual" ? "anual" : "mensal",
    meses: Array.from({ length: 12 }, (_, i) => normMes(Array.isArray(r.meses) ? r.meses[i] : null)),
    anualUnico: normMes(r.anualUnico),
  }
}

/** Meses efetivos para cálculo: no modo anual, replica o valor único; no mensal, usa os 12 lançamentos. */
export function mesesEfetivos(fluxo: FluxoDeCaixaState): FluxoMesRealizado[] {
  if (fluxo.modoRealizado === "anual") {
    const u = fluxo.anualUnico
    return Array.from({ length: 12 }, () => ({ ...u }))
  }
  return fluxo.meses.map((m) => ({ ...m }))
}

export function fluxoLiquidoMes(m: FluxoMesRealizado): number {
  return (m.rentabilidade || 0) + (m.receita || 0) - (m.despesa || 0)
}

export interface MesRealizadoCalculado {
  mes: number
  label: string
  labelCompleto: string
  rentabilidade: number
  receita: number
  despesa: number
  fluxoLiquido: number
  saldoAcumulado: number
  /** Despesa negativa para gráfico divergente */
  despesaNeg: number
}

export function calcularRealizadoMensal(fluxo: FluxoDeCaixaState): MesRealizadoCalculado[] {
  const meses = mesesEfetivos(fluxo)
  let acumulado = 0
  return meses.map((m, i) => {
    const fluxoLiq = fluxoLiquidoMes(m)
    acumulado += fluxoLiq
    return {
      mes: i,
      label: MESES_LABELS[i],
      labelCompleto: MESES_LABELS_COMPLETOS[i],
      rentabilidade: m.rentabilidade,
      receita: m.receita,
      despesa: m.despesa,
      fluxoLiquido: fluxoLiq,
      saldoAcumulado: acumulado,
      despesaNeg: -(m.despesa || 0),
    }
  })
}

export interface OrcadoMensal {
  rentabilidade: number
  receita: number
  despesa: number
}

/** Orçado mensal derivado das premissas e dados pessoais. */
export function calcularOrcadoMensal(
  premissas: Premissas,
  dadosPessoais: DadosPessoais,
  saldoInicial: number,
): OrcadoMensal {
  const rendAnual = Math.max(0, Number(premissas.rendimento) || 0) / 100
  const rentabilidade = Math.max(0, saldoInicial) * rendAnual / 12
  return {
    rentabilidade,
    receita: Math.max(0, Number(dadosPessoais.renda) || 0),
    despesa: Math.max(0, Number(dadosPessoais.despesa) || 0),
  }
}

export interface MesOrcadoVsRealizado {
  mes: number
  label: string
  labelCompleto: string
  orcadoAcumulado: number
  realizadoAcumulado: number
  orcadoMes: number
  realizadoMes: number
  diferenca: number
}

export function calcularOrcadoVsRealizado(
  fluxo: FluxoDeCaixaState,
  premissas: Premissas,
  dadosPessoais: DadosPessoais,
  saldoInicial: number,
): MesOrcadoVsRealizado[] {
  const realizado = calcularRealizadoMensal(fluxo)
  const orc = calcularOrcadoMensal(premissas, dadosPessoais, saldoInicial)
  const fluxoOrcadoMes = fluxoLiquidoMes(orc)

  let acumOrc = 0
  let acumReal = 0

  return realizado.map((r, i) => {
    acumOrc += fluxoOrcadoMes
    acumReal = r.saldoAcumulado
    return {
      mes: i,
      label: r.label,
      labelCompleto: r.labelCompleto,
      orcadoAcumulado: acumOrc,
      realizadoAcumulado: acumReal,
      orcadoMes: fluxoOrcadoMes,
      realizadoMes: r.fluxoLiquido,
      diferenca: acumReal - acumOrc,
    }
  })
}

export interface CategoriaAnualOrcada {
  rentabilidade: number
  aportes: number
  passivos: number
  objetivos: number
  outros: number
}

export interface AnoProjecaoOrcada {
  ano: number
  t: number
  categorias: CategoriaAnualOrcada
  entradasTotal: number
  saidasTotal: number
  fluxoLiquido: number
}

export function calcularProjecaoAnualOrcada(
  premissasCompletas: Premissas,
  objetivos: Objetivo[],
  passivos: Passivo[],
  displayMode: "real" | "nominal",
  anoInicio: number,
  anoFim: number,
): AnoProjecaoOrcada[] {
  const objetivosEngine = objetivos.map((o) => ({
    id: o.id,
    descricao: o.descricao,
    prazoAnos: o.prazoAnos,
    valor: o.valor,
    recorrente: o.recorrente,
    frequenciaAnos: o.frequenciaAnos,
    duracaoTipo: o.duracaoTipo,
    duracaoAnos: o.duracaoAnos,
  }))

  const rows = calcularFluxoAnual(
    premissasCompletas,
    objetivosEngine,
    passivos,
    Number(premissasCompletas.aliquotaImpostoRendimento) || 0.15,
    displayMode,
  )

  const inf = Math.max(0, Number(premissasCompletas.inflacao) || 0) / 100

  return rows
    .map((row) => {
      const ano = anoInicio + row.t
      const deflator = Math.pow(1 + inf, Math.max(0, row.t))
      const scale = (v: number) =>
        displayMode === "real" ? v / deflator : v

      const rentabilidade = scale(row.rendimento)
      const aportes = scale(row.aporte)
      const passivosVal = scale(row.dividas)
      const objetivosVal = scale(row.objetivos)
      const outros = scale(
        row.retirada + row.ir + row.previdencia + row.inss + row.complemento + row.extra,
      )

      const entradasTotal = rentabilidade + aportes
      const saidasTotal = passivosVal + objetivosVal + outros

      return {
        ano,
        t: row.t,
        categorias: {
          rentabilidade,
          aportes,
          passivos: passivosVal,
          objetivos: objetivosVal,
          outros,
        },
        entradasTotal,
        saidasTotal,
        fluxoLiquido: entradasTotal - saidasTotal,
      }
    })
    .filter((r) => r.ano >= anoInicio && r.ano <= anoFim)
}

export function rotuloStepAnos(qtd: number): number {
  return Math.max(1, Math.ceil(qtd / 12))
}

export function deveMostrarRotuloAno(
  ano: number,
  anoInicio: number,
  anoFim: number,
  step: number,
): boolean {
  if (ano === anoFim) return true
  return (ano - anoInicio) % step === 0
}

export function formatBRL(value: number, moeda: "BRL" | "USD" = "BRL"): string {
  return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: moeda === "USD" ? "USD" : "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "—"
  return `${value.toFixed(1).replace(".", ",")}%`
}
