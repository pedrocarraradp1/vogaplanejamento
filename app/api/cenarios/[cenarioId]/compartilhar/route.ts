import { randomBytes } from "crypto"
import { NextResponse } from "next/server"
import { jsonApiError, jsonSupabaseError, logAndJsonError } from "@/lib/api-error"
import { buildShareUrl, resolveShareAppBaseUrl } from "@/lib/links-compartilhados"
import { createAdminClient } from "@/lib/supabase-admin"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const runtime = "nodejs"

type RouteContext = { params: Promise<{ cenarioId: string }> }

export async function POST(_req: Request, context: RouteContext) {
  const routeContext = "POST /api/cenarios/[cenarioId]/compartilhar"

  try {
    const { cenarioId } = await context.params
    if (!cenarioId) {
      return jsonApiError("Cenário inválido.", 400)
    }

    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr) {
      console.error(`${routeContext} auth:`, authErr)
      return jsonSupabaseError(authErr, 401, `${routeContext} auth`)
    }
    if (!user) {
      return jsonApiError("Não autenticado.", 401)
    }

    const { data: simulacao, error: simErr } = await supabase
      .from("simulacoes")
      .select("id, advisor_id")
      .eq("id", cenarioId)
      .maybeSingle()

    if (simErr) {
      return jsonSupabaseError(simErr, 500, `${routeContext} simulacoes.select`)
    }
    if (!simulacao) {
      return jsonApiError("Cenário não encontrado.", 404)
    }

    if (simulacao.advisor_id && simulacao.advisor_id !== user.id) {
      return jsonApiError("Sem permissão para compartilhar este cenário.", 403, {
        code: "forbidden",
        advisorId: simulacao.advisor_id,
        userId: user.id,
      })
    }

    if (!resolveShareAppBaseUrl()) {
      return jsonApiError(
        "NEXT_PUBLIC_APP_URL não configurada no servidor. Defina como https://vogaplanejamento.vercel.app em Production.",
        500,
        { code: "missing_app_url" },
      )
    }

    let admin
    try {
      admin = createAdminClient()
    } catch (envErr) {
      console.error(`${routeContext} admin client:`, envErr)
      const message =
        envErr instanceof Error
          ? envErr.message
          : "SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL ausente."
      return jsonApiError(message, 500, { code: "missing_service_role" })
    }

    const { data: existente, error: linkSelectErr } = await admin
      .from("links_compartilhados")
      .select("token")
      .eq("simulacao_id", cenarioId)
      .is("revogado_em", null)
      .maybeSingle()

    if (linkSelectErr) {
      return jsonSupabaseError(linkSelectErr, 500, `${routeContext} links_compartilhados.select`)
    }

    if (existente?.token) {
      return NextResponse.json({ url: buildShareUrl(existente.token), token: existente.token })
    }

    const token = randomBytes(16).toString("hex")

    const { error: insertErr } = await admin.from("links_compartilhados").insert({
      token,
      simulacao_id: cenarioId,
      criado_por: user.id,
    })

    if (insertErr) {
      return jsonSupabaseError(insertErr, 500, `${routeContext} links_compartilhados.insert`)
    }

    return NextResponse.json({ url: buildShareUrl(token), token })
  } catch (err) {
    return logAndJsonError(err, routeContext)
  }
}
