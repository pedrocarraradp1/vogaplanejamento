export type BalancoPdfOptions = {
  clientName: string
  referenceDate: string
}

const PAGE_MARGIN = 12
const FOOTER_H = 8
const HEADER_H = 32
const SECTION_GAP = 3
const CANVAS_SCALE = 2
/** Largura do layout durante captura (px) — proporcional à página paisagem. */
const EXPORT_WIDTH_PX = 1200

type JsPDFConstructor = typeof import("jspdf").jsPDF
type JsPDFInstance = InstanceType<JsPDFConstructor>

function getJsPDF(
  mod: { jsPDF?: JsPDFConstructor; default?: JsPDFConstructor },
): JsPDFConstructor {
  const ctor = mod.jsPDF ?? mod.default
  if (!ctor) throw new Error("jsPDF não carregou corretamente.")
  return ctor
}

function drawHeader(pdf: JsPDFInstance, opts: BalancoPdfOptions, pageW: number, margin: number) {
  pdf.setFillColor(1, 33, 55)
  pdf.rect(0, 0, pageW, HEADER_H, "F")
  pdf.setFillColor(75, 117, 155)
  pdf.rect(0, HEADER_H, pageW, 1, "F")

  pdf.setTextColor(255, 255, 255)
  pdf.setFontSize(16)
  pdf.setFont("helvetica", "bold")
  pdf.text("BALANÇO PATRIMONIAL", margin, 12)

  pdf.setFontSize(8)
  pdf.setFont("helvetica", "normal")
  pdf.setTextColor(200, 226, 245)
  pdf.text("Demonstrativo completo de ativos e passivos", margin, 18)

  pdf.setTextColor(160, 190, 220)
  pdf.text(`Cliente: ${opts.clientName}`, margin, 24)
  pdf.text(`Data de referência: ${opts.referenceDate}`, margin, 29)
  pdf.text("Classificação: Confidencial", pageW - margin, 29, { align: "right" })

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
  const h = Math.max(1, Math.round(sliceHeight))
  const slice = document.createElement("canvas")
  slice.width = source.width
  slice.height = h
  const ctx = slice.getContext("2d")!
  ctx.drawImage(source, 0, sourceY, source.width, h, 0, 0, source.width, h)
  return slice
}

function showExportOverlay(message: string): HTMLDivElement {
  const overlay = document.createElement("div")
  overlay.setAttribute("data-pdf-overlay", "true")
  overlay.style.cssText =
    "position:fixed;inset:0;background:rgba(1,33,55,0.45);z-index:99999;display:flex;align-items:center;justify-content:center;"
  overlay.innerHTML = `<div style="background:#fff;border-radius:8px;padding:20px 28px;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#012137;box-shadow:0 8px 32px rgba(0,0,0,0.2)">${message}</div>`
  document.body.appendChild(overlay)
  return overlay
}

export async function exportBalancoPatrimonialPdf(
  rootId: string,
  options: BalancoPdfOptions,
): Promise<void> {
  const el = document.getElementById(rootId)
  if (!el) throw new Error("Conteúdo do balanço não encontrado.")

  const overlay = showExportOverlay("Gerando PDF…")

  const [{ default: html2canvas }, jspdfMod] = await Promise.all([
    import("html2canvas"),
    // @ts-expect-error — bundle ESM do jsPDF para evitar import node no SSR
    import("jspdf/dist/jspdf.es.min.js"),
  ])
  const jsPDF = getJsPDF(jspdfMod as { jsPDF?: JsPDFConstructor; default?: JsPDFConstructor })

  el.classList.add("pdf-export-mode")
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

  try {
    const sections = Array.from(el.querySelectorAll<HTMLElement>(".pdf-section"))
    if (sections.length === 0) {
      throw new Error("Nenhuma seção encontrada para exportar.")
    }

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a3",
    })
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
        scrollX: 0,
        scrollY: 0,
      })

      if (canvas.width === 0 || canvas.height === 0) continue

      const sectionHeightMm = (canvas.height * contentW) / canvas.width
      let sourceY = 0
      let remainingPx = canvas.height
      let guard = 0

      while (remainingPx > 1 && guard < 200) {
        guard++
        const usedMm = (sourceY / canvas.height) * sectionHeightMm
        const remainingMm = sectionHeightMm - usedMm
        let availableMm = pageH - yCursor - FOOTER_H - 2

        if (availableMm < 10) {
          newPage()
          availableMm = pageH - yCursor - FOOTER_H - 2
          if (availableMm < 10) break
        }

        const sliceMm = Math.min(remainingMm, availableMm)
        const slicePx = Math.max(1, (sliceMm / sectionHeightMm) * canvas.height)
        const sliceCanvasEl = sliceCanvas(canvas, sourceY, Math.min(slicePx, remainingPx))
        const sliceImg = sliceCanvasEl.toDataURL("image/png")

        pdf.addImage(sliceImg, "PNG", PAGE_MARGIN, yCursor, contentW, sliceMm)

        sourceY += slicePx
        remainingPx -= slicePx
        yCursor += sliceMm + (remainingPx > 1 ? 0 : SECTION_GAP)

        if (remainingPx > 1 && pageH - yCursor - FOOTER_H < 10) {
          newPage()
        }
      }
    }

    drawFooter(pdf, options, pageW, pageH, PAGE_MARGIN)

    const safeName = options.clientName.replace(/\s+/g, "_")
    pdf.save(`Balanco_Patrimonial_${safeName}_${new Date().getFullYear()}.pdf`)
  } finally {
    el.classList.remove("pdf-export-mode")
    overlay.remove()
  }
}
