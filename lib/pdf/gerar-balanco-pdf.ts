import { PDFDocument, PDFImage } from "pdf-lib"

/** Largura de referência (pt) — consistente entre todas as páginas do relatório. */
export const PAGE_WIDTH_PT = 960

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; isPng: boolean } {
  const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/i)
  if (!match) throw new Error("Formato de imagem inválido")
  const isPng = match[1].toLowerCase() === "png"
  const bytes = Uint8Array.from(Buffer.from(match[2], "base64"))
  return { bytes, isPng }
}

async function embedCapture(pdfDoc: PDFDocument, dataUrl: string): Promise<PDFImage> {
  const { bytes, isPng } = dataUrlToBytes(dataUrl)
  return isPng ? pdfDoc.embedPng(bytes) : pdfDoc.embedJpg(bytes)
}

/**
 * Uma página por screenshot: altura = largura de referência × proporção real da imagem.
 * Sem 16:9 fixo, sem letterbox, sem esticar width/height de forma independente.
 */
function addPageWithNaturalProportion(pdfDoc: PDFDocument, image: PDFImage) {
  const { width: imgW, height: imgH } = image.size()
  const pageHeight = PAGE_WIDTH_PT * (imgH / imgW)

  const page = pdfDoc.addPage([PAGE_WIDTH_PT, pageHeight])
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: PAGE_WIDTH_PT,
    height: pageHeight,
  })
}

/** Gera PDF do balanço (3 seções: balanço, indicadores, detalhamento por ativo). */
export async function gerarBalancoPdf(captures: string[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()

  for (const capture of captures) {
    const image = await embedCapture(pdfDoc, capture)
    addPageWithNaturalProportion(pdfDoc, image)
  }

  return pdfDoc.save()
}
