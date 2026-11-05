export type TipoCampoTemplate =
  | "texto"
  | "textarea"
  | "cpf"
  | "cnpj"
  | "cep"
  | "moeda"
  | "data"
  | "uf"

export type CampoTemplate = {
  chave: string
  label: string
  tipo: TipoCampoTemplate
  origem?: string
}

export type DocumentoTemplate = {
  id: string
  titulo: string
  campos: CampoTemplate[]
  corpo: string
}

export function parseDocumentoTemplate(md: string): DocumentoTemplate {
  const trimmed = md.trim()
  if (!trimmed.startsWith("---")) {
    throw new Error("Template sem frontmatter")
  }
  const fim = trimmed.indexOf("\n---", 3)
  if (fim < 0) throw new Error("Frontmatter não fechado")
  const json = trimmed.slice(3, fim).trim()
  const meta = JSON.parse(json) as {
    id: string
    titulo: string
    campos: CampoTemplate[]
  }
  const corpo = trimmed.slice(fim + 4).replace(/^\s*\n/, "")
  return {
    id: meta.id,
    titulo: meta.titulo,
    campos: meta.campos ?? [],
    corpo,
  }
}
