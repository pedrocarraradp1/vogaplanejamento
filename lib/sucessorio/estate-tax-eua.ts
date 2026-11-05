import { impostoPorFaixas, type FaixaItcmd, type MemoriaFaixa } from "./itcmd-uf.ts"

/** Crédito unificado do não residente (IRC) — isenção equivalente a US$ 60.000. */
export const CREDITO_NAO_RESIDENTE_USD = 13_000
export const ISENCAO_EQUIVALENTE_NAO_RESIDENTE_USD = 60_000

/** Tabela federal de estate tax (18% a 40%). */
export const FAIXAS_ESTATE_TAX: FaixaItcmd[] = [
  { ate: 10_000, aliquota: 0.18 },
  { ate: 20_000, aliquota: 0.2 },
  { ate: 40_000, aliquota: 0.22 },
  { ate: 60_000, aliquota: 0.24 },
  { ate: 80_000, aliquota: 0.26 },
  { ate: 100_000, aliquota: 0.28 },
  { ate: 150_000, aliquota: 0.3 },
  { ate: 250_000, aliquota: 0.32 },
  { ate: 500_000, aliquota: 0.34 },
  { ate: 750_000, aliquota: 0.37 },
  { ate: 1_000_000, aliquota: 0.39 },
  { ate: Number.POSITIVE_INFINITY, aliquota: 0.4 },
]

export type ResultadoEstateTax = {
  bensUSD: number
  impostoTentativo: number
  credito: number
  imposto: number
  aliquotaEfetiva: number
  liquidoUSD: number
  liquidoBRL: number | null
  cambio: number | null
  memoria: MemoriaFaixa[]
}

export function calcularEstateTax(bensUSD: number, cambio?: number): ResultadoEstateTax {
  const bens = Math.max(0, Number(bensUSD) || 0)
  const { imposto: impostoTentativo, memoria } = impostoPorFaixas(bens, FAIXAS_ESTATE_TAX)
  const credito = bens > 0 ? CREDITO_NAO_RESIDENTE_USD : 0
  const imposto = Math.max(0, impostoTentativo - credito)
  const aliquotaEfetiva = bens > 0 ? imposto / bens : 0
  const liquidoUSD = bens - imposto
  const fx = cambio != null && Number.isFinite(Number(cambio)) ? Number(cambio) : null

  return {
    bensUSD: bens,
    impostoTentativo,
    credito,
    imposto,
    aliquotaEfetiva,
    liquidoUSD,
    liquidoBRL: fx != null ? liquidoUSD * fx : null,
    cambio: fx,
    memoria,
  }
}
