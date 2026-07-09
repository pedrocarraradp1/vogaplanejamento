import type { Passivo } from "@/lib/plano-context"

export type ModeloAmortizacao = "PRICE" | "SAC" | "AMERICANA" | "OUTRO"

export const MODELOS_AMORTIZACAO: { value: ModeloAmortizacao; label: string }[] = [
  { value: "PRICE", label: "Price" },
  { value: "SAC", label: "SAC" },
  { value: "AMERICANA", label: "Americano" },
  { value: "OUTRO", label: "Outro" },
]

export interface CalculoAmortizacao {
  /** Primeira parcela (ou parcela fixa no Price). */
  parcela: number
  saldoDevedor: (mes: number) => number
}

export function taxaMensalDecimal(taxaJurosMensalPct: number): number {
  return Math.max(0, Number(taxaJurosMensalPct) || 0) / 100
}

export function calcularPrice(
  valorPrincipal: number,
  taxaJurosMensal: number,
  prazoMeses: number,
): CalculoAmortizacao {
  const i = taxaJurosMensal
  const n = prazoMeses
  const parcela =
    i === 0 ? valorPrincipal / n : (valorPrincipal * i) / (1 - Math.pow(1 + i, -n))
  return {
    parcela,
    saldoDevedor: (mes) => {
      if (i === 0) return Math.max(0, valorPrincipal - (valorPrincipal / n) * mes)
      const saldo =
        (valorPrincipal * (Math.pow(1 + i, n) - Math.pow(1 + i, mes))) /
        (Math.pow(1 + i, n) - 1)
      return Math.max(0, saldo)
    },
  }
}

export function calcularSAC(
  valorPrincipal: number,
  taxaJurosMensal: number,
  prazoMeses: number,
): CalculoAmortizacao {
  const amortizacaoConstante = valorPrincipal / prazoMeses
  const primeiraParcela = amortizacaoConstante + valorPrincipal * taxaJurosMensal
  return {
    parcela: primeiraParcela,
    saldoDevedor: (mes) => Math.max(0, valorPrincipal - amortizacaoConstante * mes),
  }
}

/** Parcela do SAC no mês `mes` (1-indexado). */
export function parcelaSACNoMes(
  valorPrincipal: number,
  taxaJurosMensal: number,
  prazoMeses: number,
  mes: number,
): number {
  const amortizacaoConstante = valorPrincipal / prazoMeses
  const saldoDevedorAnterior = Math.max(0, valorPrincipal - amortizacaoConstante * (mes - 1))
  return amortizacaoConstante + saldoDevedorAnterior * taxaJurosMensal
}

export function calcularAmericano(
  valorPrincipal: number,
  taxaJurosMensal: number,
  prazoMeses: number,
): CalculoAmortizacao {
  const parcelaJuros = valorPrincipal * taxaJurosMensal
  return {
    parcela: parcelaJuros,
    saldoDevedor: (mes) => (mes >= prazoMeses ? 0 : valorPrincipal),
  }
}

export function calcularAmortizacao(
  modelo: ModeloAmortizacao,
  valorPrincipal: number,
  taxaJurosMensalPct: number,
  prazoMeses: number,
): CalculoAmortizacao | null {
  if (modelo === "OUTRO" || valorPrincipal <= 0 || prazoMeses <= 0) return null
  const i = taxaMensalDecimal(taxaJurosMensalPct)
  if (modelo === "PRICE") return calcularPrice(valorPrincipal, i, prazoMeses)
  if (modelo === "SAC") return calcularSAC(valorPrincipal, i, prazoMeses)
  if (modelo === "AMERICANA") return calcularAmericano(valorPrincipal, i, prazoMeses)
  return null
}

export function resolveModeloAmortizacao(passivo: Pick<Passivo, "modelo" | "parcelaMensal">): ModeloAmortizacao {
  const m = passivo.modelo
  if (m === "PRICE" || m === "SAC" || m === "AMERICANA") return m
  return "OUTRO"
}

