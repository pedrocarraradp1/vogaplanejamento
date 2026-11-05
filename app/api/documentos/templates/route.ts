import { NextResponse } from "next/server"
import { listarTemplates } from "@/lib/documentos/templates-index"

export const runtime = "nodejs"

export async function GET() {
  try {
    return NextResponse.json({ templates: listarTemplates() })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao listar templates" },
      { status: 500 },
    )
  }
}
