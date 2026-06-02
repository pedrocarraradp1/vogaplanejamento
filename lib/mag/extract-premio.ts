/**
 * Extrai premioMensal / premioAnual de respostas MAG.
 *
 * A MAG retorna `premioBase` por R$1.000 de capital em cada cobertura.
 * Para obter o prêmio mensal total da cobertura principal (morte),
 * multiplica-se: premioBase * (capitalSegurado / 1000).
 *
 * Se a resposta já trouxer `premioMensal` direto, usa esse valor.
 */
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
      // Produto 2111 = WHOLE LIFE 2019 (PR Solutions)
      if (
        (typeof rec.idProduto === "number" && rec.idProduto === 2111) ||
        (desc.includes("WHOLE LIFE") && !desc.includes("DECRESCENTE"))
      ) {
        const cob = rec.coberturas[0] as Record<string, unknown> | undefined
        if (cob && typeof cob.premioBase === "number" && cob.premioBase > 0) {
          premioBaseMorte = cob.premioBase
        }
      }
    }

    for (const v of Object.values(rec)) {
      if (v !== null && typeof v === "object") walk(v)
    }
  }

  walk(json)

  if (premioMensal === undefined && premioBaseMorte != null && capitalSegurado && capitalSegurado > 0) {
    premioMensal = premioBaseMorte * (capitalSegurado / 1000)
  }

  if (premioMensal === undefined && typeof premioAnual === "number") {
    premioMensal = premioAnual / 12
  }
  if (premioAnual === undefined && typeof premioMensal === "number") {
    premioAnual = premioMensal * 12
  }

  return { premioMensal, premioAnual, premioBaseMorte }
}
