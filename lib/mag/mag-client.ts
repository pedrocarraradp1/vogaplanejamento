import { getMagAccessToken } from "@/lib/mag/auth"

function magBaseUrl(): string {
  const apiUrl = process.env.MAG_API_URL?.replace(/\/$/, "")
  if (!apiUrl) throw new Error("MAG_API_URL não configurada")
  return apiUrl
}

function magCnpj(): string {
  return (process.env.MAG_CNPJ || "27945275000154").replace(/\D/g, "")
}

async function magFetch(pathAndQuery: string, init?: RequestInit): Promise<{
  ok: boolean
  status: number
  data: unknown
  rawText: string
}> {
  const token = await getMagAccessToken()
  const url = `${magBaseUrl()}${pathAndQuery.startsWith("/") ? "" : "/"}${pathAndQuery}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  })
  const rawText = await res.text()
  let data: unknown
  try {
    data = rawText ? JSON.parse(rawText) : null
  } catch {
    data = rawText
  }
  return { ok: res.ok, status: res.status, data, rawText }
}

/** GET /apiseguradora/v3/modeloproposta/{codigo}?cnpj=&completo=true&version=1 */
export async function fetchModeloProposta(codigo: string) {
  const cnpj = magCnpj()
  const path =
    `/apiseguradora/v3/modeloproposta/${encodeURIComponent(codigo)}` +
    `?cnpj=${encodeURIComponent(cnpj)}&completo=true&version=1`
  return magFetch(path)
}

/** POST /apiseguradora/v3/simulacao?cnpj=&codigoModeloProposta= */
export async function postSimulacaoMag(codigoModeloProposta: string, body: unknown) {
  const cnpj = magCnpj()
  const path =
    `/apiseguradora/v3/simulacao?cnpj=${encodeURIComponent(cnpj)}` +
    `&codigoModeloProposta=${encodeURIComponent(codigoModeloProposta)}`
  return magFetch(path, {
    method: "POST",
    body: JSON.stringify(body),
  })
}
