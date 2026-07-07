import { NextRequest, NextResponse } from "next/server"
import { execFile } from "child_process"
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { platform } from "os"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

export const runtime = "nodejs"
export const maxDuration = 120

function getPythonCmd(): string {
  return platform() === "win32" ? "python" : "python3"
}

function getSofficePath(): string {
  if (platform() === "win32") {
    const candidates = [
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    ]
    for (const candidate of candidates) {
      if (existsSync(candidate)) return candidate
    }
  }
  return "soffice"
}

function safeUnlink(path: string) {
  try {
    unlinkSync(path)
  } catch {
    /* ignore */
  }
}

export async function POST(req: NextRequest) {
  const { slide1, slide2, slide3, nomeCliente } = await req.json()

  const stamp = Date.now()
  const tmpDir = tmpdir()
  const inputJson = join(tmpDir, `balanco_${stamp}.json`)
  const outputPptx = join(tmpDir, `balanco_${stamp}.pptx`)
  const outputPdf = join(tmpDir, `balanco_${stamp}.pdf`)

  try {
    writeFileSync(inputJson, JSON.stringify({ slide1, slide2, slide3, nomeCliente }))

    const scriptPath = join(process.cwd(), "scripts", "gerar_balanco_pptx.py")
    const pythonCmd = getPythonCmd()

    await execFileAsync(pythonCmd, [scriptPath, inputJson, outputPptx], {
      cwd: process.cwd(),
      timeout: 90_000,
    })

    const soffice = getSofficePath()
    await execFileAsync(
      soffice,
      ["--headless", "--convert-to", "pdf", "--outdir", tmpDir, outputPptx],
      { timeout: 90_000 },
    )

    if (!existsSync(outputPdf)) {
      return NextResponse.json(
        { error: "PDF não gerado. Verifique se o LibreOffice está instalado." },
        { status: 500 },
      )
    }

    const pdfBuffer = readFileSync(outputPdf)
    const safeName = String(nomeCliente || "Cliente").replace(/[^\w\-]+/g, "_")

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Balanco_${safeName}_${new Date().getFullYear()}.pdf"`,
      },
    })
  } catch (err) {
    console.error("Erro ao gerar balanço PDF:", err)
    const message = err instanceof Error ? err.message : "Erro desconhecido"
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    safeUnlink(inputJson)
    safeUnlink(outputPptx)
    safeUnlink(outputPdf)
  }
}
