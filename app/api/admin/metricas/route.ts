import { NextResponse } from "next/server"
import { jsonApiError, jsonSupabaseError, logAndJsonError } from "@/lib/api-error"
import { isAdminRole } from "@/lib/profile-role"
import { createServerSupabaseClient } from "@/lib/supabase-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const routeContext = "GET /api/admin/metricas"

  try {
    const { searchParams } = new URL(req.url)
    const inicio = searchParams.get("inicio")
    const fim = searchParams.get("fim")
    if (!inicio || !fim) {
      return jsonApiError("Informe inicio e fim (ISO 8601).", 400)
    }
    const inicioDate = new Date(inicio)
    const fimDate = new Date(fim)
    if (Number.isNaN(inicioDate.getTime()) || Number.isNaN(fimDate.getTime())) {
      return jsonApiError("Datas inválidas.", 400)
    }
    if (inicioDate > fimDate) {
      return jsonApiError("O início do período deve ser anterior ao fim.", 400)
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

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    if (profileErr) {
      return jsonSupabaseError(profileErr, 500, `${routeContext} profiles`)
    }
    if (!isAdminRole(profile?.role)) {
      return jsonApiError("Sem permissão.", 403, { code: "forbidden" })
    }

    const { data, error } = await supabase.rpc("admin_metricas_planejamentos", {
      p_inicio: inicioDate.toISOString(),
      p_fim: fimDate.toISOString(),
    })
    if (error) {
      const missing =
        error.message?.toLowerCase().includes("admin_metricas_planejamentos") ||
        error.code === "PGRST202" ||
        error.code === "42883"
      if (missing) {
        return jsonApiError(
          "A função admin_metricas_planejamentos ainda não existe no Supabase. Rode a migration 20260826180000_admin_role_metricas.sql.",
          500,
          { code: "missing_rpc" },
        )
      }
      return jsonSupabaseError(error, 500, `${routeContext} rpc`)
    }

    const payload = typeof data === "string" ? JSON.parse(data) : data
    return NextResponse.json(payload)
  } catch (err) {
    return logAndJsonError(err, routeContext)
  }
}
