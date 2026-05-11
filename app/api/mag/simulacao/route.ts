import { NextResponse } from "next/server"
import { getMagAccessToken } from "@/lib/mag/auth"
import { extrairPremiosMag } from "@/lib/mag/extract-premio"
import { nomeProdutoMag } from "@/lib/mag/produtos"

type SimulacaoBody = {
  dataNascimento?: string
  sexoId?: number
  renda?: number
  uf?: string
  codigoModeloProposta?: string
  capitalSegurado?: number
  anospag?: number
}

/** Simula prêmio na API MAG e devolve valores normalizados. */
export async function POST(req: Request) {
  try {
    const apiUrl = process.env.MAG_API_URL
    const cnpj = process.env.MAG_CNPJ
    if (!apiUrl || !cnpj) {
      return NextResponse.json(
        { error: "MAG_API_URL ou MAG_CNPJ não configurados" },
        { status: 500 },
      )
    }

    const body = (await req.json()) as SimulacaoBody
    const {
      dataNascimento,
      sexoId,
      renda,
      uf,
      codigoModeloProposta,
      capitalSegurado,
      anospag,
    } = body

    if (!codigoModeloProposta || capitalSegurado == null || dataNascimento == null) {
      return NextResponse.json(
        { error: "codigoModeloProposta, capitalSegurado e dataNascimento são obrigatórios" },
        { status: 400 },
      )
    }

    const token = await getMagAccessToken()
    const base = apiUrl.replace(/\/$/, "")
    const url = new URL(`${base}/apiseguradora/v3/simulacao`)
    url.searchParams.set("cnpj", cnpj.replace(/\D/g, ""))
    url.searchParams.set("codigoModeloProposta", String(codigoModeloProposta))

    const payload = {
      simulacoes: [
        {
          capitalSegurado: Number(capitalSegurado),
          proponente: {
            tipoRelacaoSeguradoId: 1,
            nome: "SIMULACAO VOGA WEALTH",
            dataNascimento: String(dataNascimento),
            profissaoCbo: "2410-05",
            renda: Number(renda ?? 0),
            sexoId: Number(sexoId ?? 1),
            uf: String(uf ?? "SP"),
            declaracaoIRId: 1,
          },
          periodicidadeCobrancaId: 30,
          prazoPagamentoAntecipado: Number(anospag ?? 10),
          prazoDecrescimo: 10,
        },
      ],
    }

    const res = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const rawText = await res.text()
    let json: unknown
    try {
      json = JSON.parse(rawText)
    } catch {
      json = { raw: rawText }
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `MAG simulação HTTP ${res.status}`,
          detail: json,
        },
        { status: res.status },
      )
    }

    const { premioMensal, premioAnual } = extrairPremiosMag(json)
    const produto = nomeProdutoMag(String(codigoModeloProposta))

    if (premioMensal == null) {
      return NextResponse.json(
        {
          error: "Não foi possível extrair premioMensal da resposta MAG",
          detail: json,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      premioMensal,
      premioAnual: premioAnual ?? premioMensal * 12,
      produto,
      fonte: "mag_api",
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro na simulação MAG"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
