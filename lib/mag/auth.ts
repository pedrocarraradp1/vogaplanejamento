/** Cache JWT MAG em memória (por instância do servidor). */

const TOKEN_MARGIN_SEC = 60

type Cached = { token: string; expiresAtMs: number }

let cache: Cached | null = null

export async function getMagAccessToken(): Promise<string> {
  const now = Date.now()
  if (cache && cache.expiresAtMs > now + TOKEN_MARGIN_SEC * 1000) {
    return cache.token
  }

  const authUrl = process.env.MAG_AUTH_URL
  const clientId = process.env.MAG_CLIENT_ID
  const clientSecret = process.env.MAG_CLIENT_SECRET

  if (!authUrl || !clientId || !clientSecret) {
    throw new Error("Variáveis MAG_AUTH_URL, MAG_CLIENT_ID ou MAG_CLIENT_SECRET não configuradas")
  }

  const base = authUrl.replace(/\/$/, "")
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "apiseguradora",
    grant_type: "client_credentials",
  })

  const res = await fetch(`${base}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MAG token HTTP ${res.status}: ${text}`)
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) {
    throw new Error("Resposta MAG token sem access_token")
  }

  const expiresIn = typeof json.expires_in === "number" ? json.expires_in : 3600
  cache = {
    token: json.access_token,
    expiresAtMs: now + expiresIn * 1000,
  }

  return json.access_token
}
