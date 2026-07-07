import { NextRequest, NextResponse } from "next/server"
import { gerarBalancoPdf } from "@/lib/pdf/gerar-balanco-pdf"

export const runtime = "nodejs"
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { slide1, slide2, slide3, nomeCliente } = await req.json()
    const captures: string[] = [slide1, slide2, slide3].filter(Boolean)

    if (captures.length === 0) {
      return NextResponse.json({ error: "Nenhuma seção capturada" }, { status: 400 })
    }

    const pdfBytes = await gerarBalancoPdf(captures)
    const safeName = String(nomeCliente || "Cliente").replace(/[^\w\-]+/g, "_")

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Balanco_${safeName}_${new Date().getFullYear()}.pdf"`,
      },
    })
  } catch (err) {
    console.error("Erro ao gerar balanço PDF:", err)
    const message = err instanceof Error ? err.message : "Erro desconhecido"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
