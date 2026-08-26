/**
 * Modelos MAG de proposta / produto Whole Life.
 *
 * A75 + 2111 = WHOLE LIFE 2019 (SUSEP 2018) — taxas antigas, ainda válido.
 * ER6 + 3109 = WHOLE LIFE INTEGRAL (SUSEP 15414.625879/2024-98) — STG, cotações atuais da MAG.
 *
 * Troca o default aqui ou via MAG_MODELO_PROPOSTA. Produção continua em A75
 * até a MAG liberar ER6 (detecção pela MAG_API_URL stg/hmg).
 */

export const MAG_MODELO_A75 = "A75" as const
export const MAG_MODELO_ER6 = "ER6" as const
export type MagModeloProposta = typeof MAG_MODELO_A75 | typeof MAG_MODELO_ER6

export const MAG_PRODUTO_WHOLE_LIFE_A75 = 2111
export const MAG_PRODUTO_WHOLE_LIFE_ER6 = 3109

export type MagModeloSpec = {
  codigo: MagModeloProposta
  idProduto: number
  nome: string
  susep: string
  /** A75 usa calibração atuarial→comercial histórica. ER6 já vem na taxa da MAG. */
  calibrarPremioComercial: boolean
}

export const MAG_MODELOS: Record<MagModeloProposta, MagModeloSpec> = {
  A75: {
    codigo: MAG_MODELO_A75,
    idProduto: MAG_PRODUTO_WHOLE_LIFE_A75,
    nome: "WHOLE LIFE 2019",
    susep: "2018",
    calibrarPremioComercial: true,
  },
  ER6: {
    codigo: MAG_MODELO_ER6,
    idProduto: MAG_PRODUTO_WHOLE_LIFE_ER6,
    nome: "WHOLE LIFE INTEGRAL",
    susep: "15414.625879/2024-98",
    calibrarPremioComercial: false,
  },
}

/** Default da plataforma (STG). Volte para `"A75"` se precisar do modelo antigo. */
export const MODELO_PROPOSTA_ATUAL: MagModeloProposta = MAG_MODELO_ER6

export function isMagStg(): boolean {
  return /stg|hmg/i.test(process.env.MAG_API_URL ?? "")
}

export function parseMagModeloCodigo(
  raw?: string,
): { codigo: MagModeloProposta; anospag?: number } | null {
  const s = String(raw ?? "").trim().toUpperCase()
  const m = s.match(/^(A75|ER6)(?:[_-](\d+))?$/)
  if (!m) return null
  return {
    codigo: m[1] as MagModeloProposta,
    anospag: m[2] ? Number(m[2]) : undefined,
  }
}

/**
 * Modelo efetivo da cotação.
 * - Pedido explícito A75 ou ER6 é honrado em STG.
 * - ER6 em URL que não é STG cai para A75, salvo MAG_MODELO_PROPOSTA=ER6.
 */
export function modeloPropostaEfetivo(requested?: string): MagModeloSpec {
  const env = process.env.MAG_MODELO_PROPOSTA?.trim().toUpperCase()
  if (env === MAG_MODELO_A75 || env === MAG_MODELO_ER6) return MAG_MODELOS[env]

  const parsed = parseMagModeloCodigo(requested)
  const wanted = parsed?.codigo ?? MODELO_PROPOSTA_ATUAL

  if (wanted === MAG_MODELO_ER6 && !isMagStg()) {
    return MAG_MODELOS[MAG_MODELO_A75]
  }
  return MAG_MODELOS[wanted]
}
