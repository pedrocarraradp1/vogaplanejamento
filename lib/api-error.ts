import { NextResponse } from "next/server"

type SupabaseLikeError = {
  message?: string
  code?: string
  details?: string | null
  hint?: string | null
}

export function supabaseErrorFields(err: SupabaseLikeError | null | undefined) {
  if (!err) return {}
  return {
    error: err.message ?? "Erro no Supabase",
    code: err.code ?? null,
    details: err.details ?? null,
    hint: err.hint ?? null,
  }
}

export function jsonApiError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
) {
  return NextResponse.json({ error: message, ...extra }, { status })
}

export function jsonSupabaseError(
  err: SupabaseLikeError,
  status: number,
  context?: string,
) {
  const fields = supabaseErrorFields(err)
  if (context) {
    console.error(context, err)
  }
  return NextResponse.json(fields, { status })
}

export function logAndJsonError(err: unknown, context: string, status = 500) {
  console.error(context, err)
  if (err && typeof err === "object" && "message" in err) {
    return jsonSupabaseError(err as SupabaseLikeError, status, undefined)
  }
  const message = err instanceof Error ? err.message : "Erro interno."
  return jsonApiError(message, status)
}
