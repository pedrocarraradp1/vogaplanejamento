const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

export function extrairCampos(texto: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const m of texto.matchAll(PLACEHOLDER)) {
    const chave = m[1]
    if (!seen.has(chave)) {
      seen.add(chave)
      out.push(chave)
    }
  }
  return out
}

export function preencherTexto(
  texto: string,
  campos: Record<string, string>,
  vazioEntreColchetes = true,
): string {
  return texto.replace(PLACEHOLDER, (_m, chave: string) => {
    const v = (campos[chave] ?? "").trim()
    if (v) return v
    return vazioEntreColchetes ? `[${chave}]` : ""
  })
}

export const RODAPE_MINUTA =
  "Minuta elaborada pelo Grupo Voga como apoio ao planejamento. Documento sujeito à revisão e adequação pelo advogado responsável."

export const CABECALHO_VOGA = "GRUPO VOGA — Planejamento Patrimonial e Sucessório"
