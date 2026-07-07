import { NextRequest, NextResponse } from "next/server"
import { PDFDocument, rgb } from "pdf-lib"
import template from "@/lib/balanco-pdf-template.json"

export const runtime = "nodejs"
export const maxDuration = 60

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; isPng: boolean } {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i)
  if (!match) throw new Error("Formato de imagem inválido")
  const isPng = match[1].toLowerCase() === "png"
  const bytes = Uint8Array.from(Buffer.from(match[2], "base64"))
  return { bytes, isPng }
}

async function embedImage(pdfDoc: PDFDocument, dataUrl: string) {
  const { bytes, isPng } = dataUrlToBytes(dataUrl)
  return isPng ? pdfDoc.embedPng(bytes) : pdfDoc.embedJpg(bytes)
}

export async function POST(req: NextRequest) {
  try {
    const { slide1, slide2, slide3, nomeCliente } = await req.json()
    const captures: string[] = [slide1, slide2, slide3].filter(Boolean)

    if (captures.length === 0) {
      return NextResponse.json({ error: "Nenhuma seção capturada" }, { status: 400 })
    }

    const { pageWidthPt, pageHeightPt, slides } = template
    const pdfDoc = await PDFDocument.create()

    for (let i = 0; i < captures.length; i++) {
      const slot = slides[i]
      if (!slot) break

      const image = await embedImage(pdfDoc, captures[i])
      const page = pdfDoc.addPage([pageWidthPt, pageHeightPt])

      page.drawRectangle({
        x: 0,
        y: 0,
        width: pageWidthPt,
        height: pageHeightPt,
        color: rgb(1, 1, 1),
      })

      const pdfY = pageHeightPt - slot.topPt - slot.heightPt

      page.drawImage(image, {
        x: slot.leftPt,
        y: pdfY,
        width: slot.widthPt,
        height: slot.heightPt,
      })
    }

    const pdfBytes = await pdfDoc.save()
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
