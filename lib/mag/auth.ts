type MagTokenResponse = {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

/** Obtém token OAuth direto na MAG (sem fetch interno à app). */
export async function fetchTokenFromMag(): Promise<{ access_token: string; expires_in: number }> {
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

  const data = (await res.json()) as MagTokenResponse
  console.log("TOKEN RESPONSE:", data)

  if (!res.ok || !data.access_token) {
    const msg = data.error_description ?? data.error ?? `HTTP ${res.status}`
    throw new Error(`Token MAG inválido: ${msg}`)
  }

  return {
    access_token: data.access_token,
    expires_in: Number(data.expires_in) || 3600,
  }
}

export async function getMAGToken(): Promise<string> {
  const data = await fetchTokenFromMag()
  return data.access_token
}

/** Alias usado por outras rotas MAG. */
export const getMagAccessToken = getMAGToken
