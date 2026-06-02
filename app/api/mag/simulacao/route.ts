export const runtime = "edge"

import { NextRequest, NextResponse } from "next/server"
import { requestMAGToken } from "@/lib/mag/auth"
import { extrairPremiosMag } from "@/lib/mag/extract-premio"

type SimulacaoBody = {
  nome?: string
  cpf?: string
  dataNascimento?: string
  sexoId?: number
  sexo?: string
  renda?: number
  rendaMensal?: number
  uf?: string
  codigoModeloProposta?: string
  capitalSegurado?: number
  anospag?: number
  prazo?: number
  profissaoCbo?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SimulacaoBody
    console.log("SIMULACAO REQUEST BODY:", body)

    if (!body.codigoModeloProposta || body.dataNascimento == null) {
      return NextResponse.json(
        { erro: "codigoModeloProposta e dataNascimento são obrigatórios" },
        { status: 400 },
      )
    }

    const cpfLimpo = (body.cpf ?? "").replace(/\D/g, "")
    if (!cpfLimpo || cpfLimpo.length !== 11) {
      return NextResponse.json(
        { error: "CPF obrigatório e deve ter 11 dígitos", cpfRecebido: body.cpf },
        { status: 400 },
      )
    }

    const apiUrl = process.env.MAG_API_URL?.replace(/\/$/, "")
    if (!apiUrl) {
      return NextResponse.json({ erro: "MAG_API_URL não configurada" }, { status: 500 })
    }

    const tokenResult = await requestMAGToken()
    if (!tokenResult.ok) {
      return NextResponse.json(
        {
          erro: "Falha autenticacao MAG",
          status: tokenResult.status,
          body: tokenResult.body,
        },
        { status: 500 },
      )
    }
    const token = tokenResult.token

    const cnpj = (process.env.MAG_CNPJ || "27945275000154").replace(/\D/g, "")
    const codigoModeloUrl =
      body.codigoModeloProposta === "A75" || body.codigoModeloProposta === "A7Z"
        ? "A75"
        : String(body.codigoModeloProposta)
    const url = `${apiUrl}/apiseguradora/v3/simulacao?cnpj=${encodeURIComponent(cnpj)}&codigoModeloProposta=${encodeURIComponent(codigoModeloUrl)}&canalVenda=4`
    console.log("MAG URL:", url)

    const renda = Number(body.rendaMensal ?? body.renda ?? 0)
    const prazo = Number(body.prazo ?? body.anospag ?? 30)
    const prazoFinal = [10, 20, 30].includes(prazo) ? prazo : 10
    const isA75 =
      body.codigoModeloProposta === "A75" || body.codigoModeloProposta === "A7Z"

    let sexoId = 1
    if (body.sexoId != null) {
      sexoId = Number(body.sexoId)
    } else if (body.sexo) {
      sexoId = body.sexo.toLowerCase() === "feminino" || body.sexo === "F" ? 2 : 1
    }

    const proponente: Record<string, unknown> = {
      tipoRelacaoSeguradoId: 1,
      nome: body.nome || "SIMULACAO VOGA",
      cpf: cpfLimpo,
      dataNascimento: body.dataNascimento,
      profissaoCbo: body.profissaoCbo ?? "2410-05",
      renda,
      sexoId,
      uf: String(body.uf ?? "DF"),
      declaracaoIRId: 1,
    }

    const simulacaoPayload: Record<string, unknown> = {
      proponente,
      periodicidadeCobrancaId: 30,
      prazoPagamentoAntecipado: prazoFinal,
      prazoDecrescimo: prazoFinal,
    }

    if (!isA75) {
      simulacaoPayload.prazoCerto = prazo
    }

    if (body.capitalSegurado != null && body.capitalSegurado > 0) {
      simulacaoPayload.capitalSegurado = Number(body.capitalSegurado)
    }

    if (isA75) {
      simulacaoPayload.codigoModeloProposta = "A75"
      simulacaoPayload.idProduto = 2111
    }

    if (isA75) {
      console.log("PRODUTO USADO:", { codigo: "A75", idProduto: 2111, prazo: prazoFinal })
    }
    console.log("MAG SIMULACAO PAYLOAD:", JSON.stringify({ simulacoes: [simulacaoPayload] }, null, 2))

    const magRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Cookie:
          "IdentidadeHmgAffinity=ec749dbec5b6f62e1eb4865e2fc7b9f9; IdentidadeHmgAffinityCORS=ec749dbec5b6f62e1eb4865e2fc7b9f9",
      },
      body: JSON.stringify({
        simulacoes: [simulacaoPayload],
      }),
      cache: "no-store",
    })

    console.log("MAG STATUS:", magRes.status)

    const rawText = await magRes.text()

    if (!magRes.ok) {
      console.error("MAG ERROR BODY (HTTP", magRes.status + "):", rawText)
      return NextResponse.json(
        { error: "MAG simulacao failed", details: rawText, status: magRes.status },
        { status: 500 },
      )
    }

    let magData: unknown
    try {
      magData = rawText ? JSON.parse(rawText) : {}
    } catch {
      magData = { parseError: true, rawText }
    }

    console.log("MAG simulacao response:", JSON.stringify(magData, null, 2))

    const cs = Number(body.capitalSegurado ?? 0)
    const { premioMensal, premioAnual: premioAnualExtr, premioBaseMorte } = extrairPremiosMag(magData, cs)

    console.log("PREMIO EXTRAIDO:", { premioMensal, premioBaseMorte, capitalSegurado: cs })

    const premioExtraido = {
      premioMensal: premioMensal ?? null,
      premioAnual: premioAnualExtr ?? (premioMensal != null ? premioMensal * 12 : null),
      premioBaseMorte: premioBaseMorte ?? null,
      capitalSegurado: cs,
      codigoModeloProposta: codigoModeloUrl,
      idProduto: isA75 ? 2111 : null,
      prazo: prazoFinal,
    }

    return NextResponse.json({
      ...premioExtraido,
      rawResponse: magData,
      fonte: "mag_api",
    })
  } catch (error: unknown) {
    console.error("SIMULACAO ERRO CRITICO:", error)
    const err = error instanceof Error ? error : new Error(String(error))
    return NextResponse.json(
      {
        erro: err.message,
        stack: err.stack,
      },
      { status: 500 },
    )
  }
}
