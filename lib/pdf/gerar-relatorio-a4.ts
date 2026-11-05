import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib"
import { readFile } from "fs/promises"
import path from "path"
import type { RelatorioA4Input, RelatorioKpi, RelatorioTabela } from "./tipos-relatorio"

export type { RelatorioA4Input, RelatorioKpi, RelatorioSecaoA4, RelatorioTabela } from "./tipos-relatorio"

const A4 = { width: 595.28, height: 841.89 }
const MARGIN = 48
const NAVY = rgb(1 / 255, 18 / 255, 30 / 255)
const BLUE = rgb(16 / 255, 102 / 255, 218 / 255)
const GRAY = rgb(0.35, 0.35, 0.35)
const LIGHT = rgb(0.93, 0.94, 0.95)

export const RODAPE_LEGAL_SUCESSORIO =
  "Simulação com a legislação vigente; não substitui a análise do caso concreto"

type Ctx = {
  doc: PDFDocument
  page: PDFPage
  font: PDFFont
  fontBold: PDFFont
  y: number
  logo?: { bytes: Uint8Array; isPng: boolean }
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean)
  if (words.length === 0) return [""]
  const lines: string[] = []
  let atual = ""
  for (const w of words) {
    const trial = atual ? `${atual} ${w}` : w
    if (font.widthOfTextAtSize(trial, size) <= maxWidth) atual = trial
    else {
      if (atual) lines.push(atual)
      atual = w
    }
  }
  if (atual) lines.push(atual)
  return lines
}

async function carregarLogo(): Promise<{ bytes: Uint8Array; isPng: boolean } | undefined> {
  try {
    const file = path.join(process.cwd(), "public", "logo-voga.png")
    const bytes = await readFile(file)
    return { bytes: new Uint8Array(bytes), isPng: true }
  } catch {
    return undefined
  }
}

async function novaPagina(ctx: Ctx, cabecalho: RelatorioA4Input) {
  ctx.page = ctx.doc.addPage([A4.width, A4.height])
  ctx.y = A4.height - MARGIN
  await desenharCabecalho(ctx, cabecalho)
}

async function desenharCabecalho(ctx: Ctx, info: RelatorioA4Input) {
  const { page, font, fontBold } = ctx
  let logoW = 0
  if (ctx.logo) {
    try {
      const img = ctx.logo.isPng
        ? await ctx.doc.embedPng(ctx.logo.bytes)
        : await ctx.doc.embedJpg(ctx.logo.bytes)
      const h = 22
      logoW = (img.width / img.height) * h
      page.drawImage(img, { x: MARGIN, y: ctx.y - h + 4, width: logoW, height: h })
    } catch {
      logoW = 0
    }
  }
  const left = MARGIN + (logoW ? logoW + 10 : 0)
  page.drawText("VOGA", {
    x: left,
    y: ctx.y - 4,
    size: 12,
    font: fontBold,
    color: NAVY,
  })
  page.drawText("Planejamento sucessório", {
    x: left,
    y: ctx.y - 18,
    size: 8,
    font,
    color: BLUE,
  })
  const meta = [
    `Cliente: ${info.cliente || "—"}`,
    `Assessor: ${info.assessor || "—"}`,
    info.data,
  ]
  let my = ctx.y - 4
  for (const line of meta) {
    const w = font.widthOfTextAtSize(line, 8)
    page.drawText(line, { x: A4.width - MARGIN - w, y: my, size: 8, font, color: GRAY })
    my -= 11
  }
  ctx.y -= 36
  page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: A4.width - MARGIN, y: ctx.y },
    thickness: 1,
    color: BLUE,
  })
  ctx.y -= 18
  page.drawText(info.titulo, { x: MARGIN, y: ctx.y, size: 14, font: fontBold, color: NAVY })
  ctx.y -= 22
}

