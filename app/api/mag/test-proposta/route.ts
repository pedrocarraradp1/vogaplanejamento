export const runtime = "edge"

import { NextRequest, NextResponse } from "next/server"
import { requestMAGToken } from "@/lib/mag/auth"

export async function GET(req: NextRequest) {
  const tokenResult = await requestMAGToken()
  if (!tokenResult.ok) return NextResponse.json({ erro: "token falhou" }, { status: 500 })
  const token = tokenResult.token
  const apiUrl = process.env.MAG_API_URL?.replace(/\/$/, "")
  const cnpj = (process.env.MAG_CNPJ || "27945275000154").replace(/\D/g, "")

  const url = `${apiUrl}/apiseguradora/v3/proposta?cnpj=${cnpj}&codigoModeloProposta=A7Z&canalVenda=4`

  // Payload completo de proposta MAG com todos os campos obrigatórios conhecidos
  const payload = {
    DADOS_SEGURADO: {
      TIPO_RELACAO_SEGURADO_ID: 1,
      NOME: "Pedro C",
      CPF: "06591804137",
      DATA_NASCIMENTO: "1998-01-30",
      SEXO_ID: 1,
      UF: "SP",
      RENDA: 20000,
      PROFISSAO_CBO: "2410-05",
      DECLARACAO_IR_ID: 1,
    },
    DADOS_COBRANCA: {
      PERIODICIDADE_COBRANCA_ID: 30,
      FORMA_PAGAMENTO_ID: 1,
      COMP_DEBITO: null,
    },
    COBERTURAS: [{
      ID_PRODUTO: 2011,
      CAPITAL_SEGURADO: 2500000,
      PRAZO_CERTO: 10,
      PRAZO_PAGAMENTO_ANTECIPADO: 10,
      PRAZO_DECRESCIMO: 10,
    }]
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  return NextResponse.json({ status: res.status, body: text }, { status: 200 })
}
