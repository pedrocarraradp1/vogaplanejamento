import { Document, Packer, Paragraph, TextRun, Header, Footer } from "docx"
// Browser build: the Node entry pulls fflate workers and breaks Next/Turbopack SSR.
import { jsPDF } from "jspdf/dist/jspdf.es.min.js"
import { CABECALHO_VOGA, RODAPE_MINUTA } from "./preencher"

function linhas(texto: string): string[] {
  return texto.replace(/\r\n/g, "\n").split("\n")
}

export async function exportarDocx(titulo: string, corpo: string): Promise<Blob> {
  const children: Paragraph[] = []
  for (const linha of linhas(corpo)) {
    const t = linha.trim()
    if (!t) {
      children.push(new Paragraph({ text: "" }))
      continue
    }
    const heading = t.startsWith("# ")
    const heading2 = t.startsWith("## ")
    const texto = heading ? t.slice(2) : heading2 ? t.slice(3) : t
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: texto,
            bold: heading || heading2,
            size: heading ? 28 : heading2 ? 24 : 22,
            font: "Times New Roman",
          }),
        ],
      }),
    )
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: CABECALHO_VOGA,
                    bold: true,
                    size: 20,
                    font: "Times New Roman",
                    color: "01121E",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: RODAPE_MINUTA,
                    italics: true,
                    size: 16,
                    font: "Times New Roman",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: titulo,
                bold: true,
                size: 32,
                font: "Times New Roman",
              }),
            ],
          }),
          ...children,
        ],
      },
    ],
  })

  return Packer.toBlob(doc)
}

export function exportarPdf(titulo: string, corpo: string): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margem = 56
  const maxW = pageW - margem * 2

  const desenharMarcaDagua = () => {
    doc.setTextColor(200, 200, 200)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(64)
    doc.text("MINUTA", pageW / 2, pageH / 2, {
      align: "center",
      angle: 32,
    })
    doc.setTextColor(0, 0, 0)
  }

  const cabecalhoRodape = () => {
    desenharMarcaDagua()
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(1, 18, 30)
    doc.text(CABECALHO_VOGA, margem, 36)
    doc.setDrawColor(16, 102, 218)
    doc.line(margem, 42, pageW - margem, 42)
    doc.setFont("helvetica", "italic")
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    const rodape = doc.splitTextToSize(RODAPE_MINUTA, maxW)
    doc.text(rodape, margem, pageH - 36)
    doc.setTextColor(0, 0, 0)
  }

  cabecalhoRodape()
  let y = 64
  doc.setFont("times", "bold")
  doc.setFontSize(14)
  const tituloLinhas = doc.splitTextToSize(titulo, maxW)
  doc.text(tituloLinhas, margem, y)
  y += tituloLinhas.length * 18 + 12

  doc.setFont("times", "normal")
  doc.setFontSize(11)

  for (const linha of linhas(corpo)) {
    const t = linha.trim()
    if (!t) {
      y += 10
      continue
    }
    const isH = t.startsWith("# ")
    const isH2 = t.startsWith("## ")
    const texto = isH ? t.slice(2) : isH2 ? t.slice(3) : t
    doc.setFont("times", isH || isH2 ? "bold" : "normal")
    doc.setFontSize(isH ? 13 : isH2 ? 12 : 11)
    const wrapped = doc.splitTextToSize(texto, maxW)
    for (const w of wrapped) {
      if (y > pageH - 64) {
        doc.addPage()
        cabecalhoRodape()
        y = 64
      }
      doc.text(w, margem, y)
      y += 16
    }
    y += 4
  }

  return doc.output("blob")
}