function desenharRodape(page: PDFPage, font: PDFFont, pagina: number, total: number) {
  page.drawLine({
    start: { x: MARGIN, y: 40 },
    end: { x: A4.width - MARGIN, y: 40 },
    thickness: 0.5,
    color: LIGHT,
  })
  const rodape = RODAPE_LEGAL_SUCESSORIO
  page.drawText(rodape, { x: MARGIN, y: 26, size: 7, font, color: GRAY })
  const num = `${pagina} / ${total}`
  const w = font.widthOfTextAtSize(num, 7)
  page.drawText(num, { x: A4.width - MARGIN - w, y: 26, size: 7, font, color: GRAY })
}

async function garantirEspaco(ctx: Ctx, info: RelatorioA4Input, h: number) {
  if (ctx.y - h < 56) await novaPagina(ctx, info)
}

async function texto(
  ctx: Ctx,
  info: RelatorioA4Input,
  value: string,
  opts: { size?: number; bold?: boolean; color?: RGB; gap?: number } = {},
) {
  const size = opts.size ?? 9
  const font = opts.bold ? ctx.fontBold : ctx.font
  const max = A4.width - MARGIN * 2
  const lines = wrap(value, font, size, max)
  for (const line of lines) {
    await garantirEspaco(ctx, info, size + 4)
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y, size, font, color: opts.color ?? NAVY })
    ctx.y -= size + 3
  }
  ctx.y -= opts.gap ?? 2
}

async function desenharKpis(ctx: Ctx, info: RelatorioA4Input, kpis: RelatorioKpi[]) {
  if (!kpis.length) return
  const gap = 8
  const cols = Math.min(4, kpis.length)
  const boxW = (A4.width - MARGIN * 2 - gap * (cols - 1)) / cols
  const boxH = 48
  let i = 0
  while (i < kpis.length) {
    await garantirEspaco(ctx, info, boxH + 8)
    const slice = kpis.slice(i, i + cols)
    slice.forEach((kpi, idx) => {
      const x = MARGIN + idx * (boxW + gap)
      ctx.page.drawRectangle({
        x,
        y: ctx.y - boxH,
        width: boxW,
        height: boxH,
        color: LIGHT,
        borderColor: rgb(0.85, 0.87, 0.9),
        borderWidth: 0.5,
      })
      ctx.page.drawText(kpi.label.slice(0, 42), {
        x: x + 8,
        y: ctx.y - 14,
        size: 7,
        font: ctx.font,
        color: BLUE,
      })
      ctx.page.drawText(kpi.valor.slice(0, 28), {
        x: x + 8,
        y: ctx.y - 30,
        size: 11,
        font: ctx.fontBold,
        color: NAVY,
      })
      if (kpi.hint) {
        ctx.page.drawText(kpi.hint.slice(0, 40), {
          x: x + 8,
          y: ctx.y - 42,
          size: 7,
          font: ctx.font,
          color: GRAY,
        })
      }
    })
    ctx.y -= boxH + 12
    i += cols
  }
}

async function desenharTabela(ctx: Ctx, info: RelatorioA4Input, tabela: RelatorioTabela) {
  const cols = tabela.colunas.length
  if (!cols) return
  const width = A4.width - MARGIN * 2
  const colW = width / cols
  const rowH = 16
  await garantirEspaco(ctx, info, rowH + 4)
  ctx.page.drawRectangle({
    x: MARGIN,
    y: ctx.y - rowH,
    width,
    height: rowH,
    color: NAVY,
  })
  tabela.colunas.forEach((c, i) => {
    ctx.page.drawText(c.slice(0, 28), {
      x: MARGIN + i * colW + 4,
      y: ctx.y - 11,
      size: 7,
      font: ctx.fontBold,
      color: rgb(1, 1, 1),
    })
  })
  ctx.y -= rowH
  for (const linha of tabela.linhas) {
    await garantirEspaco(ctx, info, rowH)
    ctx.page.drawRectangle({
      x: MARGIN,
      y: ctx.y - rowH,
      width,
      height: rowH,
      borderColor: LIGHT,
      borderWidth: 0.4,
    })
    linha.forEach((cell, i) => {
      ctx.page.drawText(String(cell).slice(0, 32), {
        x: MARGIN + i * colW + 4,
        y: ctx.y - 11,
        size: 7,
        font: ctx.font,
        color: NAVY,
      })
    })
    ctx.y -= rowH
  }
  ctx.y -= 8
}

