/**
 * Compara modelo A75 vs ER6 e roda simulação nos dois (STG).
 *
 *   node --env-file=.env.local --experimental-strip-types --import ./scripts/test-register.mjs ./scripts/compare-mag-er6.ts
 */
import { writeFileSync } from "node:fs"
import { requestMAGToken } from "../lib/mag/auth.ts"

const CNPJ = (process.env.MAG_CNPJ || "27945275000154").replace(/\D/g, "")

function collectKeys(obj: unknown, prefix = "", out = new Set<string>()): Set<string> {
  if (obj === null || typeof obj !== "object") return out
  if (Array.isArray(obj)) {
    if (obj.length > 0) collectKeys(obj[0], prefix + "[]", out)
    return out
  }
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const p = prefix ? `${prefix}.${k}` : k
    out.add(p)
    collectKeys(v, p, out)
  }
  return out
}

function findProdutos(obj: unknown, acc: { id?: number; descricao?: string; codigo?: string }[] = []) {
  if (obj === null || typeof obj !== "object") return acc
  const rec = obj as Record<string, unknown>
  if (typeof rec.id === "number" && (rec.descricao || rec.descricaoComercial || rec.codigo)) {
    acc.push({
      id: rec.id,
      descricao: String(rec.descricao ?? rec.descricaoComercial ?? ""),
      codigo: rec.codigo != null ? String(rec.codigo) : undefined,
    })
  }
  if (typeof rec.idProduto === "number") {
    acc.push({
      id: rec.idProduto,
      descricao: String(rec.descricao ?? rec.nome ?? ""),
    })
  }
  for (const v of Object.values(rec)) {
    if (v && typeof v === "object") findProdutos(v, acc)
  }
  return acc
}

async function magFetch(apiUrl: string, token: string, path: string, init?: RequestInit) {
  const url = path.startsWith("http") ? path : `${apiUrl}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })
  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = text
  }
  return { status: res.status, parsed, text }
}

async function main() {
  const apiUrl = process.env.MAG_API_URL?.replace(/\/$/, "")
  if (!apiUrl) {
    console.error("MAG_API_URL não configurada")
    process.exit(1)
  }
  if (!apiUrl.includes("stg") && !apiUrl.includes("hmg")) {
    console.error("Recusa: MAG_API_URL não parece STG/HMG:", apiUrl)
    process.exit(1)
  }

  const tokenResult = await requestMAGToken()
  if (!tokenResult.ok) {
    console.error("auth falhou", tokenResult.status, tokenResult.body)
    process.exit(1)
  }
  const token = tokenResult.token

  for (const codigo of ["A75", "ER6"] as const) {
    const path = `/apiseguradora/v3/modeloproposta/${codigo}?cnpj=${CNPJ}&completo=true&version=1`
    console.log("\n=== MODELO", codigo, "===")
    const r = await magFetch(apiUrl, token, path)
    console.log("HTTP", r.status)
    writeFileSync(`scripts/.tmp-modelo-${codigo}.json`, typeof r.parsed === "string" ? r.parsed : JSON.stringify(r.parsed, null, 2))
    if (r.status !== 200) {
      console.log("erro:", typeof r.parsed === "string" ? r.parsed.slice(0, 500) : JSON.stringify(r.parsed).slice(0, 800))
      continue
    }
    const keys = [...collectKeys(r.parsed)].sort()
    console.log("chaves (amostra):", keys.slice(0, 80).join("\n  "))
    if (keys.length > 80) console.log(`  ... +${keys.length - 80} chaves`)
    const prods = findProdutos(r.parsed)
    const uniq = new Map(prods.map((p) => [`${p.id}-${p.descricao}`, p]))
    console.log("produtos encontrados:", JSON.stringify([...uniq.values()], null, 2))
  }

  const payload = {
    simulacoes: [
      {
        proponente: {
          tipoRelacaoSeguradoId: 1,
          nome: "SIMULACAO VOGA",
          cpf: "11144477735",
          dataNascimento: "1985-06-15",
          profissaoCbo: "2410-05",
          renda: 15000,
          sexoId: 1,
          uf: "DF",
          declaracaoIRId: 1,
        },
        periodicidadeCobrancaId: 30,
        prazoPagamentoAntecipado: 20,
        prazoDecrescimo: 20,
        capitalSegurado: 1_000_000,
      },
    ],
  }

  for (const spec of [
    { codigo: "A75", idProduto: 2111 },
    { codigo: "ER6", idProduto: 3109 },
  ] as const) {
    console.log("\n=== SIMULACAO", spec.codigo, "idProduto", spec.idProduto, "===")
    const body = {
      simulacoes: [{ ...payload.simulacoes[0], idProduto: spec.idProduto }],
    }
    const path = `/apiseguradora/v3/simulacao?cnpj=${CNPJ}&codigoModeloProposta=${spec.codigo}&canalVenda=4`
    const r = await magFetch(apiUrl, token, path, {
      method: "POST",
      body: JSON.stringify(body),
    })
    console.log("HTTP", r.status)
    writeFileSync(
      `scripts/.tmp-sim-${spec.codigo}.json`,
      typeof r.parsed === "string" ? r.parsed : JSON.stringify(r.parsed, null, 2),
    )
    if (r.status !== 200) {
      console.log("erro:", typeof r.parsed === "string" ? r.parsed.slice(0, 1200) : JSON.stringify(r.parsed).slice(0, 1200))
    } else {
      console.log("ok — trecho:", JSON.stringify(r.parsed).slice(0, 1500))
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
