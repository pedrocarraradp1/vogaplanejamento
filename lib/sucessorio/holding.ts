import {
  calcularCustoInventario,
  calcularItcmd,
  type ViaInventario,
} from "./calculos.ts"
import { impostoPorFaixas, TABELA_REFERENCIA_REFORMA } from "./itcmd-uf.ts"
import {
  DEFAULT_SUCESSAO_HOLDING,
  type ImovelHolding,
  type SucessaoHolding,
} from "./tipos.ts"

export { DEFAULT_SUCESSAO_HOLDING }

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

/** Tabela progressiva mensal do IRPF 2025/2026 (carnê-leão). */
export const TABELA_IRPF_MENSAL_2026 = [
  { ate: 2_259.2, aliquota: 0, deducao: 0 },
  { ate: 2_826.65, aliquota: 0.075, deducao: 169.44 },
  { ate: 3_751.05, aliquota: 0.15, deducao: 381.44 },
  { ate: 4_664.68, aliquota: 0.225, deducao: 662.77 },
  { ate: Number.POSITIVE_INFINITY, aliquota: 0.275, deducao: 896 },
] as const

export const PRESUNCAO_LOCACAO = 0.32
export const ALIQUOTA_IRPJ = 0.15
export const ALIQUOTA_ADICIONAL_IRPJ = 0.1
export const TETO_MENSAL_ADICIONAL_IRPJ = 20_000
export const ALIQUOTA_CSLL = 0.09
export const ALIQUOTA_PIS = 0.0065
export const ALIQUOTA_COFINS = 0.03
export const LIMITE_DIVIDENDOS_ISENTOS_MES = 50_000
export const ALIQUOTA_RETENCAO_DIVIDENDOS = 0.1
export const RECEITA_LIMITE_IBS_CBS_PF = 240_000
export const IMOVEIS_LIMITE_IBS_CBS_PF = 3

/** Ganho de capital PF (Lei 13.259/2016). */
export const FAIXAS_GANHO_CAPITAL = [
  { ate: 5_000_000, aliquota: 0.15 },
  { ate: 10_000_000, aliquota: 0.175 },
  { ate: 30_000_000, aliquota: 0.2 },
  { ate: Number.POSITIVE_INFINITY, aliquota: 0.225 },
]

export function irpfMensal(base: number): number {
  const b = Math.max(0, Number(base) || 0)
  for (const f of TABELA_IRPF_MENSAL_2026) {
    if (b <= f.ate) return round2(Math.max(0, b * f.aliquota - f.deducao))
  }
  return 0
}

/** IRPF extra na declaração ao acrescentar o aluguel líquido aos demais rendimentos. */
export function irpfAluguelNaDeclaracao(aluguelLiquidoAnual: number, outrosAnuais: number): number {
  const liquido = Math.max(0, Number(aluguelLiquidoAnual) || 0)
  const outros = Math.max(0, Number(outrosAnuais) || 0)
  return round2((irpfMensal(outros / 12 + liquido / 12) - irpfMensal(outros / 12)) * 12)
}

export type TributosPresumido = {
  basePresumida: number
  irpj: number
  adicional: number
  csll: number
  pis: number
  cofins: number
  totalFederal: number
}

export function tributosLucroPresumidoLocacao(
  receitaAnual: number,
  opts?: { incluirPisCofins?: boolean },
): TributosPresumido {
  const receita = Math.max(0, Number(receitaAnual) || 0)
  const basePresumida = round2(receita * PRESUNCAO_LOCACAO)
  const irpj = round2(basePresumida * ALIQUOTA_IRPJ)
  const tetoAdicional = TETO_MENSAL_ADICIONAL_IRPJ * 12
  const adicional = round2(Math.max(0, basePresumida - tetoAdicional) * ALIQUOTA_ADICIONAL_IRPJ)
  const csll = round2(basePresumida * ALIQUOTA_CSLL)
  const incluirPisCofins = opts?.incluirPisCofins !== false
  const pis = incluirPisCofins ? round2(receita * ALIQUOTA_PIS) : 0
  const cofins = incluirPisCofins ? round2(receita * ALIQUOTA_COFINS) : 0
  return {
    basePresumida,
    irpj,
    adicional,
    csll,
    pis,
    cofins,
    totalFederal: round2(irpj + adicional + csll + pis + cofins),
  }
}

export function fatorIbs(ano: number, anoCbs: number, anoIbsCheio: number): number {
  if (ano < anoCbs) return 0
  if (ano >= anoIbsCheio) return 1
  const span = Math.max(1, anoIbsCheio - (anoCbs - 1))
  return Math.min(1, Math.max(0, (ano - (anoCbs - 1)) / span))
}

