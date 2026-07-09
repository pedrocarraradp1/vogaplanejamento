import { pathToFileURL } from "node:url"
import { resolve as resolvePath, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = resolvePath(dirname(fileURLToPath(import.meta.url)), "..")

function resolveLocal(specifier, parentURL) {
  const parentDir = parentURL ? dirname(fileURLToPath(parentURL)) : root
  const base = specifier.startsWith(".") ? resolvePath(parentDir, specifier) : null
  if (!base) return null
  const candidates = [`${base}.ts`, `${base}.tsx`, `${base}.js`, `${base}/index.ts`]
  for (const file of candidates) {
    try {
      return pathToFileURL(file).href
    } catch {
      // continue
    }
  }
  return pathToFileURL(`${base}.ts`).href
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2)
    const base = resolvePath(root, rel)
    const candidates = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`]
    for (const file of candidates) {
      try {
        return await nextResolve(pathToFileURL(file).href, context)
      } catch {
        // try next
      }
    }
  }

  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !/\.(ts|tsx|js|mjs|cjs|json)$/.test(specifier)
  ) {
    const href = resolveLocal(specifier, context.parentURL)
    if (href) {
      try {
        return await nextResolve(href, context)
      } catch {
        // fall through
      }
    }
  }

  return nextResolve(specifier, context)
}
