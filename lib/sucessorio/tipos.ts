import { TIPOS_ROTEIRO, idsRoteiroDoTipo, type TipoRoteiro } from "./roteiros"

export type ViaInventarioSimulador = "extrajudicial" | "judicial" | "litigio"

export type SucessaoDiagnostico = {
  respostas: boolean[]
}

export type SucessaoSimulador = {
  soHeranca?: boolean
  via?: ViaInventarioSimulador
  honorariosPct?: number
  custasPct?: number
  diasAteAbertura?: number
  custoPlanejarVida?: number
  bensEuaUSD?: number
  cambio?: number
}

export type SucessaoRoteiroProgresso = {
  concluidos: string[]
}

export type SucessaoRoteiros = Partial<Record<TipoRoteiro, SucessaoRoteiroProgresso>>

export type SucessaoDocumentos = {
  clausulasIncluidas?: string[]
  camposClausulas?: Record<string, string>
  templates?: Record<string, Record<string, string>>
}

export type TipoImovelHolding = "residencial" | "comercial"
export type IntegralizacaoHolding = "custo" | "mercado"
export type DistribuicaoLucrosHolding = "total" | "parcial"

export type ImovelHolding = {
  id: string
  ativoId?: string
  descricao: string
  valorMercado: number
  valorIrpf: number
  aluguelMensal: number
  tipo: TipoImovelHolding
  uf: string
  municipio: string
}

export type SucessaoHolding = {
  imoveis: ImovelHolding[]
  preenchidoDoPlano?: boolean
  despesasDedutiveisMensais: number
  outrosRendimentosAnuais: number
  herdeiros: number
  ufDomicilio: string
  regimeBens: string
  custoMensal: number
  custoAbertura: number
  aliquotaItbi: number
  itbiSobreExcedente: boolean
  imunidadeItbi: boolean
  integralizacao: IntegralizacaoHolding
  distribuicao: DistribuicaoLucrosHolding
  percentualDistribuicao: number
  doacaoUsufruto: boolean
  horizonteAnos: number
  reajusteAluguel: number
  taxaDesconto: number
  anoInicio: number
  aliquotaCbs: number
  aliquotaIbs: number
  reducaoIbsCbsLocacao: number
  anoCbs: number
  anoIbsCheio: number
  fatorNuaPropriedade: number
}

export const DEFAULT_SUCESSAO_DIAGNOSTICO: SucessaoDiagnostico = {
  respostas: Array.from({ length: 20 }, () => false),
}

export const DEFAULT_SUCESSAO_SIMULADOR: SucessaoSimulador = {
  soHeranca: false,
  via: "extrajudicial",
  honorariosPct: 6,
  custasPct: 1.5,
  diasAteAbertura: 30,
  custoPlanejarVida: 0,
}

export const DEFAULT_SUCESSAO_ROTEIROS: SucessaoRoteiros = {}

export const DEFAULT_SUCESSAO_DOCUMENTOS: SucessaoDocumentos = {
  clausulasIncluidas: [],
  camposClausulas: {},
  templates: {},
}

export const DEFAULT_SUCESSAO_HOLDING: SucessaoHolding = {
  imoveis: [],
  preenchidoDoPlano: false,
  despesasDedutiveisMensais: 0,
  outrosRendimentosAnuais: 0,
  herdeiros: 0,
  ufDomicilio: "SP",
  regimeBens: "Comunhão Parcial de Bens",
  custoMensal: 1_500,
  custoAbertura: 15_000,
  aliquotaItbi: 0.03,
  itbiSobreExcedente: true,
  imunidadeItbi: false,
  integralizacao: "custo",
  distribuicao: "total",
  percentualDistribuicao: 1,
  doacaoUsufruto: true,
  horizonteAnos: 10,
  reajusteAluguel: 0.045,
  taxaDesconto: 0.1,
  anoInicio: 2026,
  aliquotaCbs: 0.088,
  aliquotaIbs: 0.177,
  reducaoIbsCbsLocacao: 0.7,
  anoCbs: 2027,
  anoIbsCheio: 2033,
  fatorNuaPropriedade: 1 / 3,
}