async function desenharCapa(ctx: Ctx, info: RelatorioA4Input) {
  const { page, font, fontBold } = ctx
  page.drawRectangle({ x: 0, y: 0, width: A4.width, height: A4.height, color: rgb(1, 1, 1) })
  page.drawRectangle({ x: 0, y: A4.height - 8, width: A4.width, height: 8, color: BLUE })
  if (ctx.logo) {
    try {
      const img = ctx.logo.isPng
        ? await ctx.doc.embedPng(ctx.logo.bytes)
        : await ctx.doc.embedJpg(ctx.logo.bytes)
      const h = 36
      const w = (img.width / img.height) * h
      page.drawImage(img, { x: MARGIN, y: A4.height - 80, width: w, height: h })
    } catch {
      /* sem logo */
    }
  }
  page.drawText("VOGA", { x: MARGIN, y: 520, size: 11, font: fontBold, color: BLUE })
  const tituloLinhas = wrap(info.titulo || "Parecer", fontBold, 22, A4.width - MARGIN * 2)
  let y = 480
  for (const line of tituloLinhas) {
    page.drawText(line, { x: MARGIN, y, size: 22, font: fontBold, color: NAVY })
    y -= 28
  }
  page.drawText(info.cliente || "Cliente", { x: MARGIN, y: 380, size: 14, font, color: NAVY })
  page.drawText(`Assessor: ${info.assessor || "—"}`, { x: MARGIN, y: 358, size: 10, font, color: GRAY })
  page.drawText(info.data, { x: MARGIN, y: 342, size: 10, font, color: GRAY })
  page.drawText(RODAPE_LEGAL_SUCESSORIO, { x: MARGIN, y: 56, size: 8, font, color: GRAY })
}

export async function gerarRelatorioA4(input: RelatorioA4Input): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
  const logo = await carregarLogo()
  const ctx: Ctx = {
    doc,
    page: doc.addPage([A4.width, A4.height]),
    font,
    fontBold,
    y: A4.height - MARGIN,
    logo,
  }
  if (input.capa) {
    await desenharCapa(ctx, input)
    await novaPagina(ctx, input)
  } else {
    await desenharCabecalho(ctx, input)
  }

  for (const secao of input.secoes) {
    await garantirEspaco(ctx, input, 28)
    ctx.page.drawText(secao.titulo, {
      x: MARGIN,
      y: ctx.y,
      size: 11,
      font: fontBold,
      color: BLUE,
    })
    ctx.y -= 16
    if (secao.kpis?.length) await desenharKpis(ctx, input, secao.kpis)
    if (secao.paragrafos) {
      for (const p of secao.paragrafos) await texto(ctx, input, p, { size: 9, gap: 6 })
    }
    if (secao.tabela) await desenharTabela(ctx, input, secao.tabela)
    if (secao.memoria?.length) {
      await texto(ctx, input, "Memória de cálculo", { size: 9, bold: true, color: BLUE })
      await desenharTabela(ctx, input, {
        colunas: ["Item", "Valor"],
        linhas: secao.memoria.map((m) => [m.label, m.valor]),
      })
    }
    if (secao.pontos?.length) {
      await texto(ctx, input, "Pontos de atenção", { size: 9, bold: true, color: BLUE })
      for (const p of secao.pontos) await texto(ctx, input, `• ${p}`, { size: 8, color: GRAY, gap: 2 })
    }
    ctx.y -= 8
  }

  const pages = doc.getPages()
  pages.forEach((p, i) => desenharRodape(p, font, i + 1, pages.length))
  return doc.save()
}
