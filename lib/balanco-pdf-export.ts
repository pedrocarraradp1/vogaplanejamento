export type BalancoPdfOptions = {
  clientName: string
  referenceDate: string
}

const PAGE_MARGIN = 14
const FOOTER_H = 9
const HEADER_H = 38
const SECTION_GAP = 4
const CANVAS_SCALE = 2.5
const EXPORT_WIDTH_PX = 720

type JsPDFInstance = InstanceType<typeof import("jspdf").jsPDF>

function getJsPDF(
  mod: { jsPDF?: typeof import("jspdf").jsPDF; default?: typeof import("jspdf").jsPDF },
): typeof import("jspdf").jsPDF {
  return mod.jsPDF ?? mod.default!
}

function drawHeader(pdf: JsPDFInstance, opts: BalancoPdfOptions, pageW: number, margin: number) {
  pdf.setFillColor(1, 33, 55)
  pdf.rect(0, 0, pageW, HEADER_H, "F")
  pdf.setFillColor(75, 117, 155)
  pdf.rect(0, HEADER_H, pageW, 1.2, "F")

  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(18)
  pdf.setFont("helvetica", "bold")
  pdf.text("BALANÇO PATRIMONIAL", margin, 14)

  pdf.setFontSize(9)
  pdf.setFont("helvetica", "normal")
  pdf.setTextColor(200, 226, 245)
  pdf.text("Demonstrativo completo de ativos e passivos", margin, 20)

  pdf.setFontSize(8)
  pdf.setTextColor(160, 190, 220)
  pdf.text(`Cliente: ${opts.clientName}`, margin, 28)
  pdf.text(`Data de referência: ${opts.referenceDate}`, margin, 33)
  pdf.text("Classificação: Confidencial", pageW - margin, 33, { align: "right" })

  pdf.setFontSize(7)
  pdf.setTextColor(120, 150, 180)
  pdf.text("Voga | BTG Pactual | Planejamento Financeiro Pessoal", margin, HEADER_H - 2)
}

function drawFooter(pdf: JsPDFInstance, opts: BalancoPdfOptions, pageW: number, pageH: number, margin: number) {
  pdf.setFillColor(1, 33, 55)
  pdf.rect(0, pageH - FOOTER_H, pageW, FOOTER_H, "F")
  pdf.setFontSize(7)
  pdf.setTextColor(160, 190, 220)
  pdf.text("Voga | BTG Pactual | Confidencial", margin, pageH - 3)
  pdf.text(`${opts.clientName} — Balanço Patrimonial`, pageW / 2, pageH - 3, { align: "center" })
  pdf.text(opts.referenceDate, pageW - margin, pageH - 3, { align: "right" })
}

function sliceCanvas(source: HTMLCanvasElement, sourceY: number, sliceHeight: number): HTMLCanvasElement {
  const slice = document.createElement("canvas")
  slice.width = source.width
  slice.height = sliceHeight
  const ctx = slice.getContext("2d")!
  ctx.drawImage(source, 0, sourceY, source.width, sliceHeight, 0, 0, source.width, sliceHeight)
  return slice
}

export async function exportBalancoPatrimonialPdf(
  rootId: string,
  options: BalancoPdfOptions,
): Promise<void> {
  const el = document.getElementById(rootId)
  if (!el) return

  const [{ default: html2canvas }, jspdfMod] = await Promise.all([
    import("html2canvas"),
    // @ts-expect-error — bundle ESM do jsPDF para evitar import node no SSR
    import("jspdf/dist/jspdf.es.min.js"),
  ])
  const jsPDF = getJsPDF(jspdfMod as { jsPDF?: typeof import("jspdf").jsPDF; default?: typeof import("jspdf").jsPDF })

  el.classList.add("pdf-export-mode")
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

  try {
    const sections = Array.from(el.querySelectorAll<HTMLElement>(".pdf-section"))
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const contentW = pageW - PAGE_MARGIN * 2

    let pageIndex = 0
    let yCursor = HEADER_H + 4

    const newPage = () => {
      if (pageIndex > 0) drawFooter(pdf, options, pageW, pageH, PAGE_MARGIN)
      if (pageIndex > 0) pdf.addPage()
      pageIndex++
      if (pageIndex === 1) {
        drawHeader(pdf, options, pageW, PAGE_MARGIN)
        yCursor = HEADER_H + 4
      } else {
        yCursor = PAGE_MARGIN
      }
    }

    newPage()

    for (const section of sections) {
      const canvas = await html2canvas(section, {
        scale: CANVAS_SCALE,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: EXPORT_WIDTH_PX,
        windowWidth: EXPORT_WIDTH_PX,
      })

      const sectionHeightMm = (canvas.height * contentW) / canvas.width
      let sourceY = 0
      let remainingPx = canvas.height

      while (remainingPx > 0) {
        const usedMm = (sourceY / canvas.height) * sectionHeightMm
        const remainingMm = sectionHeightMm - usedMm
        const availableMm = pageH - yCursor - FOOTER_H - 2

        if (availableMm < 12) {
          newPage()
          continue
        }

        const sliceMm = Math.min(remainingMm, availableMm)
        const slicePx = (sliceMm / sectionHeightMm) * canvas.height
        const sliceCanvasEl = sliceCanvas(canvas, sourceY, slicePx)
        const sliceImg = sliceCanvasEl.toDataURL("image/png")

        pdf.addImage(sliceImg, "PNG", PAGE_MARGIN, yCursor, contentW, sliceMm)

        sourceY += slicePx
        remainingPx -= slicePx
        yCursor += sliceMm + (remainingPx > 0 ? 0 : SECTION_GAP)

        if (remainingPx > 0 && pageH - yCursor - FOOTER_H < 12) {
          newPage()
        }
      }
    }

    drawFooter(pdf, options, pageW, pageH, PAGE_MARGIN)

    const safeName = options.clientName.replace(/\s+/g, "_")
    pdf.save(`Balanco_Patrimonial_${safeName}_${new Date().getFullYear()}.pdf`)
  } finally {
    el.classList.remove("pdf-export-mode")
  }
}
