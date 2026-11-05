import { NextRequest, NextResponse } from "next/server"
import { gerarRelatorioA4 } from "@/lib/pdf/gerar-relatorio-a4"
import type { RelatorioA4Input } from "@/lib/pdf/tipos-relatorio"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RelatorioA4Input & { nomeArquivo?: string }
    if (!body?.secoes?.length) {
      return NextResponse.json({ error: "Relatório sem seções" }, { status: 400 })
    }
    const pdfBytes = await gerarRelatorioA4({
      titulo: body.titulo || "Planejamento sucessório",
      cliente: body.cliente || "Cliente",
      assessor: body.assessor || "Assessor",
      data: body.data || new Intl.DateTimeFormat("pt-BR").format(new Date()),
      secoes: body.secoes,
    })
    const safeName = String(body.nomeArquivo || body.cliente || "Cliente").replace(/[^\w\-]+/g, "_")
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Sucessorio_${safeName}.pdf"`,
      },
    })
  } catch (err) {
    console.error("Erro ao gerar relatório sucessório:", err)
    const message = err instanceof Error ? err.message : "Erro desconhecido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
