export type MoedaInput = "BRL" | "USD"

export function localeMoeda(moeda: MoedaInput = "BRL"): "pt-BR" | "en-US" {
  return moeda === "USD" ? "en-US" : "pt-BR"
}

/** Formata centavos inteiros para exibição (ex.: 5000000050 → "50.000.000,50"). */
export function formatarMoedaCentavos(
  valorEmCentavos: number,
  moeda: MoedaInput = "BRL",
): string {
  const valor = valorEmCentavos / 100
  return valor.toLocaleString(localeMoeda(moeda), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Extrai centavos de string digitada (lógica caixa eletrônico). */
export function extrairCentavos(digitado: string): number {
  const apenasDigitos = digitado.replace(/\D/g, "")
  return Number(apenasDigitos) || 0
}

export function valorDecimalParaCentavos(valor: number): number {
  return Math.round((Number(valor) || 0) * 100)
}

export function centavosParaValorDecimal(centavos: number): number {
  return centavos / 100
}

/** Formata valor decimal para exibição em input. */
export function formatarValorDecimal(valor: number, moeda: MoedaInput = "BRL"): string {
  return formatarMoedaCentavos(valorDecimalParaCentavos(valor), moeda)
}

/** Converte string digitada para valor decimal. */
export function parseValorDecimalDigitado(digitado: string): number {
  return centavosParaValorDecimal(extrairCentavos(digitado))
}