export function aliquotaIbsCbsEfetiva(params: {
  ano: number
  aliquotaCbs: number
  aliquotaIbs: number
  reducao: number
  anoCbs: number
  anoIbsCheio: number
}): { cbs: number; ibs: number; efetiva: number; cbsAtivo: boolean } {
  const cbsAtivo = params.ano >= params.anoCbs
  const cbsCheia = cbsAtivo ? params.aliquotaCbs : 0
  const ibsCheia = params.aliquotaIbs * fatorIbs(params.ano, params.anoCbs, params.anoIbsCheio)
  const fatorReducao = Math.max(0, 1 - (Number(params.reducao) || 0))
  const cbs = round2(cbsCheia * fatorReducao * 10000) / 10000
  const ibs = round2(ibsCheia * fatorReducao * 10000) / 10000
  return { cbs, ibs, efetiva: cbs + ibs, cbsAtivo }
}

export function pfContribuinteIbsCbs(imoveisAlugados: number, receitaAnual: number): boolean {
  return imoveisAlugados > IMOVEIS_LIMITE_IBS_CBS_PF && receitaAnual > RECEITA_LIMITE_IBS_CBS_PF
}

export function ganhoCapitalPf(ganho: number): number {
  const g = Math.max(0, Number(ganho) || 0)
  let piso = 0
  let imposto = 0
  for (const f of FAIXAS_GANHO_CAPITAL) {
    const fatia = Math.min(g, f.ate) - piso
    if (fatia > 0) imposto += fatia * f.aliquota
    piso = f.ate
    if (g <= f.ate) break
  }
  return round2(imposto)
}

export function retencaoDividendos(distribuidoAnual: number): number {
  const d = Math.max(0, Number(distribuidoAnual) || 0)
  const excesso = Math.max(0, d / 12 - LIMITE_DIVIDENDOS_ISENTOS_MES)
  return round2(excesso * 12 * ALIQUOTA_RETENCAO_DIVIDENDOS)
}

export type HoldingInput = SucessaoHolding & {
  viaInventario?: ViaInventario
  honorariosPct?: number
  custasPct?: number
  diasAteAbertura?: number
}

export type CargaAnoHolding = {
  ano: number
  indice: number
  receita: number
  despesas: number
  cbsAtivo: boolean
  ibsFator: number
  pfIrpf: number
  pfIbsCbs: number
  pfCarga: number
  holdingFederal: number
  holdingIbsCbs: number
  holdingCusto: number
  holdingRetencao: number
  holdingCarga: number
  economia: number
  economiaAcumulada: number
}

export type CustoEntradaHolding = {
  valorMercado: number
  valorCapital: number
  excedente: number
  itbi: number
  ganhoCapital: number
  abertura: number
  total: number
  itbiSobreExcedente: boolean
  imunidadeItbi: boolean
}

export type SucessaoHoldingResultado = {
  inventario: ReturnType<typeof calcularCustoInventario>
  doacao: {
    base: number
    imposto: number
    impostoReforma: number
    porHerdeiro: number
  }
  custoEstruturaPeriodo: number
  custoHoldingSucessao: number
  economiaSucessao: number
}

export type VereditoHolding = {
  frase: string
  motivos: string[]
}

export type ComparadorHolding = {
  anos: CargaAnoHolding[]
  entrada: CustoEntradaHolding
  sucessao: SucessaoHoldingResultado
  economiaAnos: number
  vpl: number
  paybackAnos: number
  paybackMeses: number
  paybackDentro: boolean
  veredito: VereditoHolding
  pfContribuinteIva: boolean
  pontosAtencao: string[]
}

function crescimento(valor: number, taxa: number, anosDecorridos: number): number {
  return round2(valor * (1 + taxa) ** anosDecorridos)
}

