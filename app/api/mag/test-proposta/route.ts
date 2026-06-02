export const runtime = "edge"

import { NextRequest, NextResponse } from "next/server"
import { requestMAGToken } from "@/lib/mag/auth"

export async function GET(_req: NextRequest) {
  const tokenResult = await requestMAGToken()
  if (!tokenResult.ok) return NextResponse.json({ erro: "token falhou" }, { status: 500 })
  const token = tokenResult.token

  const apiUrl = process.env.MAG_API_URL?.replace(/\/$/, "")
  if (!apiUrl) return NextResponse.json({ erro: "MAG_API_URL não configurada" }, { status: 500 })

  const cnpj = (process.env.MAG_CNPJ || "27945275000154").replace(/\D/g, "")

  // Testa o endpoint de proposta com os mesmos dados do Pedro
  const payload = {
    simulacoes: [
      {
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
        coberturas: [
          {
            idProduto: 2011,
            capitalSegurado: 2500000,
          },
        ],
      },
    ],
  }

  const results: Record<string, unknown> = {}

  // Testa 4 variações de endpoint
  const endpoints = [
    `${apiUrl}/apiseguradora/v3/proposta?cnpj=${cnpj}&codigoModeloProposta=A7Z&canalVenda=4`,
    `${apiUrl}/apiseguradora/v2/proposta?cnpj=${cnpj}&codigoModeloProposta=A7Z&canalVenda=4`,
    `${apiUrl}/apiseguradora/v3/calculo?cnpj=${cnpj}&codigoModeloProposta=A7Z&canalVenda=4`,
    `${apiUrl}/apiseguradora/v3/simulacao/premio?cnpj=${cnpj}&codigoModeloProposta=A7Z&canalVenda=4`,
  ]

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      })
      const text = await res.text()
      results[url] = { status: res.status, body: text.slice(0, 500) }
    } catch (e) {
      results[url] = { error: String(e) }
    }
  }

  return NextResponse.json(results)
}

