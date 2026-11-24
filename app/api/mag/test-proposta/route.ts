export const runtime = "edge"

import { NextRequest, NextResponse } from "next/server"
import { MODELO_PROPOSTA_ATUAL, parseMagModeloCodigo } from "@/lib/mag/config"
import { fetchModeloProposta } from "@/lib/mag/mag-client"

export async function GET(req: NextRequest) {
  const codigoRaw = req.nextUrl.searchParams.get("codigo") ?? MODELO_PROPOSTA_ATUAL
  const parsed = parseMagModeloCodigo(codigoRaw)
  const codigo = parsed?.codigo ?? MODELO_PROPOSTA_ATUAL

  const res = await fetchModeloProposta(codigo)
  return NextResponse.json({ status: res.status, body: res.data })
}