export function calcularCustoEntradaHolding(input: HoldingInput): CustoEntradaHolding {
  const imoveis = input.imoveis ?? []
  const valorMercado = round2(imoveis.reduce((s, i) => s + Math.max(0, i.valorMercado || 0), 0))
  const valorIrpf = round2(imoveis.reduce((s, i) => s + Math.max(0, i.valorIrpf || 0), 0))
  const valorCapital = input.integralizacao === "mercado" ? valorMercado : valorIrpf
  const excedente = round2(Math.max(0, valorMercado - valorCapital))
  const aliquota = Math.max(0, Number(input.aliquotaItbi) || 0)
  let itbi = 0
  if (!input.imunidadeItbi) {
    const base = input.itbiSobreExcedente !== false ? excedente : valorCapital || valorMercado
    itbi = round2(base * aliquota)
  }
  const ganho =
    input.integralizacao === "mercado" ? ganhoCapitalPf(Math.max(0, valorMercado - valorIrpf)) : 0
  const abertura = round2(Math.max(0, Number(input.custoAbertura) || 0))
  return {
    valorMercado,
    valorCapital,
    excedente,
    itbi,
    ganhoCapital: ganho,
    abertura,
    total: round2(itbi + ganho + abertura),
    itbiSobreExcedente: input.itbiSobreExcedente !== false,
    imunidadeItbi: Boolean(input.imunidadeItbi),
  }
}

export function calcularSucessaoHolding(input: HoldingInput): SucessaoHoldingResultado {
  const mercado = (input.imoveis ?? []).reduce((s, i) => s + Math.max(0, i.valorMercado || 0), 0)
  const uf = input.ufDomicilio || "SP"
  const inventario = calcularCustoInventario({
    uf,
    patrimonio: mercado,
    via: input.viaInventario ?? "extrajudicial",
    honorariosPct: (input.honorariosPct ?? 6) / 100,
    custasPct: (input.custasPct ?? 1.5) / 100,
    diasAteAbertura: input.diasAteAbertura ?? 30,
  })

  const herdeiros = Math.max(1, Number(input.herdeiros) || 1)
  const fatorNua = input.doacaoUsufruto
    ? Math.min(1, Math.max(0, Number(input.fatorNuaPropriedade) || 1 / 3))
    : 1
  const baseTotal = round2(mercado * fatorNua)
  const basePorHerdeiro = round2(baseTotal / herdeiros)
  let imposto = 0
  for (let i = 0; i < herdeiros; i++) {
    imposto += calcularItcmd({
      uf,
      modalidade: "doacao",
      tipoAtivo: "quotas",
      valor: basePorHerdeiro,
    }).imposto
  }
  imposto = round2(imposto)
  const reforma = impostoPorFaixas(baseTotal, TABELA_REFERENCIA_REFORMA)
  const custoMensal = Math.max(0, Number(input.custoMensal) || 0)
  const horizonte = Math.max(1, Number(input.horizonteAnos) || 10)
  const taxa = Number(input.reajusteAluguel) || 0
  let custoEstruturaPeriodo = 0
  for (let t = 0; t < horizonte; t++) {
    custoEstruturaPeriodo += crescimento(custoMensal * 12, taxa, t)
  }
  custoEstruturaPeriodo = round2(custoEstruturaPeriodo)
  const custoHoldingSucessao = round2(imposto + custoEstruturaPeriodo)
  return {
    inventario,
    doacao: {
      base: baseTotal,
      imposto,
      impostoReforma: round2(reforma.imposto),
      porHerdeiro: basePorHerdeiro,
    },
    custoEstruturaPeriodo,
    custoHoldingSucessao,
    economiaSucessao: round2(inventario.total - custoHoldingSucessao),
  }
}

