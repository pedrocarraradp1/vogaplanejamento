export const runtime = "edge"

import { NextRequest, NextResponse } from "next/server"
import { requestMAGToken } from "@/lib/mag/auth"
import { calcularPremiosDaSimulacao } from "@/lib/mag/extract-premio"
import { modeloPropostaEfetivo, parseMagModeloCodigo } from "@/lib/mag/config"
import { fetchModeloProposta, postSimulacaoMag } from "@/lib/mag/mag-client"

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

    if (!process.env.MAG_API_URL) {
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

    const parsedModelo = parseMagModeloCodigo(body.codigoModeloProposta)
    const spec = modeloPropostaEfetivo(body.codigoModeloProposta)
    const prazoPedido = Number(body.prazo ?? body.anospag ?? parsedModelo?.anospag ?? 30)
    const prazoFinal = [10, 20, 30].includes(prazoPedido) ? prazoPedido : 10
    const capitalSegurado = Number(body.capitalSegurado ?? 0)

    const modeloRes = await fetchModeloProposta(spec.codigo)
    if (!modeloRes.ok) {
      return NextResponse.json(
        {
          error: "MAG modeloproposta failed",
          details: modeloRes.data,
          status: modeloRes.status,
        },
        { status: 500 },
      )
    }

    const renda = Number(body.rendaMensal ?? body.renda ?? 0)
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
      idProduto: spec.idProduto,
    }
    if (capitalSegurado > 0) {
      simulacaoPayload.capitalSegurado = capitalSegurado
    }

    const magRes = await postSimulacaoMag(spec.codigo, {
      simulacoes: [simulacaoPayload],
    })

    if (!magRes.ok) {
      return NextResponse.json(
        { error: "MAG simulacao failed", details: magRes.data, status: magRes.status },
        { status: 500 },
      )
    }

    const detalhe = calcularPremiosDaSimulacao({
      simulacaoJson: magRes.data,
      capitalDesejado: capitalSegurado,
      idProduto: spec.idProduto,
      modeloJson: modeloRes.data,
    })

    return NextResponse.json({
      premioMensal: detalhe.premioMensal > 0 ? detalhe.premioMensal : null,
      premioAnual: detalhe.premioAnual > 0 ? detalhe.premioAnual : null,
      coberturas: detalhe.coberturas,
      servicos: detalhe.servicos,
      ticketMinimo: detalhe.ticketMinimo,
      abaixoDoTicketMinimo: detalhe.abaixoDoTicketMinimo,
      avisoTicketMinimo: detalhe.avisoTicketMinimo,
      capitalSegurado,
      codigoModeloProposta: spec.codigo,
      idProduto: spec.idProduto,
      prazo: prazoFinal,
      modeloProposta: modeloRes.data,
      rawResponse: magRes.data,
      fonte: "mag_api",
    })
  } catch (error: unknown) {
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
