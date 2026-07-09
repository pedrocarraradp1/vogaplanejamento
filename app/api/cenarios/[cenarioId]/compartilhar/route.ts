import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { buildShareUrl } from "@/lib/links-compartilhados"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ cenarioId: string }> }

export async function POST(_req: Request, context: RouteContext) {
  try {
    const { cenarioId } = await context.params
    if (!cenarioId) {
      return NextResponse.json({ error: "Cenário inválido." }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
    }

    const { data: simulacao, error: simErr } = await supabase
      .from("simulacoes")
      .select("id")
      .eq("id", cenarioId)
      .maybeSingle()

    if (simErr || !simulacao) {
      return NextResponse.json({ error: "Cenário não encontrado." }, { status: 404 })
    }

    const { data: existente } = await supabase
      .from("links_compartilhados")
      .select("token")
      .eq("simulacao_id", cenarioId)
      .is("revogado_em", null)
      .maybeSingle()

    if (existente?.token) {
      return NextResponse.json({ url: buildShareUrl(existente.token), token: existente.token })
    }

    const token = randomBytes(16).toString("hex")

    const { error: insertErr } = await supabase.from("links_compartilhados").insert({
      token,
      simulacao_id: cenarioId,
      criado_por: user.id,
    })

    if (insertErr) {
      console.error("Erro ao criar link compartilhado:", insertErr)
      return NextResponse.json({ error: "Não foi possível gerar o link." }, { status: 500 })
    }

    return NextResponse.json({ url: buildShareUrl(token), token })
  } catch (err) {
    console.error("POST /api/cenarios/[cenarioId]/compartilhar:", err)
    const message = err instanceof Error ? err.message : "Erro interno."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
