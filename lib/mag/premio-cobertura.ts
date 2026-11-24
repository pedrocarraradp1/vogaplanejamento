/**
 * Prêmio por cobertura MAG (Seguradora).
 * O valor da simulação não é o prêmio: calcula-se localmente com
 *   premio = custoFixo + (capitalDesejado / capitalBase) * premioBase
 */

export type MagCoberturaPremio = {
  id: number | string | null
  descricao: string
  idProduto: number | null
  produtoDescricao: string | null
  capitalBase: number
  premioBase: number
  custoFixo: number
  capitalDesejado: number
  premio: number
}

export type MagServicoPremio = {
  id: number | string | null
  descricao: string
  premio: number
}

export type MagPremioCalculado = {
  coberturas: MagCoberturaPremio[]
  servicos: MagServicoPremio[]
  premioMensal: number
  premioAnual: number
  ticketMinimo: number | null
  abaixoDoTicketMinimo: boolean
  avisoTicketMinimo: string | null
}

function n(value: unknown, fallback = 0): number {
  const v = Number(value)
  return Number.isFinite(v) ? v : fallback
}

/** premio = custoFixo + (capitalDesejado / capitalBase) * premioBase */
export function calcularPremioCobertura(opts: {
  capitalDesejado: number
  capitalBase: number
  premioBase: number
  custoFixo?: number
}): number {
  const capitalBase = n(opts.capitalBase)
  if (capitalBase <= 0) return n(opts.custoFixo)
  return n(opts.custoFixo) + (n(opts.capitalDesejado) / capitalBase) * n(opts.premioBase)
}

function unwrapValor(json: unknown): Record<string, unknown> | null {
  if (!json || typeof json !== "object") return null
  const root = json as Record<string, unknown>
  if (root.Valor && typeof root.Valor === "object") return root.Valor as Record<string, unknown>
  return root
}

function lerTicketMinimo(...sources: unknown[]): number | null {
  for (const src of sources) {
    const v = unwrapValor(src)
    if (!v) continue
    if (typeof v.ticketMinimo === "number" && Number.isFinite(v.ticketMinimo)) {
      return v.ticketMinimo
    }
    const sims = v.simulacoes
    if (Array.isArray(sims) && sims[0] && typeof sims[0] === "object") {
      const t = (sims[0] as Record<string, unknown>).ticketMinimo
      if (typeof t === "number" && Number.isFinite(t)) return t
    }
  }
  return null
}

function coberturasDoProduto(
  produto: Record<string, unknown>,
  capitalDesejado: number,
): MagCoberturaPremio[] {
  const idProduto = typeof produto.idProduto === "number" ? produto.idProduto : null
  const produtoDescricao =
    typeof produto.descricao === "string"
      ? produto.descricao
      : typeof produto.descricaoComercial === "string"
        ? produto.descricaoComercial
        : null
  const coberturas = Array.isArray(produto.coberturas) ? produto.coberturas : []
  const out: MagCoberturaPremio[] = []
  for (const raw of coberturas) {
    if (!raw || typeof raw !== "object") continue
    const cob = raw as Record<string, unknown>
    const capitalBase = n(cob.capitalBase)
    const premioBase = n(cob.premioBase)
    const custoFixo = n(cob.custoFixo)
    if (capitalBase <= 0 && premioBase <= 0 && custoFixo <= 0) continue
    const premio = calcularPremioCobertura({
      capitalDesejado,
      capitalBase: capitalBase > 0 ? capitalBase : 1000,
      premioBase,
      custoFixo,
    })
    out.push({
      id: (cob.id as number | string | null) ?? (cob.coberturaId as number | string | null) ?? null,
      descricao: String(cob.descricao ?? cob.descricaoComercial ?? "Cobertura"),
      idProduto,
      produtoDescricao,
      capitalBase: capitalBase > 0 ? capitalBase : 1000,
      premioBase,
      custoFixo,
      capitalDesejado,
      premio,
    })
  }
  return out
}

function extrairServicos(sim: Record<string, unknown>): MagServicoPremio[] {
  const list = Array.isArray(sim.servicos) ? sim.servicos : []
  const out: MagServicoPremio[] = []
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue
    const s = raw as Record<string, unknown>
    const premio = n(s.premio ?? s.premioMensal ?? s.custoFixo ?? s.valor)
    if (premio <= 0) continue
    out.push({
      id: (s.id as number | string | null) ?? null,
      descricao: String(s.descricao ?? s.nome ?? "Serviço"),
      premio,
    })
  }
  return out
}

/**
 * Calcula prêmios a partir da resposta de POST /simulacao (+ ticket do modeloproposta).
 * Usa o produto `idProduto` alvo quando presente; senão, todas as coberturas retornadas.
 */
export function calcularPremiosDaSimulacao(opts: {
  simulacaoJson: unknown
  capitalDesejado: number
  idProduto?: number
  modeloJson?: unknown
}): MagPremioCalculado {
  const capitalDesejado = Math.max(0, n(opts.capitalDesejado))
  const valor = unwrapValor(opts.simulacaoJson)
  const sims = Array.isArray(valor?.simulacoes) ? valor!.simulacoes : []
  const sim0 =
    sims[0] && typeof sims[0] === "object" ? (sims[0] as Record<string, unknown>) : null

  const produtos = Array.isArray(sim0?.produtos) ? (sim0!.produtos as Record<string, unknown>[]) : []
  const alvo =
    opts.idProduto != null
      ? produtos.filter((p) => Number(p.idProduto) === opts.idProduto)
      : produtos

  const coberturas = (alvo.length > 0 ? alvo : produtos).flatMap((p) =>
    coberturasDoProduto(p, capitalDesejado),
  )
  const servicos = sim0 ? extrairServicos(sim0) : []
  const premioMensal =
    coberturas.reduce((s, c) => s + c.premio, 0) + servicos.reduce((s, c) => s + c.premio, 0)
  const ticketMinimo = lerTicketMinimo(opts.modeloJson, opts.simulacaoJson)
  const abaixoDoTicketMinimo =
    ticketMinimo != null && premioMensal > 0 && premioMensal < ticketMinimo

  return {
    coberturas,
    servicos,
    premioMensal,
    premioAnual: premioMensal * 12,
    ticketMinimo,
    abaixoDoTicketMinimo,
    avisoTicketMinimo: abaixoDoTicketMinimo
      ? `O total das coberturas e serviços (R$ ${premioMensal.toFixed(2)}) está abaixo do ticket mínimo do modelo (R$ ${ticketMinimo!.toFixed(2)}).`
      : null,
  }
}
