import { createAdminClient } from "@/lib/supabase-admin"
import type { PlanoState } from "@/lib/plano-context"

export type CenarioCompartilhado = {
  dados: PlanoState
  meta: {
    simulacaoId: string
    clienteId: string | null
    nomeSimulacao: string | null
    nomeCenario: string | null
  }
}

export function buildShareUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  return `${base}/plano/${token}`
}

export function tokenFromShareUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/^\/plano\/([a-f0-9]{32})$/i)
    return match?.[1] ?? null
  } catch {
    const match = url.match(/\/plano\/([a-f0-9]{32})$/i)
    return match?.[1] ?? null
  }
}

/**
 * Busca o cenário atual vinculado ao token (dados ao vivo, não snapshot).
 */
export async function buscarCenarioPorToken(token: string): Promise<CenarioCompartilhado | null> {
  const admin = createAdminClient()

  const { data: link, error: linkErr } = await admin
    .from("links_compartilhados")
    .select("simulacao_id, revogado_em")
    .eq("token", token)
    .maybeSingle()

  if (linkErr || !link || link.revogado_em) return null

  const { data: sim, error: simErr } = await admin
    .from("simulacoes")
    .select("id, cliente_id, nome_simulacao, nome_cenario, dados")
    .eq("id", link.simulacao_id)
    .maybeSingle()

  if (simErr || !sim?.dados) return null

  return {
    dados: sim.dados as PlanoState,
    meta: {
      simulacaoId: sim.id,
      clienteId: sim.cliente_id ?? null,
      nomeSimulacao: sim.nome_simulacao ?? null,
      nomeCenario: sim.nome_cenario ?? sim.nome_simulacao ?? null,
    },
  }
}
