import { getServerBaseUrl } from "@/lib/mag/base-url"

/**
 * Obtém JWT via rota interna `/api/mag/token` (cache centralizado na route).
 */
export async function getMagAccessToken(): Promise<string> {
  const res = await fetch(`${getServerBaseUrl()}/api/mag/token`, { cache: "no-store" })
  const data = (await res.json()) as { token?: string; access_token?: string; error?: string }

  if (!res.ok) {
    throw new Error(data.error ?? `Token route HTTP ${res.status}`)
  }

  const token = data.token ?? data.access_token
  if (!token) {
    throw new Error(data.error ?? "Resposta sem token")
  }

  return token
}