export function calcularCargasAnuais(input: HoldingInput): CargaAnoHolding[] {
  const aluguel0 = (input.imoveis ?? []).reduce((s, i) => s + Math.max(0, i.aluguelMensal || 0), 0) * 12
  const despesas0 = Math.max(0, Number(input.despesasDedutiveisMensais) || 0) * 12
  const custo0 = Math.max(0, Number(input.custoMensal) || 0) * 12
  const taxa = Number(input.reajusteAluguel) || 0
  const horizonte = Math.max(1, Number(input.horizonteAnos) || 10)
  const anoInicio = Number(input.anoInicio) || 2026
  const alugados = (input.imoveis ?? []).filter((i) => (i.aluguelMensal || 0) > 0).length
  const percDist =
    input.distribuicao === "parcial"
      ? Math.min(1, Math.max(0, Number(input.percentualDistribuicao) || 0.5))
      : 1

  const anos: CargaAnoHolding[] = []
  let acumulada = 0
  for (let t = 0; t < horizonte; t++) {
    const ano = anoInicio + t
    const receita = crescimento(aluguel0, taxa, t)
    const despesas = crescimento(despesas0, taxa, t)
    const custo = crescimento(custo0, taxa, t)
    const liquido = Math.max(0, receita - despesas)
    const iva = aliquotaIbsCbsEfetiva({
      ano,
      aliquotaCbs: input.aliquotaCbs,
      aliquotaIbs: input.aliquotaIbs,
      reducao: input.reducaoIbsCbsLocacao,
      anoCbs: input.anoCbs,
      anoIbsCheio: input.anoIbsCheio,
    })
    const pfPagaIva = pfContribuinteIbsCbs(alugados, receita)
    const pfIrpf = irpfAluguelNaDeclaracao(liquido, input.outrosRendimentosAnuais)
    const pfIbsCbs = pfPagaIva ? round2(receita * iva.efetiva) : 0
    const pfCarga = round2(pfIrpf + pfIbsCbs)

    const federal = tributosLucroPresumidoLocacao(receita, { incluirPisCofins: !iva.cbsAtivo })
    const holdingIbsCbs = round2(receita * iva.efetiva)
    const caixaAposTributos = receita - despesas - federal.totalFederal - holdingIbsCbs - custo
    const distribuido = Math.max(0, caixaAposTributos) * percDist
    const holdingRetencao = retencaoDividendos(distribuido)
    const holdingCarga = round2(federal.totalFederal + holdingIbsCbs + custo + holdingRetencao)
    const economia = round2(pfCarga - holdingCarga)
    acumulada = round2(acumulada + economia)
    anos.push({
      ano,
      indice: t + 1,
      receita,
      despesas,
      cbsAtivo: iva.cbsAtivo,
      ibsFator: fatorIbs(ano, input.anoCbs, input.anoIbsCheio),
      pfIrpf,
      pfIbsCbs,
      pfCarga,
      holdingFederal: federal.totalFederal,
      holdingIbsCbs,
      holdingCusto: custo,
      holdingRetencao,
      holdingCarga,
      economia,
      economiaAcumulada: acumulada,
    })
  }
  return anos
}

function payback(economiaPorAno: number[], investimento: number): {
  anos: number
  meses: number
  dentro: boolean
} {
  if (investimento <= 0) return { anos: 0, meses: 0, dentro: true }
  let acum = 0
  for (let i = 0; i < economiaPorAno.length; i++) {
    const e = economiaPorAno[i] ?? 0
    if (acum + e >= investimento) {
      const falta = investimento - acum
      const frac = e > 0 ? falta / e : 0
      const mesesExtra = Math.max(0, Math.min(11, Math.round(frac * 12)))
      if (mesesExtra === 0) return { anos: i, meses: 0, dentro: true }
      if (mesesExtra === 12) return { anos: i + 1, meses: 0, dentro: true }
      return { anos: i, meses: mesesExtra, dentro: true }
    }
    acum += e
  }
  return { anos: economiaPorAno.length, meses: 0, dentro: false }
}

function vpl(economiaPorAno: number[], taxa: number, investimento: number): number {
  let pv = -investimento
  for (let t = 0; t < economiaPorAno.length; t++) {
    pv += (economiaPorAno[t] ?? 0) / (1 + taxa) ** (t + 1)
  }
  return round2(pv)
}

export function montarVeredito(params: {
  paybackAnos: number
  paybackMeses: number
  paybackDentro: boolean
  vpl: number
  economiaSucessao: number
  economiaAnos: number
  entrada: CustoEntradaHolding
  anos: CargaAnoHolding[]
}): VereditoHolding {
  const motivos: string[] = []
  const y1 = params.anos[0]
  if (y1 && y1.economia > 0) {
    motivos.push(
      `A renda em ${y1.ano} já sai ${round2(y1.economia).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} mais barata na holding (lucro presumido 32% vs. carnê-leão).`,
    )
  } else if (y1) {
    motivos.push("A carga anual da holding no primeiro ano não ganha do carnê-leão.")
  }
  if (params.entrada.itbi > 0) {
    motivos.push(
      `ITBI de entrada de ${params.entrada.itbi.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} ${
        params.entrada.itbiSobreExcedente ? "só sobre o excedente ao capital (Tema 796)" : "sobre o valor integralizado"
      }${params.entrada.imunidadeItbi ? " — imunidade aplicada" : ", sem imunidade (locação preponderante)"}.`,
    )
  }
  if (params.economiaSucessao > 0) {
    motivos.push(
      `Na sucessão, a doação das quotas com usufruto + custo da estrutura economiza ${params.economiaSucessao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} frente ao inventário dos imóveis.`,
    )
  }
  const iva = params.anos.find((a) => a.cbsAtivo)
  if (iva) {
    motivos.push(
      "A partir de 2027 entra CBS (e IBS até 2033) sobre locação, com redução de 70% — alíquotas ainda estimadas.",
    )
  }
  const top = motivos.slice(0, 3)

  if (params.vpl <= 0 && params.economiaSucessao > params.entrada.total) {
    return { frase: "Compensa só pela sucessão", motivos: top }
  }
  if (!params.paybackDentro && params.vpl <= 0) {
    return { frase: "Não compensa neste horizonte", motivos: top }
  }
  const anoFrase =
    params.paybackMeses > 0 ? params.paybackAnos + 1 : Math.max(1, params.paybackAnos)
  return { frase: `Compensa a partir do ano ${anoFrase}`, motivos: top }
}

