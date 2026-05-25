/** Utilitários compartilhados entre /clientes e /clientes/[id]. */

export type Moeda = "BRL" | "USD"

export function patrimonioTotalFromDados(dados: unknown): number {
  const d = dados as { ativos?: unknown[]; passivos?: unknown[] } | null | undefined
  const ativos = Array.isArray(d?.ativos) ? d.ativos : []
  const passivos = Array.isArray(d?.passivos) ? d.passivos : []
  const totalAtivos = ativos.reduce((s: number, a: any) => s + (Number(a?.valor) || 0), 0)
  const totalPassivos = passivos.reduce((s: number, p: any) => {
    const saldo = Number(p?.saldoDevedor)
    return s + (saldo > 0 ? saldo : Number(p?.valor) || 0)
  }, 0)
  return totalAtivos - totalPassivos
}

export function patrimonioProjetadoFromDados(dados: unknown): number {
  const d = dados as {
    kpis?: { patrimonioApos?: number }
    projecao?: Array<{ saldoNominal?: number }>
  } | null | undefined
  const k = d?.kpis?.patrimonioApos
  if (typeof k === "number") return k
  const proj = Array.isArray(d?.projecao) ? d.projecao : []
  const last = proj.length ? proj[proj.length - 1] : null
  const v = last?.saldoNominal
  return typeof v === "number" ? v : 0
}

export function fmtFull(moeda: Moeda, v: number) {
  return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: moeda === "USD" ? "USD" : "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

export function moedaFromDados(dados: unknown): Moeda {
  const d = dados as { moeda?: string } | null | undefined
  return d?.moeda === "USD" ? "USD" : "BRL"
}
