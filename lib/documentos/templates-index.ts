import { readdirSync, readFileSync } from "fs"
import path from "path"
import { parseDocumentoTemplate, type DocumentoTemplate } from "./parse-template"

const DIR = path.join(process.cwd(), "lib", "documentos", "templates")

let cache: DocumentoTemplate[] | null = null

export function listarTemplates(): DocumentoTemplate[] {
  if (cache) return cache
  const files = readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .sort()
  cache = files.map((f) => {
    const raw = readFileSync(path.join(DIR, f), "utf8")
    return parseDocumentoTemplate(raw)
  })
  return cache
}

export function templatePorId(id: string): DocumentoTemplate | undefined {
  return listarTemplates().find((t) => t.id === id)
}
