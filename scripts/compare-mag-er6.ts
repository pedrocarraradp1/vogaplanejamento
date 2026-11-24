/**
 * Teste de cotação: capital 1.000.000, nasc. 15/06/1985, masculino, DF, prazo 20.
 * Compara ER6 (3109) e A75 (2111) com a fórmula local de prêmio.
 *
 *   node --env-file=.env.local --experimental-strip-types --import ./scripts/test-register.mjs ./scripts/compare-mag-er6.ts
 */
import { writeFileSync } from "node:fs"
import { requestMAGToken } from "../lib/mag/auth.ts"
import { calcularPremiosDaSimulacao } from "../lib/mag/premio-cobertura.ts"

const CNPJ = (process.env.MAG_CNPJ || "27945275000154").replace(/\D/g, "")
const CAPITAL = 1_000_000

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

  const payloadBase = {
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
    capitalSegurado: CAPITAL,
  }

  const resultados: { codigo: string; idProduto: number; premioMensal: number; coberturas: string }[] =
    []

  for (const spec of [
    { codigo: "ER6", idProduto: 3109 },
    { codigo: "A75", idProduto: 2111 },
  ] as const) {
    console.log("\n===", spec.codigo, `(${spec.idProduto}) ===`)

    const modeloPath =
      `/apiseguradora/v3/modeloproposta/${spec.codigo}?cnpj=${CNPJ}&completo=true&version=1`
    const modelo = await magFetch(apiUrl, token, modeloPath)
    console.log("GET modeloproposta HTTP", modelo.status)
    writeFileSync(
      `scripts/.tmp-modelo-${spec.codigo}.json`,
      typeof modelo.parsed === "string" ? modelo.parsed : JSON.stringify(modelo.parsed, null, 2),
    )
    if (modelo.status !== 200) {
      console.log("erro modelo:", modelo.text.slice(0, 500))
      continue
    }

    const simPath =
      `/apiseguradora/v3/simulacao?cnpj=${CNPJ}&codigoModeloProposta=${spec.codigo}`
    const sim = await magFetch(apiUrl, token, simPath, {
      method: "POST",
      body: JSON.stringify({
        simulacoes: [{ ...payloadBase, idProduto: spec.idProduto }],
      }),
    })
    console.log("POST simulacao HTTP", sim.status)
    writeFileSync(
      `scripts/.tmp-sim-${spec.codigo}.json`,
      typeof sim.parsed === "string" ? sim.parsed : JSON.stringify(sim.parsed, null, 2),
    )
    if (sim.status !== 200) {
      console.log("erro sim:", sim.text.slice(0, 800))
      continue
    }

    const calc = calcularPremiosDaSimulacao({
      simulacaoJson: sim.parsed,
      capitalDesejado: CAPITAL,
      idProduto: spec.idProduto,
      modeloJson: modelo.parsed,
    })

    console.log("ticketMinimo:", calc.ticketMinimo)
    console.log("abaixoDoTicketMinimo:", calc.abaixoDoTicketMinimo)
    for (const c of calc.coberturas) {
      console.log(
        `  cobertura ${c.descricao}: capitalBase=${c.capitalBase} premioBase=${c.premioBase} custoFixo=${c.custoFixo} → premio=${c.premio.toFixed(2)}`,
      )
    }
    console.log("PREMIO MENSAL TOTAL:", calc.premioMensal.toFixed(2))

    resultados.push({
      codigo: spec.codigo,
      idProduto: spec.idProduto,
      premioMensal: calc.premioMensal,
      coberturas: calc.coberturas.map((c) => `${c.descricao}=${c.premio.toFixed(2)}`).join("; "),
    })
  }

  console.log("\n========== COMPARAÇÃO ==========")
  for (const r of resultados) {
    console.log(
      `${r.codigo} (${r.idProduto}): R$ ${r.premioMensal.toFixed(2)}/mês  [${r.coberturas}]`,
    )
  }
  if (resultados.length === 2) {
    const [er6, a75] = resultados
    const delta = a75.premioMensal - er6.premioMensal
    console.log(
      `Diferença A75 − ER6: R$ ${delta.toFixed(2)} (${((delta / er6.premioMensal) * 100).toFixed(1)}%)`,
    )
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
