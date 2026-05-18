type MagTokenResponse = {
  access_token?: string
  expires_in?: number
  error?: string
  error_description?: string
}

export type MagTokenAuthResult =
  | { ok: true; token: string; expires_in: number }
  | { ok: false; status: number; body: string }

/** Requisição OAuth à MAG com log de status e body bruto (debug). */
export async function requestMAGToken(): Promise<MagTokenAuthResult> {
  const base = process.env.MAG_AUTH_URL?.replace(/\/$/, "")
  const clientId = process.env.MAG_CLIENT_ID
  const clientSecret = process.env.MAG_CLIENT_SECRET
  if (!base || !clientId || !clientSecret) {
    return {
      ok: false,
      status: 500,
      body: JSON.stringify({
        error: "MAG_AUTH_URL, MAG_CLIENT_ID ou MAG_CLIENT_SECRET não configurados",
      }),
    }
  }

  const tokenRes = await fetch(`${base}/connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "apiseguradora",
      grant_type: "client_credentials",
    }),
  })

  console.log("TOKEN STATUS:", tokenRes.status)
  const tokenText = await tokenRes.text()
  console.log("TOKEN BODY RAW:", tokenText)

  if (!tokenRes.ok) {
    return { ok: false, status: tokenRes.status, body: tokenText }
  }

  let data: MagTokenResponse
  try {
    data = tokenText ? (JSON.parse(tokenText) as MagTokenResponse) : {}
  } catch {
    return {
      ok: false,
      status: tokenRes.status,
      body: tokenText || "Resposta do token não é JSON válido",
    }
  }

  console.log("TOKEN RESPONSE:", data)

  if (!data.access_token) {
    return {
      ok: false,
      status: tokenRes.status,
      body: tokenText || JSON.stringify({ error: "Resposta sem access_token" }),
    }
  }

  return {
    ok: true,
    token: data.access_token,
    expires_in: Number(data.expires_in) || 3600,
  }
}

/** Obtém token OAuth direto na MAG (sem fetch interno à app). */
export async function fetchTokenFromMag(): Promise<{ access_token: string; expires_in: number }> {
  const result = await requestMAGToken()
  if (!result.ok) {
    const msg = result.body
    throw new Error(`Token MAG inválido (HTTP ${result.status}): ${msg}`)
  }
  return { access_token: result.token, expires_in: result.expires_in }
}

export async function getMAGToken(): Promise<string> {
  const data = await fetchTokenFromMag()
  return data.access_token
}

/** Alias usado por outras rotas MAG. */
export const getMagAccessToken = getMAGToken
