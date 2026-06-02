export const runtime = "edge"

import { NextRequest, NextResponse } from "next/server"
import { requestMAGToken } from "@/lib/mag/auth"

export async function GET(req: NextRequest) {
  const tokenResult = await requestMAGToken()
  if (!tokenResult.ok) return NextResponse.json({ erro: "token falhou" }, { status: 500 })
  const token = tokenResult.token
  const apiUrl = process.env.MAG_API_URL?.replace(/\/$/, "")
  const cnpj = (process.env.MAG_CNPJ || "27945275000154").replace(/\D/g, "")

  const url = `${apiUrl}/apiseguradora/v3/modeloproposta?cnpj=${cnpj}&completo=true&canalVenda=4`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Cookie: "IdentidadeHmgAffinity=ec749dbec5b6f62e1eb4865e2fc7b9f9; IdentidadeHmgAffinityCORS=ec749dbec5b6f62e1eb4865e2fc7b9f9",
    },
  })

  const text = await res.text()
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { parsed = text }

  console.log("MODELOPROPOSTA STATUS:", res.status)
  console.log("MODELOPROPOSTA BODY:", text)

  return NextResponse.json({ status: res.status, body: parsed })
}
