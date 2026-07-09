import { NextResponse } from "next/server"
import { jsonApiError, jsonSupabaseError, logAndJsonError } from "@/lib/api-error"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ token: string }> }

export async function DELETE(_req: Request, context: RouteContext) {
  const routeContext = "DELETE /api/links-compartilhados/[token]"

  try {
    const { token } = await context.params
    if (!token || !/^[a-f0-9]{32}$/i.test(token)) {
      return jsonApiError("Token inválido.", 400)
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr) {
      return jsonSupabaseError(authErr, 401, `${routeContext} auth`)
    }
    if (!user) {
      return jsonApiError("Não autenticado.", 401)
    }

    const { data: link, error: linkErr } = await supabase
      .from("links_compartilhados")
      .select("id, revogado_em")
      .eq("token", token)
      .maybeSingle()

    if (linkErr) {
      return jsonSupabaseError(linkErr, 500, `${routeContext} links_compartilhados.select`)
    }
    if (!link) {
      return jsonApiError("Link não encontrado.", 404)
    }

    if (link.revogado_em) {
      return NextResponse.json({ ok: true })
    }

    const { error: updateErr } = await supabase
      .from("links_compartilhados")
      .update({ revogado_em: new Date().toISOString() })
      .eq("token", token)

    if (updateErr) {
      return jsonSupabaseError(updateErr, 500, `${routeContext} links_compartilhados.update`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return logAndJsonError(err, routeContext)
  }
}
