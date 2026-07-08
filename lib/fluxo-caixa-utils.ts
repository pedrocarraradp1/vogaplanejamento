import type { DadoFluxoGrafico } from "@/lib/projecao-graficos-dados"
import { VOGA } from "@/lib/voga-tokens"

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

/** Paleta oficial Voga */
export const VOGA_PALETA = VOGA
/** Exceção semântica: usada apenas na aba Fluxo de Caixa (mensal). */
export const CORES_FLUXO_CAIXA = {
  rentabilidade: "var(--fluxo-entrada)",
  receita: "var(--fluxo-entrada)",
  despesa: "var(--voga-alerta)",
  saldoAcumulado: "var(--voga-concreto)",
  orcado: "var(--voga-concreto)",
  realizado: "var(--voga-brasilia)",
  aportes: "var(--voga-brasilia)",
  passivos: "var(--voga-alerta)",
  objetivos: "var(--fluxo-objetivos)",
  outros: "var(--voga-concreto)",
  diffPositiva: "var(--fluxo-entrada)",
  diffNegativa: "var(--voga-alerta)",
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

/** Mensaliza o orçado do 1º ano da projeção (mesma fonte do gráfico Fluxo Anual). */
export function mensalizarOrcadoPrimeiroAno(
  rendimentoAnual: number,
  aporteAnual: number,
  saidasAnual: number,
  patrimonioInicio: number,
  taxaAnualLiquida: number,
): FluxoMesRealizado[] {
  const taxaMensal = Math.pow(1 + taxaAnualLiquida, 1 / 12) - 1
  const receitaM = aporteAnual / 12
  const despesaM = saidasAnual / 12

  let pat = patrimonioInicio
  const meses: FluxoMesRealizado[] = []
  let rentAcum = 0

  for (let m = 0; m < 11; m++) {
    const rent = pat * taxaMensal
    rentAcum += rent
    meses.push({ rentabilidade: rent, receita: receitaM, despesa: despesaM })
    pat = pat * (1 + taxaMensal) + receitaM - despesaM
  }

  meses.push({
    rentabilidade: rendimentoAnual - rentAcum,
    receita: receitaM,
    despesa: despesaM,
  })

  return meses
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
  primeiroAnoFluxo: DadoFluxoGrafico,
  patrimonioInicio: number,
  taxaAnualLiquida: number,
): MesOrcadoVsRealizado[] {
  const realizado = calcularRealizadoMensal(fluxo)
  const mesesOrcado = mensalizarOrcadoPrimeiroAno(
    primeiroAnoFluxo.rendimento,
    primeiroAnoFluxo.aporte,
    primeiroAnoFluxo.saidasTotal,
    patrimonioInicio,
    taxaAnualLiquida,
  )

  let acumOrc = 0

  return realizado.map((r, i) => {
    const orc = mesesOrcado[i] ?? mesVazio()
    const fluxoOrc = fluxoLiquidoMes(orc)
    acumOrc += fluxoOrc
    return {
      mes: i,
      label: r.label,
      labelCompleto: r.labelCompleto,
      orcadoAcumulado: acumOrc,
      realizadoAcumulado: r.saldoAcumulado,
      orcadoMes: fluxoOrc,
      realizadoMes: r.fluxoLiquido,
      diferenca: r.saldoAcumulado - acumOrc,
    }
  })
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

/** Saídas de caixa: sinal negativo explícito (ex.: -R$ 30.000). */
export function formatBRLSaida(value: number, moeda: "BRL" | "USD" = "BRL"): string {
  if (value === 0) return formatBRL(0, moeda)
  return formatBRL(-Math.abs(value), moeda)
}

/** Aplica polaridade de saída a um formatador arbitrário (gráficos com moeda custom). */
export function formatMoedaSaida(formatar: (v: number) => string, value: number): string {
  if (value === 0) return formatar(0)
  return formatar(-Math.abs(value))
}

export function formatPct(value: number): string {
  if (!Number.isFinite(value)) return "—"
  return `${value.toFixed(1).replace(".", ",")}%`
}
