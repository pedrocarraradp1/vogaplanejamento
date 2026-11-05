import type { RelatorioA4Input } from "@/lib/pdf/tipos-relatorio"

export async function baixarRelatorioSucessorio(payload: RelatorioA4Input) {
  const res = await fetch("/api/relatorios/sucessorio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      nomeArquivo: payload.cliente || "Cliente",
    }),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(errText || `HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const slug = (payload.titulo || "sucessorio").toLowerCase().replace(/[^a-z0-9]+/g, "_")
  a.download = `${slug}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
