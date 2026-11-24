import { NextRequest, NextResponse } from "next/server"
import { fetchModeloProposta } from "@/lib/mag/mag-client"
import { MODELO_PROPOSTA_ATUAL, parseMagModeloCodigo } from "@/lib/mag/config"

/**
 * GET /api/mag/produtos?codigo=ER6|A75
 * Busca GET /apiseguradora/v3/modeloproposta/{codigo}?cnpj=&completo=true&version=1
 */
export async function GET(req: NextRequest) {
  try {
    const codigoRaw = req.nextUrl.searchParams.get("codigo") ?? MODELO_PROPOSTA_ATUAL
    const parsed = parseMagModeloCodigo(codigoRaw)
    const codigo = parsed?.codigo ?? MODELO_PROPOSTA_ATUAL

    const res = await fetchModeloProposta(codigo)
    if (!res.ok) {
      return NextResponse.json(
        { error: `MAG modeloproposta HTTP ${res.status}`, detail: res.data },
        { status: res.status },
      )
    }

    return NextResponse.json(res.data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao buscar modelo de proposta MAG"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
