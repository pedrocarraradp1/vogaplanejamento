/** Extrai premioMensal / premioAnual de respostas MAG com estrutura variável. */

export function extrairPremiosMag(json: unknown): {
  premioMensal?: number
  premioAnual?: number
} {
  let premioMensal: number | undefined
  let premioAnual: number | undefined

  const walk = (obj: unknown): void => {
    if (obj === null || typeof obj !== "object") return
    const rec = obj as Record<string, unknown>
    if (typeof rec.premioMensal === "number") premioMensal = rec.premioMensal
    if (typeof rec.premioAnual === "number") premioAnual = rec.premioAnual
    for (const v of Object.values(rec)) {
      if (v !== null && typeof v === "object") walk(v)
    }
  }

  walk(json)

  if (premioMensal === undefined && typeof premioAnual === "number") {
    premioMensal = premioAnual / 12
  }
  if (premioAnual === undefined && typeof premioMensal === "number") {
    premioAnual = premioMensal * 12
  }

  return { premioMensal, premioAnual }
}
