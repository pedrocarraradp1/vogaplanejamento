/**
 * Checagem pontual: o produto ER6 já aparece em GET /apiseguradora/v3/produto?
 *
 * Uso (na raiz do repo):
 *   node --env-file=.env.local --experimental-strip-types --import ./scripts/test-register.mjs ./scripts/check-mag-produto-er6.ts
 */
import { requestMAGToken } from "../lib/mag/auth.ts"

type MagProdutoItem = {
  id: number
  descricao: string
  descricaoComercial: string
  dataUltimaAlteracao: string
}

function asList(data: unknown): MagProdutoItem[] {
  if (Array.isArray(data)) return data as MagProdutoItem[]
  if (data && typeof data === "object" && Array.isArray((data as { Valor?: unknown }).Valor)) {
    return (data as { Valor: MagProdutoItem[] }).Valor
  }
  return []
}

function haystack(p: MagProdutoItem): string {
  return `${p.descricao ?? ""} ${p.descricaoComercial ?? ""}`.toLowerCase()
}

function matchesQuery(p: MagProdutoItem, query: string): boolean {
  return haystack(p).includes(query)
}

async function main() {
  const apiUrl = process.env.MAG_API_URL?.replace(/\/$/, "")
  if (!apiUrl) {
    console.error("MAG_API_URL não configurada")
    process.exit(1)
  }

  const tokenResult = await requestMAGToken()
  if (!tokenResult.ok) {
    console.error("Falha autenticação MAG", tokenResult.status, tokenResult.body)
    process.exit(1)
  }

  const cnpj = (process.env.MAG_CNPJ || "27945275000154").replace(/\D/g, "")
  const codigoModeloProposta = "A75"
  const query = (process.argv[2] ?? "er6").trim().toLowerCase()
  console.log("busca:", query)

  async function listar(params: Record<string, string>) {
    const url = new URL(`${apiUrl}/apiseguradora/v3/produto`)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    const label = url.toString().replace(cnpj, "[cnpj]")
    console.log("GET", label)
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenResult.token}` },
      cache: "no-store",
    })
    const raw = await res.text()
    let parsed: unknown
    try {
      parsed = raw ? JSON.parse(raw) : null
    } catch {
      parsed = raw
    }
    return { status: res.status, parsed }
  }

  const comModelo = await listar({
    cnpj,
    codigoModeloProposta,
    canalVenda: "4",
  })
  console.log("HTTP (com codigoModeloProposta=A75)", comModelo.status)
  if (comModelo.status !== 200) {
    console.error("Resposta de erro:", comModelo.parsed)
    process.exit(1)
  }

  const produtos = asList(comModelo.parsed)
  if (query === "datas" || query === "*") {
    console.log("total produtos (A75):", produtos.length)
    console.log(
      JSON.stringify(
        produtos.map((p) => ({
          id: p.id,
          descricao: p.descricao,
          dataUltimaAlteracao: p.dataUltimaAlteracao,
        })),
        null,
        2,
      ),
    )
    const datas = [...new Set(produtos.map((p) => (p.dataUltimaAlteracao ?? "").slice(0, 19)))]
    console.log("datas distintas (até o segundo):", datas)
    return
  }

  const encontrados = produtos.filter((p) => matchesQuery(p, query))
  console.log("total produtos (A75):", produtos.length)
  console.log(`"${query}" encontrado:`, encontrados.length > 0, `(${encontrados.length})`)

  if (encontrados.length > 0) {
    for (const p of encontrados) {
      console.log(
        JSON.stringify(
          {
            id: p.id,
            descricao: p.descricao,
            descricaoComercial: p.descricaoComercial,
            dataUltimaAlteracao: p.dataUltimaAlteracao,
          },
          null,
          2,
        ),
      )
    }
  } else {
    console.log(`Nenhum produto com "${query}" em descricao/descricaoComercial.`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