export function hidratarDiagnostico(raw: unknown): SucessaoDiagnostico {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { respostas?: unknown }).respostas)) {
    return { respostas: [...DEFAULT_SUCESSAO_DIAGNOSTICO.respostas] }
  }
  const respostas = (raw as { respostas: unknown[] }).respostas
  return {
    respostas: Array.from({ length: 20 }, (_, i) => Boolean(respostas[i])),
  }
}

export function hidratarSimulador(raw: unknown): SucessaoSimulador {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SUCESSAO_SIMULADOR }
  const s = raw as Record<string, unknown>
  const via =
    s.via === "judicial" || s.via === "litigio" || s.via === "extrajudicial" ? s.via : "extrajudicial"
  return {
    soHeranca: Boolean(s.soHeranca),
    via,
    honorariosPct: Number(s.honorariosPct) || DEFAULT_SUCESSAO_SIMULADOR.honorariosPct,
    custasPct: Number(s.custasPct) || DEFAULT_SUCESSAO_SIMULADOR.custasPct,
    diasAteAbertura:
      s.diasAteAbertura != null
        ? Number(s.diasAteAbertura) || 0
        : DEFAULT_SUCESSAO_SIMULADOR.diasAteAbertura,
    custoPlanejarVida:
      s.custoPlanejarVida != null ? Number(s.custoPlanejarVida) || 0 : 0,
    bensEuaUSD: s.bensEuaUSD != null ? Number(s.bensEuaUSD) : undefined,
    cambio: s.cambio != null ? Number(s.cambio) : undefined,
  }
}

export function hidratarRoteiros(raw: unknown): SucessaoRoteiros {
  if (!raw || typeof raw !== "object") return {}
  const src = raw as Record<string, unknown>
  const hidratados: SucessaoRoteiros = {}
  for (const tipo of TIPOS_ROTEIRO) {
    const bloco = src[tipo]
    if (!bloco || typeof bloco !== "object") continue
    const b = bloco as { concluidos?: unknown; itens?: unknown }
    const idsValidos = new Set(idsRoteiroDoTipo(tipo))
    const brutos = Array.isArray(b.concluidos)
      ? b.concluidos
      : b.itens && typeof b.itens === "object"
        ? Object.entries(b.itens as Record<string, unknown>)
            .filter(([, v]) => Boolean(v))
            .map(([k]) => k)
        : []
    const concluidos = brutos.filter(
      (id: unknown): id is string => typeof id === "string" && idsValidos.has(id),
    )
    hidratados[tipo] = { concluidos }
  }
  return hidratados
}

export function hidratarDocumentos(raw: unknown): SucessaoDocumentos {
  if (!raw || typeof raw !== "object") {
    return {
      clausulasIncluidas: [],
      camposClausulas: {},
      templates: {},
    }
  }
  const d = raw as Record<string, unknown>
  const incluidas = Array.isArray(d.clausulasIncluidas)
    ? d.clausulasIncluidas.filter((id: unknown) => typeof id === "string")
    : []
  const camposClausulas: Record<string, string> = {}
  if (d.camposClausulas && typeof d.camposClausulas === "object") {
    for (const [k, v] of Object.entries(d.camposClausulas as Record<string, unknown>)) {
      if (typeof v === "string") camposClausulas[k] = v
    }
  }
  const templates: Record<string, Record<string, string>> = {}
  if (d.templates && typeof d.templates === "object") {
    for (const [tid, campos] of Object.entries(d.templates as Record<string, unknown>)) {
      if (!campos || typeof campos !== "object") continue
      const inner: Record<string, string> = {}
      for (const [k, v] of Object.entries(campos as Record<string, unknown>)) {
        if (typeof v === "string") inner[k] = v
      }
      templates[tid] = inner
    }
  }
  return { clausulasIncluidas: incluidas, camposClausulas, templates }
}

