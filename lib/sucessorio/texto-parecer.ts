import type { Parecer } from "./consultoria.ts"

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function br(n: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n)
}

export function coletarNumerosParecer(parecer: Parecer): Set<number> {
  const set = new Set<number>()
  const walk = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) {
      set.add(round2(v))
      set.add(Math.round(v))
      set.add(round2(Math.abs(v)))
      set.add(Math.round(Math.abs(v)))
      if (Math.abs(v) <= 2) set.add(round2(v * 100))
    } else if (Array.isArray(v)) v.forEach(walk)
    else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(walk)
  }
  walk(parecer)
  return set
}

function parseNumeroBr(raw: string): number | null {
  const s = raw.replace(/%/g, "").trim()
  if (!s) return null
  if (/\d{1,3}(?:\.\d{3})+/.test(s) || (s.includes(",") && s.includes("."))) {
    const n = Number(s.replace(/\./g, "").replace(",", "."))
    return Number.isFinite(n) ? n : null
  }
  if (s.includes(",")) {
    const n = Number(s.replace(",", "."))
    return Number.isFinite(n) ? n : null
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** Valores citados no texto (moeda, %, inteiros com milhar ou 4+ dígitos). */
export function extrairValoresCitados(texto: string): number[] {
  const out: number[] = []
  const patterns = [
    /\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?/g,
    /\d+,\d+\s*%/g,
    /\d+(?:\.\d+)?\s*%/g,
    /(?<![.\d])\d{4,}(?![.\d])/g,
  ]
  for (const re of patterns) {
    const m = texto.match(re) ?? []
    for (const raw of m) {
      const n = parseNumeroBr(raw)
      if (n != null) out.push(n)
    }
  }
  return out
}

export function valorExisteNoParecer(n: number, permitidos: Set<number>): boolean {
  const candidatos = [round2(n), Math.round(n), round2(n / 100)]
  for (const c of candidatos) {
    if (permitidos.has(c)) return true
    for (const p of permitidos) {
      if (Math.abs(p - c) < 0.011) return true
    }
  }
  return false
}

export function validarTextoContraParecer(texto: string, parecer: Parecer): { ok: boolean; extras: number[] } {
  const permitidos = coletarNumerosParecer(parecer)
  const extras = extrairValoresCitados(texto).filter((n) => !valorExisteNoParecer(n, permitidos))
  return { ok: extras.length === 0, extras }
}

export function textoParecerFallback(parecer: Parecer): string {
  const p = parecer.perfil
  const s = parecer.simulacoes
  const top = parecer.recomendacao.ranqueadas[0]
  const risco = parecer.diagnostico.riscos[0]
  const inv = s.inventario
  const liquido = inv.liquidoHerdeiros
  const trechos: string[] = []

  trechos.push(
    `${p.nome || "Você"} tem hoje um mapa sucessório com patrimônio de ${br(s.espolio.patrimonio)} em ${p.uf}. O score de exposição desta consultoria é ${Math.round(parecer.diagnostico.score)} (${parecer.diagnostico.nivel}).`,
  )

  trechos.push(
    `Se nada for feito, o inventário ${s.via} estimado sai ${br(inv.total)} — ITCMD ${br(inv.itcmd)}, honorários ${br(inv.honorarios)} e custas ${br(inv.custas)}. Depois dessa conta, restam cerca de ${br(liquido)} para os herdeiros.`,
  )

  if (risco) {
    trechos.push(`${risco.titulo} O número que sustenta isso é ${br(risco.impactoReais)}. ${risco.seNadaForFeito}`)
  }

  if (s.holding && s.holding.anos[0]) {
    trechos.push(
      `Nos aluguéis, a pessoa física pagaria cerca de ${br(parecer.fiscal.irpfAluguelPF)} no primeiro ano, contra ${br(parecer.fiscal.cargaHoldingAluguel)} numa holding de locação. A economia do primeiro ano é ${br(parecer.fiscal.economiaAluguelAno1)}.`,
    )
  }

  if (parecer.fiscal.irpfm.enquadrado) {
    trechos.push(
      `A renda anual de ${br(parecer.fiscal.irpfm.rendaAnual)} se enquadra no IRPFM, com alíquota estimada de ${(parecer.fiscal.irpfm.aliquota * 100).toFixed(1).replace(".", ",")} % e imposto de ${br(parecer.fiscal.irpfm.imposto)}. ${parecer.fiscal.irpfm.organizarAntes[0] ?? ""}`,
    )
  }

  if (s.estate && s.estate.imposto > 0) {
    trechos.push(
      `Há bens com situs nos EUA. O estate tax estimado é de ${br(s.estate.imposto)} em dólares da base usada no motor (crédito do não residente já descontado).`,
    )
  }

  if (top) {
    trechos.push(
      `A recomendação número 1 é ${top.nome}. Economia estimada ${br(top.economia)}, custo de implementar ${br(top.custo)}${top.paybackAnos != null ? `, payback de ${String(top.paybackAnos).replace(".", ",")} anos` : ""}. ${top.pros[0] ?? ""}`,
    )
  }

  const fases = parecer.planoAcao
    .map((a) => `${a.titulo} (${a.responsavel}, ${a.fase.replace("_", " ")})`)
    .join("; ")
  if (fases) trechos.push(`Plano de ação: ${fases}.`)

  trechos.push(
    "Diagnóstico e recomendação gerados pelo planejador da Voga a partir dos dados informados. A execução (holding, doação, testamento) exige advogado e contador.",
  )

  return trechos.filter(Boolean).join("\n\n")
}