export function pontosAtencaoHolding(input: HoldingInput, entrada: CustoEntradaHolding): string[] {
  const pontos: string[] = [
    "ITBI na integralização: o default sem imunidade é o conservador para holding de locação (atividade preponderante imobiliária). Alguns municípios ainda aplicam a imunidade — conferir a lei local.",
    "Alíquotas de IBS/CBS são estimativas editáveis; a locação tem redução de 70% prevista, mas a regulamentação ainda pode alterar o recorte de contribuinte.",
    "Tema 796/STF: há tese de ITBI só sobre o excedente do capital social; o município pode discordar e lançar sobre o valor venal inteiro.",
  ]
  if (!entrada.imunidadeItbi && entrada.itbiSobreExcedente) {
    pontos.push("O comparador aplica ITBI apenas sobre mercado − capital. Se o município exigir o valor venal, o payback piora.")
  }
  const regime = (input.regimeBens || "").toLowerCase()
  if (regime.includes("parcial") || regime.includes("universal") || regime.includes("final")) {
    pontos.push(
      `Regime de bens (${input.regimeBens}): a meação e a doação das quotas com usufruto precisam de anuência do cônjuge e de cláusula no contrato social.`,
    )
  }
  if (input.doacaoUsufruto) {
    pontos.push(
      "Doação da nua-propriedade com usufruto: a base (fração do valor das quotas) varia por estado e pela idade do usufrutuário — a fração usada aqui é premissa editável.",
    )
  }
  return pontos
}

export function calcularComparadorHolding(input: HoldingInput): ComparadorHolding {
  const anos = calcularCargasAnuais(input)
  const entrada = calcularCustoEntradaHolding(input)
  const sucessao = calcularSucessaoHolding(input)
  const economias = anos.map((a) => a.economia)
  const pb = payback(economias, entrada.total)
  const valorVpl = vpl(economias, Number(input.taxaDesconto) || 0, entrada.total)
  const alugados = (input.imoveis ?? []).filter((i) => (i.aluguelMensal || 0) > 0).length
  const receita0 = (input.imoveis ?? []).reduce((s, i) => s + Math.max(0, i.aluguelMensal || 0), 0) * 12
  const veredito = montarVeredito({
    paybackAnos: pb.anos,
    paybackMeses: pb.meses,
    paybackDentro: pb.dentro,
    vpl: valorVpl,
    economiaSucessao: sucessao.economiaSucessao,
    economiaAnos: anos[anos.length - 1]?.economiaAcumulada ?? 0,
    entrada,
    anos,
  })
  return {
    anos,
    entrada,
    sucessao,
    economiaAnos: anos[anos.length - 1]?.economiaAcumulada ?? 0,
    vpl: valorVpl,
    paybackAnos: pb.anos,
    paybackMeses: pb.meses,
    paybackDentro: pb.dentro,
    veredito,
    pfContribuinteIva: pfContribuinteIbsCbs(alugados, receita0),
    pontosAtencao: pontosAtencaoHolding(input, entrada),
  }
}

export function imoveisDeAtivos(
  ativos: Array<{
    id: string
    tipo: string
    descricao?: string
    valor?: number
    valorIrpf?: number
    aluguelMensal?: number
    uf?: string
    municipio?: string
    tipoImovel?: string
    localizacao?: string
  }>,
): ImovelHolding[] {
  return ativos
    .filter((a) => a.tipo === "imobilizado")
    .map((a, i) => ({
      id: `from-${a.id || i}`,
      ativoId: a.id,
      descricao: a.descricao || `Imóvel ${i + 1}`,
      valorMercado: Number(a.valor) || 0,
      valorIrpf: Number(a.valorIrpf) || 0,
      aluguelMensal: Number(a.aluguelMensal) || 0,
      tipo: a.tipoImovel === "comercial" ? "comercial" : "residencial",
      uf: (a.uf || "").toUpperCase(),
      municipio: a.municipio || a.localizacao || "",
    }))
}

export function holdingInputDeState(h: SucessaoHolding, extra?: Partial<HoldingInput>): HoldingInput {
  return { ...DEFAULT_SUCESSAO_HOLDING, ...h, ...extra }
}
