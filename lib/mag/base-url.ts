/** URL absoluta do próprio app (chamadas server → `/api/...`). */
export function getServerBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, "")
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}