export function parcelaDividaNoMes(
  passivo: Pick<
    Passivo,
    "saldoDevedor" | "valor" | "prazoRestanteMeses" | "prazo" | "taxaJurosMensal" | "taxa" | "modelo" | "parcelaMensal"
  >,
  mes: number,
): number {
  const valor =
    Number(passivo.saldoDevedor) > 0
      ? Number(passivo.saldoDevedor)
      : Math.max(0, Number(passivo.valor) || 0)
  const prazo =
    Number(passivo.prazoRestanteMeses) > 0
      ? Number(passivo.prazoRestanteMeses)
      : Math.max(0, Number(passivo.prazo) || 0)
  const taxaPct =
    Number(passivo.taxaJurosMensal) > 0
      ? Number(passivo.taxaJurosMensal)
      : Math.max(0, Number(passivo.taxa) || 0)

  if (prazo <= 0 || mes >= prazo) return 0

  const modelo = resolveModeloAmortizacao(passivo)
  if (modelo === "OUTRO") {
    return Math.max(0, Number(passivo.parcelaMensal) || 0)
  }

  const i = taxaMensalDecimal(taxaPct)

  if (modelo === "PRICE") {
    if (i === 0) return valor / prazo
    return (valor * i) / (1 - Math.pow(1 + i, -prazo))
  }

  if (modelo === "SAC") {
    return parcelaSACNoMes(valor, i, prazo, mes + 1)
  }

  if (modelo === "AMERICANA") {
    const juros = valor * i
    if (mes === prazo - 1) return juros + valor
    return juros
  }

  return 0
}

export function primeiraParcelaPassivo(
  passivo: Pick<
    Passivo,
    "saldoDevedor" | "valor" | "prazoRestanteMeses" | "prazo" | "taxaJurosMensal" | "taxa" | "modelo" | "parcelaMensal"
  >,
): number {
  const modelo = resolveModeloAmortizacao(passivo)
  if (modelo === "OUTRO") {
    return Math.max(0, Number(passivo.parcelaMensal) || 0)
  }
  const valor =
    Number(passivo.saldoDevedor) > 0
      ? Number(passivo.saldoDevedor)
      : Math.max(0, Number(passivo.valor) || 0)
  const prazo =
    Number(passivo.prazoRestanteMeses) > 0
      ? Number(passivo.prazoRestanteMeses)
      : Math.max(0, Number(passivo.prazo) || 0)
  const taxaPct =
    Number(passivo.taxaJurosMensal) > 0
      ? Number(passivo.taxaJurosMensal)
      : Math.max(0, Number(passivo.taxa) || 0)
  const calc = calcularAmortizacao(modelo, valor, taxaPct, prazo)
  return calc?.parcela ?? 0
}

export function totalPagamentosPassivo(
  passivo: Pick<
    Passivo,
    "saldoDevedor" | "valor" | "prazoRestanteMeses" | "prazo" | "taxaJurosMensal" | "taxa" | "modelo" | "parcelaMensal"
  >,
): number {
  const prazo =
    Number(passivo.prazoRestanteMeses) > 0
      ? Number(passivo.prazoRestanteMeses)
      : Math.max(0, Number(passivo.prazo) || 0)
  if (prazo <= 0) return 0
  let total = 0
  for (let mes = 0; mes < prazo; mes++) {
    total += parcelaDividaNoMes(passivo, mes)
  }
  return total
}

export function pagamentoPassivoAno(
  passivo: Pick<
    Passivo,
    "saldoDevedor" | "valor" | "prazoRestanteMeses" | "prazo" | "taxaJurosMensal" | "taxa" | "modelo" | "parcelaMensal"
  >,
  anoT: number,
): number {
  let total = 0
  for (let mes = anoT * 12; mes < (anoT + 1) * 12; mes++) {
    total += parcelaDividaNoMes(passivo, mes)
  }
  return total
}
