/**
 * Extrai premioMensal / premioAnual de respostas MAG.
 *
 * A MAG retorna `premioBase` por R$1.000 de capital em cada cobertura.
 * Para obter o prêmio mensal total da cobertura principal (morte),
 * multiplica-se: premioBase * (capitalSegurado / 1000).
 * Em seguida aplica-se calibração atuarial → comercial (interpolar).
 *
 * Se a resposta já trouxer `premioMensal` direto, usa esse valor.
 */

const CALIBRACAO_PUROS = [1594.23, 1931.0, 2679.0, 4060.0, 6482.0]
const CALIBRACAO_REAIS = [7602.87, 8901.88, 11209.2, 14240.87, 18243.25]

/** Converte prêmio mensal puro (taxa atuarial) em prêmio comercial calibrado. */
export function interpolar(premioMensalPuro: number): number {
  const xs = CALIBRACAO_PUROS
  const ys = CALIBRACAO_REAIS
  if (premioMensalPuro <= xs[0]) return premioMensalPuro * (ys[0] / xs[0])
  if (premioMensalPuro >= xs[xs.length - 1]) {
    return premioMensalPuro * (ys[ys.length - 1] / xs[xs.length - 1])
  }
  for (let i = 0; i < xs.length - 1; i++) {
    if (premioMensalPuro >= xs[i] && premioMensalPuro <= xs[i + 1]) {
      const t = (premioMensalPuro - xs[i]) / (xs[i + 1] - xs[i])
      return ys[i] + t * (ys[i + 1] - ys[i])
    }
  }
  return premioMensalPuro
}

export function extrairPremiosMag(
  json: unknown,
  capitalSegurado?: number,
): {
  premioMensal?: number
  premioAnual?: number
  premioBaseMorte?: number
} {
  let premioMensal: number | undefined
  let premioAnual: number | undefined
  let premioBaseMorte: number | undefined

  const walk = (obj: unknown): void => {
    if (obj === null || typeof obj !== "object") return
    const rec = obj as Record<string, unknown>

    if (typeof rec.premioMensal === "number") premioMensal = rec.premioMensal
    if (typeof rec.premioAnual === "number") premioAnual = rec.premioAnual

    if (typeof rec.idProduto === "number" && Array.isArray(rec.coberturas)) {
      const desc = String(rec.descricao ?? "").toUpperCase()
      // Produto correto: 2111 (WHOLE LIFE 2019) — não mais 2011 (VIR)
      const isWholeLife =
        rec.idProduto === 2111 ||
        (desc.includes("WHOLE LIFE") && !desc.includes("DECRESCENTE"))
      const isVIR =
        rec.idProduto === 2011 ||
        (desc.includes("MORTE") &&
          !desc.includes("ACIDENTAL") &&
          !desc.includes("DECRESCENTE") &&
          !desc.includes("WHOLE LIFE"))

      if (isWholeLife || isVIR) {
        const cob = rec.coberturas[0] as Record<string, unknown> | undefined
        if (cob && typeof cob.premioBase === "number" && cob.premioBase > 0) {
          if (isWholeLife) {
            premioBaseMorte = cob.premioBase
          } else if (premioBaseMorte === undefined) {
            premioBaseMorte = cob.premioBase
          }
        }
      }
    }

    for (const v of Object.values(rec)) {
      if (v !== null && typeof v === "object") walk(v)
    }
  }

  walk(json)

  // 1. Prêmio puro a partir da taxa atuarial (premioBase × capital/1000)
  if (premioMensal === undefined && premioBaseMorte != null && capitalSegurado && capitalSegurado > 0) {
    const premioMensalPuro = premioBaseMorte * (capitalSegurado / 1000)
    // 2. Calibração obrigatória atuarial → comercial
    const premioFinal = interpolar(premioMensalPuro)
    console.log("PREMIO PURO:", premioMensalPuro, "→ CALIBRADO:", premioFinal)
    premioMensal = premioFinal
  }

  if (premioMensal === undefined && typeof premioAnual === "number") {
    premioMensal = premioAnual / 12
  }
  if (premioAnual === undefined && typeof premioMensal === "number") {
    premioAnual = premioMensal * 12
  }

  return { premioMensal, premioAnual, premioBaseMorte }
}
