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

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.replace(",", "."))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function extrairPremioMensalMag(magData: unknown): number | null {
  const root = magData as Record<string, unknown>
  const sims = root?.simulacoes as unknown[] | undefined
  const sim0 = (sims?.[0] ?? null) as Record<string, unknown> | null
  if (!sim0) return null

  const premio = sim0.premio as Record<string, unknown> | number | undefined

  const candidates: unknown[] = [
    typeof premio === "object" && premio != null ? premio.valorMensal : undefined,
    typeof premio === "number" ? premio : undefined,
    sim0.premioMensal,
    sim0.valorPremio,
    sim0.custo,
    sim0.valorContribuicao,
    sim0.contribuicaoMensal,
  ]

  for (const c of candidates) {
    const n = asNumber(c)
    if (n != null) return n
  }

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

    console.log("MAG RAW RESPONSE:", JSON.stringify(magData, null, 2))
    console.log("MAG STATUS:", magRes.status)

    const simulacao = (magData as { simulacoes?: unknown[] })?.simulacoes?.[0] as
      | Record<string, unknown>
      | undefined

    console.log("SIMULACAO:", JSON.stringify(simulacao, null, 2))
    console.log("PREMIO FIELDS:", {
      "premio.valorMensal":
        simulacao?.premio &&
        typeof simulacao.premio === "object" &&
        simulacao.premio != null
          ? (simulacao.premio as Record<string, unknown>).valorMensal
          : undefined,
      premioMensal: simulacao?.premioMensal,
      valorPremio: simulacao?.valorPremio,
      premio: simulacao?.premio,
      custo: simulacao?.custo,
      valorContribuicao: simulacao?.valorContribuicao,
      contribuicaoMensal: simulacao?.contribuicaoMensal,
    })

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
