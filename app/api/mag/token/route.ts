import { NextResponse } from "next/server"
import { getMagAccessToken } from "@/lib/mag/auth"

/**
 * Gera e cacheia o JWT da MAG (OAuth client_credentials).
 *
 * Variáveis: `MAG_AUTH_URL`, `MAG_CLIENT_ID`, `MAG_CLIENT_SECRET` (.env.local).
 * Chamada efetiva (ex. sandbox):
 *   POST {MAG_AUTH_URL}/connect/token
 *   → POST https://apis-sbx.mag.com.br/connect/token
 * Content-Type: application/x-www-form-urlencoded
 * Body: client_id=…&client_secret=…&scope=apiseguradora&grant_type=client_credentials
 *
 * Resposta JSON: `{ access_token }` (cache em memória por `expires_in` em `lib/mag/auth.ts`).
 */
export async function POST() {
  try {
    const access_token = await getMagAccessToken()
    return NextResponse.json({ access_token })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao obter token MAG"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
