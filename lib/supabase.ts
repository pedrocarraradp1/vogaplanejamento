import { createBrowserClient } from "@supabase/ssr"

/**
 * Perfis na tabela `public.profiles` (migration em supabase/migrations).
 * `cliente`: acesso somente leitura em /meu-diagnostico (plano compartilhado pelo advisor).
 * `advisor`: app completo em /dashboard.
 */
export type ProfileRole = "advisor" | "cliente"

export type Profile = {
  id: string
  role: ProfileRole
  updated_at: string | null
}

/**
 * Cliente Supabase para Client Components (browser).
 * `.env.local`: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY em .env.local."
    )
  }
  return createBrowserClient(url, key)
}
