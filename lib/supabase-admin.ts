import { createClient } from "@supabase/supabase-js"

/**
 * Cliente com service role — apenas em rotas/API server-side (nunca no browser).
 * Usado para leitura pública de cenários via token, sem expor RLS ao anon.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY para acesso server-side."
    )
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
