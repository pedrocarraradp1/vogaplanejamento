import { NextResponse } from "next/server"

let cachedToken: string | null = null
let tokenExpiry = 0

async function fetchTokenFromMag(): Promise<{ access_token: string; expires_in: number }> {
  const base = process.env.MAG_AUTH_URL?.replace(/\/$/, "")
  const clientId = process.env.MAG_CLIENT_ID
  const clientSecret = process.env.MAG_CLIENT_SECRET
  if (!base || !clientId || !clientSecret) {
    throw new Error("MAG_AUTH_URL, MAG_CLIENT_ID ou MAG_CLIENT_SECRET não configurados")
  }

  const res = await fetch(`${base}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "apiseguradora",
      grant_type: "client_credentials",
    }),
  })

  const data = (await res.json()) as {
    access_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }

  if (!res.ok || !data.access_token) {
    const msg = data.error_description ?? data.error ?? `HTTP ${res.status}`
    throw new Error(msg)
  }

  return {
    access_token: data.access_token,
    expires_in: Number(data.expires_in) || 3600,
  }
}

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
