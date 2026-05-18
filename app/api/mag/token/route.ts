import { NextResponse } from "next/server"
import { fetchTokenFromMag } from "@/lib/mag/auth"

let cachedToken: string | null = null
let tokenExpiry = 0

/** Cache em memória; responde `{ token }`. */
export async function GET() {
  try {
    if (cachedToken && Date.now() < tokenExpiry) {
      return NextResponse.json({ token: cachedToken })
    }

    const data = await fetchTokenFromMag()
    cachedToken = data.access_token
    tokenExpiry = Date.now() + Math.max(0, data.expires_in - 60) * 1000

    return NextResponse.json({ token: cachedToken })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao obter token MAG"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/** Compatibilidade: retorna também `access_token`. */
export async function POST() {
  try {
    if (cachedToken && Date.now() < tokenExpiry) {
      return NextResponse.json({ token: cachedToken, access_token: cachedToken })
    }

    const data = await fetchTokenFromMag()
    cachedToken = data.access_token
    tokenExpiry = Date.now() + Math.max(0, data.expires_in - 60) * 1000

    return NextResponse.json({ token: cachedToken, access_token: cachedToken })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao obter token MAG"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
