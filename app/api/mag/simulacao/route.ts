import { NextRequest, NextResponse } from "next/server"
import { getMagAccessToken } from "@/lib/mag/auth"

type SimulacaoBody = {
  dataNascimento?: string
  sexoId?: number
  renda?: number
  uf?: string
  codigoModeloProposta?: string
  capitalSegurado?: number
  anospag?: number
}

function extrairPremioMensalMag(magData: unknown): number | null {
  const root = magData as Record<string, unknown>
  const sims = root?.simulacoes as unknown[] | undefined
  const sim0 = (sims?.[0] ?? null) as Record<string, unknown> | null
  if (!sim0) return null

  const premio = sim0.premio as Record<string, unknown> | undefined
  const v1 = premio?.valorMensal
  if (typeof v1 === "number") return v1

  const v2 = sim0.premioMensal
  if (typeof v2 === "number") return v2

  const v3 = sim0.valorPremio
  if (typeof v3 === "number") return v3

  return null
}

export async function POST(req: NextRequest) {
  try {
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

    if (!codigoModeloProposta || dataNascimento == null) {
      return NextResponse.json(
        { error: "codigoModeloProposta e dataNascimento são obrigatórios", fonte: "erro" },
        { status: 400 },
      )
    }

    const apiUrl = process.env.MAG_API_URL?.replace(/\/$/, "")
    if (!apiUrl) {
      return NextResponse.json({ error: "MAG_API_URL não configurada", fonte: "erro" }, { status: 500 })
    }

    let token: string
    try {
      token = await getMagAccessToken()
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao obter token"
      return NextResponse.json({ error: msg, fonte: "erro" }, { status: 502 })
    }

    const cnpj = (process.env.MAG_CNPJ || "27945275000154").replace(/\D/g, "")
    const url = `${apiUrl}/apiseguradora/v3/simulacao?cnpj=${encodeURIComponent(cnpj)}&codigoModeloProposta=${encodeURIComponent(String(codigoModeloProposta))}`

    const magBody = {
      simulacoes: [
        {
          ...(capitalSegurado != null && capitalSegurado > 0
            ? { capitalSegurado: Number(capitalSegurado) }
            : {}),
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

    const magRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(magBody),
      cache: "no-store",
    })

    let magData: unknown
    try {
      magData = await magRes.json()
    } catch {
      magData = { parseError: true }
    }

    const premioMensal = extrairPremioMensalMag(magData)

    return NextResponse.json({
      premioMensal,
      premioAnual: premioMensal != null ? premioMensal * 12 : null,
      produto: codigoModeloProposta,
      fonte: premioMensal != null ? "mag_api" : "erro",
      rawResponse: magData,
      magHttpStatus: magRes.status,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro na simulação MAG"
    return NextResponse.json({ error: msg, fonte: "erro" }, { status: 500 })
  }
}
