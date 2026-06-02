export const runtime = "edge"

import { NextRequest, NextResponse } from "next/server"
import { requestMAGToken } from "@/lib/mag/auth"

export async function GET(req: NextRequest) {
  const tokenResult = await requestMAGToken()
  if (!tokenResult.ok) return NextResponse.json({ erro: "token falhou" }, { status: 500 })
  const token = tokenResult.token
  const apiUrl = process.env.MAG_API_URL?.replace(/\/$/, "")
  const cnpj = (process.env.MAG_CNPJ || "27945275000154").replace(/\D/g, "")

  const resultados: Record<string, unknown> = {}

  // Testa 3 variações de codigoModeloProposta para o Whole Life Integral
  const codigos = ["3109", "A7Z", "WLI"]

  for (const codigo of codigos) {
    const url = `${apiUrl}/apiseguradora/v3/simulacao?cnpj=${cnpj}&codigoModeloProposta=${codigo}&canalVenda=4`

    const payload = {
      simulacoes: [{
        proponente: {
          tipoRelacaoSeguradoId: 1,
          nome: "Pedro C",
          cpf: "06591804137",
          dataNascimento: "1998-01-30",
          profissaoCbo: "2410-05",
          renda: 20000,
          sexoId: 1,
          uf: "SP",
          declaracaoIRId: 1,
        },
        periodicidadeCobrancaId: 30,
        prazoCerto: 10,
        prazoPagamentoAntecipado: 10,
        prazoDecrescimo: 10,
        capitalSegurado: 2500000,
      }]
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Cookie: "IdentidadeHmgAffinity=ec749dbec5b6f62e1eb4865e2fc7b9f9; IdentidadeHmgAffinityCORS=ec749dbec5b6f62e1eb4865e2fc7b9f9",
        },
        body: JSON.stringify(payload),
      })
      const text = await res.text()
      let parsed: unknown
      try { parsed = JSON.parse(text) } catch { parsed = text }
      console.log(`CODIGO ${codigo} STATUS:`, res.status)
      console.log(`CODIGO ${codigo} BODY:`, text)
      resultados[codigo] = { status: res.status, body: parsed }
    } catch (e) {
      resultados[codigo] = { erro: String(e) }
    }
  }

  return NextResponse.json(resultados)
}
