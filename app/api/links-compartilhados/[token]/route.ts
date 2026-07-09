import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ token: string }> }

export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { token } = await context.params
    if (!token || !/^[a-f0-9]{32}$/i.test(token)) {
      return NextResponse.json({ error: "Token inválido." }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
    }

    const { data: link, error: linkErr } = await supabase
      .from("links_compartilhados")
      .select("id, revogado_em")
      .eq("token", token)
      .maybeSingle()

    if (linkErr || !link) {
      return NextResponse.json({ error: "Link não encontrado." }, { status: 404 })
    }

    if (link.revogado_em) {
      return NextResponse.json({ ok: true })
    }

    const { error: updateErr } = await supabase
      .from("links_compartilhados")
      .update({ revogado_em: new Date().toISOString() })
      .eq("token", token)

    if (updateErr) {
      console.error("Erro ao revogar link:", updateErr)
      return NextResponse.json({ error: "Não foi possível revogar o link." }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("DELETE /api/links-compartilhados/[token]:", err)
    const message = err instanceof Error ? err.message : "Erro interno."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
