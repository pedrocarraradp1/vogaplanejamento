import { NextResponse } from "next/server"
import { getMagAccessToken } from "@/lib/mag/auth"

/** Lista modelos de proposta disponíveis para o CNPJ do corretor. */
export async function GET() {
  try {
    const apiUrl = process.env.MAG_API_URL
    const cnpj = process.env.MAG_CNPJ
    if (!apiUrl || !cnpj) {
      return NextResponse.json(
        { error: "MAG_API_URL ou MAG_CNPJ não configurados" },
        { status: 500 },
      )
    }

    const token = await getMagAccessToken()
    const base = apiUrl.replace(/\/$/, "")
    const url = new URL(`${base}/apiseguradora/v3/modeloproposta`)
    url.searchParams.set("cnpj", cnpj.replace(/\D/g, ""))
    url.searchParams.set("completo", "true")
    url.searchParams.set("canalVenda", "4")

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })

    const raw = await res.text()
    let data: unknown
    try {
      data = JSON.parse(raw)
    } catch {
      data = raw
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `MAG produtos HTTP ${res.status}`, detail: data },
        { status: res.status },
      )
    }

    return NextResponse.json(data)
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao listar produtos MAG"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
