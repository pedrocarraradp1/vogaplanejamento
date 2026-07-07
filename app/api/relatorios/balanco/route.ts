import { NextRequest, NextResponse } from "next/server"
import { PDFDocument } from "pdf-lib"

export const runtime = "nodejs"
export const maxDuration = 60

const PAGE_WIDTH = 960

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

    const pdfDoc = await PDFDocument.create()

    for (const capture of captures) {
      const image = await embedImage(pdfDoc, capture)
      const { width: imgW, height: imgH } = image.size()

      const pageHeight = PAGE_WIDTH * (imgH / imgW)
      const page = pdfDoc.addPage([PAGE_WIDTH, pageHeight])

      page.drawImage(image, {
        x: 0,
        y: 0,
        width: PAGE_WIDTH,
        height: pageHeight,
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