function num(v: unknown, fallback: number): number {
  if (v == null || v === "") return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function hidratarImovelHolding(raw: unknown, index: number): ImovelHolding | null {
  if (!raw || typeof raw !== "object") return null
  const i = raw as Record<string, unknown>
  const tipo: TipoImovelHolding = i.tipo === "comercial" ? "comercial" : "residencial"
  return {
    id: typeof i.id === "string" && i.id ? i.id : `imovel-holding-${index}`,
    ativoId: typeof i.ativoId === "string" ? i.ativoId : undefined,
    descricao: typeof i.descricao === "string" ? i.descricao : "",
    valorMercado: num(i.valorMercado, 0),
    valorIrpf: num(i.valorIrpf, 0),
    aluguelMensal: num(i.aluguelMensal, 0),
    tipo,
    uf: typeof i.uf === "string" ? i.uf : "",
    municipio: typeof i.municipio === "string" ? i.municipio : "",
  }
}

export function hidratarHolding(raw: unknown): SucessaoHolding {
  const d = DEFAULT_SUCESSAO_HOLDING
  if (!raw || typeof raw !== "object") return { ...d, imoveis: [] }
  const h = raw as Record<string, unknown>
  const imoveis = Array.isArray(h.imoveis)
    ? h.imoveis.map((item, i) => hidratarImovelHolding(item, i)).filter((x): x is ImovelHolding => x != null)
    : []
  const integralizacao: IntegralizacaoHolding = h.integralizacao === "mercado" ? "mercado" : "custo"
  const distribuicao: DistribuicaoLucrosHolding = h.distribuicao === "parcial" ? "parcial" : "total"
  const perc =
    h.percentualDistribuicao != null
      ? Math.min(1, Math.max(0, num(h.percentualDistribuicao, d.percentualDistribuicao)))
      : distribuicao === "parcial"
        ? 0.5
        : 1
  return {
    imoveis,
    preenchidoDoPlano: Boolean(h.preenchidoDoPlano),
    despesasDedutiveisMensais: num(h.despesasDedutiveisMensais, d.despesasDedutiveisMensais),
    outrosRendimentosAnuais: num(h.outrosRendimentosAnuais, d.outrosRendimentosAnuais),
    herdeiros: Math.max(0, Math.round(num(h.herdeiros, d.herdeiros))),
    ufDomicilio: typeof h.ufDomicilio === "string" && h.ufDomicilio.trim() ? h.ufDomicilio : d.ufDomicilio,
    regimeBens: typeof h.regimeBens === "string" && h.regimeBens.trim() ? h.regimeBens : d.regimeBens,
    custoMensal: num(h.custoMensal, d.custoMensal),
    custoAbertura: num(h.custoAbertura, d.custoAbertura),
    aliquotaItbi: num(h.aliquotaItbi, d.aliquotaItbi),
    itbiSobreExcedente: h.itbiSobreExcedente !== false,
    imunidadeItbi: Boolean(h.imunidadeItbi),
    integralizacao,
    distribuicao,
    percentualDistribuicao: perc,
    doacaoUsufruto: h.doacaoUsufruto !== false,
    horizonteAnos: Math.max(1, Math.round(num(h.horizonteAnos, d.horizonteAnos))),
    reajusteAluguel: num(h.reajusteAluguel, d.reajusteAluguel),
    taxaDesconto: num(h.taxaDesconto, d.taxaDesconto),
    anoInicio: Math.round(num(h.anoInicio, d.anoInicio)),
    aliquotaCbs: num(h.aliquotaCbs, d.aliquotaCbs),
    aliquotaIbs: num(h.aliquotaIbs, d.aliquotaIbs),
    reducaoIbsCbsLocacao: num(h.reducaoIbsCbsLocacao, d.reducaoIbsCbsLocacao),
    anoCbs: Math.round(num(h.anoCbs, d.anoCbs)),
    anoIbsCheio: Math.round(num(h.anoIbsCheio, d.anoIbsCheio)),
    fatorNuaPropriedade: num(h.fatorNuaPropriedade, d.fatorNuaPropriedade),
  }
}
