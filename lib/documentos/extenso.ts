const UNIDADES = [
  "",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
]
const DEZ_A_DEZENOVE = [
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
]
const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
]
const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
]

function grupoDeTres(n: number): string {
  if (n === 0) return ""
  if (n === 100) return "cem"
  const c = Math.floor(n / 100)
  const d = Math.floor((n % 100) / 10)
  const u = n % 10
  const partes: string[] = []
  if (c) partes.push(CENTENAS[c])
  const resto = n % 100
  if (resto >= 10 && resto <= 19) partes.push(DEZ_A_DEZENOVE[resto - 10])
  else {
    if (d) partes.push(DEZENAS[d])
    if (u) partes.push(UNIDADES[u])
  }
  return partes.join(" e ")
}

function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero"
  const milhoes = Math.floor(n / 1_000_000)
  const milhares = Math.floor((n % 1_000_000) / 1000)
  const resto = n % 1000
  const partes: string[] = []
  if (milhoes) {
    partes.push(
      milhoes === 1 ? "um milhão" : `${grupoDeTres(milhoes)} milhões`,
    )
  }
  if (milhares) {
    partes.push(milhares === 1 ? "mil" : `${grupoDeTres(milhares)} mil`)
  }
  if (resto) partes.push(grupoDeTres(resto))
  if (partes.length === 0) return "zero"
  if (partes.length === 1) return partes[0]
  return partes.join(" e ")
}

/** Valor monetário em reais por extenso (pt-BR). */
export function valorPorExtenso(valor: number): string {
  const n = Math.round((Number(valor) || 0) * 100) / 100
  const inteiro = Math.floor(Math.abs(n))
  const centavos = Math.round((Math.abs(n) - inteiro) * 100)
  const reais =
    inteiro === 0
      ? "zero reais"
      : inteiro === 1
        ? "um real"
        : `${inteiroPorExtenso(inteiro)} reais`
  if (centavos === 0) return reais
  const cents = centavos === 1 ? "um centavo" : `${inteiroPorExtenso(centavos)} centavos`
  if (inteiro === 0) return cents
  return `${reais} e ${cents}`
}
