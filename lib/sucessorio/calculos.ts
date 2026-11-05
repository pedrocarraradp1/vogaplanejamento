import {
  getRegraItcmdUf,
  impostoPorFaixas,
  TABELA_REFERENCIA_REFORMA,
  TETO_PROGRESSIVO_REFORMA,
  type MemoriaFaixa,
  type MultaAtrasoItcmd,
  type RegraItcmdUf,
  type UfBrasil,
} from "./itcmd-uf.ts"

export type ModalidadeItcmd = "doacao" | "causa_mortis"

export type TipoAtivoSucessorio =
  | "imovel"
  | "quotas"
  | "acoes"
  | "dinheiro"
  | "previdencia"
  | "holding"
  | "outros"

export type ResultadoItcmd = {
  uf: UfBrasil
  modalidade: ModalidadeItcmd
  tipoAtivo: TipoAtivoSucessorio
  valor: number
  base: number
  imposto: number
  aliquotaEfetiva: number
  liquido: number
  memoria: MemoriaFaixa[]
  pontosDeAtencao: string[]
  conferir?: boolean
}

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function calcularItcmd(params: {
  uf: string
  modalidade: ModalidadeItcmd
  tipoAtivo: TipoAtivoSucessorio
  valor: number
  doacoesAnteriores?: number
  descontoLegal?: number
}): ResultadoItcmd {
  const regra = getRegraItcmdUf(params.uf)
  const valor = Math.max(0, Number(params.valor) || 0)
  const anteriores =
    params.modalidade === "doacao" ? Math.max(0, Number(params.doacoesAnteriores) || 0) : 0
  const isencao =
    params.modalidade === "doacao"
      ? Number(regra.isencaoDoacao) || 0
      : Number(regra.isencaoCausaMortis) || 0

  const baseCheia = valor + anteriores
  const isento = baseCheia <= isencao
  const baseTributavel = isento ? 0 : baseCheia
  const baseAnteriorTributavel = anteriores > 0 && anteriores > isencao ? anteriores : 0

  const atual = impostoPorFaixas(baseTributavel, regra.faixas)
  const jaPago =
    baseAnteriorTributavel > 0 ? impostoPorFaixas(baseAnteriorTributavel, regra.faixas).imposto : 0

  let imposto = Math.max(0, atual.imposto - jaPago)
  const desconto = Math.max(0, Math.min(1, Number(params.descontoLegal) || 0))
  if (desconto > 0) imposto *= 1 - desconto

  imposto = round2(imposto)
  const aliquotaEfetiva = valor > 0 ? imposto / valor : 0

  return {
    uf: regra.uf,
    modalidade: params.modalidade,
    tipoAtivo: params.tipoAtivo,
    valor,
    base: baseTributavel,
    imposto,
    aliquotaEfetiva,
    liquido: round2(valor - imposto),
    memoria: atual.memoria,
    pontosDeAtencao: regra.pontosDeAtencao,
    conferir: regra.conferir,
  }
}

export type BemEspolio = {
  tipo: TipoAtivoSucessorio
  valor: number
  uf?: string
}

function ufCompetencia(bem: BemEspolio, domicilioUF: UfBrasil): UfBrasil {
  if (bem.tipo === "imovel") {
    return (bem.uf?.trim() ? bem.uf : domicilioUF) as UfBrasil
  }
  return domicilioUF
}

export type ResultadoEspolioUf = {
  uf: UfBrasil
  base: number
  imposto: number
  aliquotaEfetiva: number
  bens: BemEspolio[]
  detalhe: ResultadoItcmd
}

export type ResultadoEspolio = {
  domicilioUF: UfBrasil
  modalidade: ModalidadeItcmd
  patrimonio: number
  porEstado: ResultadoEspolioUf[]
  imposto: number
  aliquotaConsolidada: number
  liquido: number
}

export function calcularEspolio(params: {
  domicilioUF: string
  modalidade: ModalidadeItcmd
  bens: BemEspolio[]
}): ResultadoEspolio {
  const domicilioUF = getRegraItcmdUf(params.domicilioUF).uf
  const grupos = new Map<UfBrasil, BemEspolio[]>()

  for (const bem of params.bens) {
    const valor = Math.max(0, Number(bem.valor) || 0)
    if (valor <= 0) continue
    const uf = getRegraItcmdUf(ufCompetencia({ ...bem, valor }, domicilioUF)).uf
    const lista = grupos.get(uf) ?? []
    lista.push({ ...bem, valor })
    grupos.set(uf, lista)
  }

  const porEstado: ResultadoEspolioUf[] = []
  for (const [uf, bens] of grupos) {
    const base = bens.reduce((s, b) => s + b.valor, 0)
    const tipoPrincipal = bens[0]?.tipo ?? "outros"
    const detalhe = calcularItcmd({
      uf,
      modalidade: params.modalidade,
      tipoAtivo: tipoPrincipal,
      valor: base,
    })
    porEstado.push({
      uf,
      base,
      imposto: detalhe.imposto,
      aliquotaEfetiva: detalhe.aliquotaEfetiva,
      bens,
      detalhe,
    })
  }

  porEstado.sort((a, b) => a.uf.localeCompare(b.uf))
  const patrimonio = params.bens.reduce((s, b) => s + Math.max(0, Number(b.valor) || 0), 0)
  const imposto = round2(porEstado.reduce((s, e) => s + e.imposto, 0))

  return {
    domicilioUF,
    modalidade: params.modalidade,
    patrimonio,
    porEstado,
    imposto,
    aliquotaConsolidada: patrimonio > 0 ? imposto / patrimonio : 0,
    liquido: round2(patrimonio - imposto),
  }
}

export type ResultadoImpactoReforma = {
  uf: UfBrasil
  patrimonio: number
  baseAjustada: number
  impostoHoje: number
  impostoProjecao: number
  aliquotaHoje: number
  aliquotaProjecao: number
  aumento: number
  aumentoPct: number
  tetoReforma: number
  memoriaProjecao: MemoriaFaixa[]
}

export function calcularImpactoReforma(params: {
  uf: string
  patrimonio: number
  holding?: number
  imoveis?: number
  exterior?: number
  previdencia?: number
}): ResultadoImpactoReforma {
  const regra = getRegraItcmdUf(params.uf)
  const patrimonio = Math.max(0, Number(params.patrimonio) || 0)
  const holding = Math.max(0, Number(params.holding) || 0)
  const imoveis = Math.max(0, Number(params.imoveis) || 0)
  const exterior = Math.max(0, Number(params.exterior) || 0)
  const previdencia = Math.max(0, Number(params.previdencia) || 0)
  const alocados = holding + imoveis + exterior + previdencia
  const demais = Math.max(0, patrimonio - alocados)

  const baseAjustada = round2(holding * 1.35 + imoveis * 1.15 + exterior + demais)

  const hoje = calcularItcmd({
    uf: regra.uf,
    modalidade: "causa_mortis",
    tipoAtivo: "outros",
    valor: baseAjustada,
  })
  const proj = impostoPorFaixas(baseAjustada, TABELA_REFERENCIA_REFORMA)
  const impostoProjecao = round2(proj.imposto)
  const aumento = round2(impostoProjecao - hoje.imposto)

  return {
    uf: regra.uf,
    patrimonio,
    baseAjustada,
    impostoHoje: hoje.imposto,
    impostoProjecao,
    aliquotaHoje: baseAjustada > 0 ? hoje.imposto / baseAjustada : 0,
    aliquotaProjecao: baseAjustada > 0 ? impostoProjecao / baseAjustada : 0,
    aumento,
    aumentoPct: hoje.imposto > 0 ? aumento / hoje.imposto : impostoProjecao > 0 ? 1 : 0,
    tetoReforma: TETO_PROGRESSIVO_REFORMA,
    memoriaProjecao: proj.memoria,
  }
}

export type ViaInventario = "extrajudicial" | "judicial" | "litigio"

function calcularMultaAtraso(
  imposto: number,
  diasAteAbertura: number,
  multa: MultaAtrasoItcmd | undefined,
  prazoFallback: number,
): number {
  if (imposto <= 0) return 0
  const prazo = multa?.prazoDias ?? prazoFallback
  const atraso = Math.max(0, (Number(diasAteAbertura) || 0) - prazo)
  if (atraso <= 0) return 0

  const cfg: MultaAtrasoItcmd = multa ?? {
    prazoDias: prazo,
    modo: "aliquota_fixa",
    aliquota: 0.1,
    base: "imposto",
  }

  let aliquota = 0
  if (cfg.modo === "diaria") {
    aliquota = cfg.aliquota * atraso
    if (cfg.teto != null) aliquota = Math.min(aliquota, cfg.teto)
  } else {
    aliquota = cfg.aliquota
  }

  return round2(imposto * aliquota)
}

export type ResultadoCustoInventario = {
  uf: UfBrasil
  via: ViaInventario
  patrimonio: number
  itcmd: number
  multa: number
  honorarios: number
  custas: number
  total: number
  percentualPatrimonio: number
  liquidoHerdeiros: number
  mito20: {
    percentual: number
    valor: number
    diferenca: number
  }
}

export function calcularCustoInventario(params: {
  uf: string
  patrimonio: number
  via: ViaInventario
  honorariosPct?: number
  custasPct?: number
  diasAteAbertura: number
}): ResultadoCustoInventario {
  const regra = getRegraItcmdUf(params.uf)
  const patrimonio = Math.max(0, Number(params.patrimonio) || 0)
  const honorariosPct = params.honorariosPct ?? 0.06
  const custasPct = params.custasPct ?? 0.015

  const itcmd = calcularItcmd({
    uf: regra.uf,
    modalidade: "causa_mortis",
    tipoAtivo: "outros",
    valor: patrimonio,
  }).imposto

  const multa = calcularMultaAtraso(
    itcmd,
    params.diasAteAbertura,
    regra.multaAtraso,
    regra.prazoPagamentoDias ?? 30,
  )
  const honorarios = round2(patrimonio * honorariosPct)
  const custas = round2(patrimonio * custasPct)
  const total = round2(itcmd + multa + honorarios + custas)
  const mitoValor = round2(patrimonio * 0.2)

  return {
    uf: regra.uf,
    via: params.via,
    patrimonio,
    itcmd,
    multa,
    honorarios,
    custas,
    total,
    percentualPatrimonio: patrimonio > 0 ? total / patrimonio : 0,
    liquidoHerdeiros: round2(patrimonio - total),
    mito20: {
      percentual: 0.2,
      valor: mitoValor,
      diferenca: round2(mitoValor - total),
    },
  }
}

export type FrenteAlerta = "sucessorio" | "juridico" | "fiscal" | "internacional"
export type EtiquetaAlerta = "invisivel" | "ignorado" | "caro"
export type NivelAlerta = "baixo" | "medio" | "alto"

export type SinalAlerta = {
  id: number
  frente: FrenteAlerta
  etiqueta: EtiquetaAlerta
  titulo: string
  explicacao: string
  ativo: boolean
}

export const SINAIS_ALERTA: Omit<SinalAlerta, "ativo">[] = [
  {
    id: 0,
    frente: "sucessorio",
    etiqueta: "invisivel",
    titulo: "Sem testamento",
    explicacao: "A sucessão segue a ordem legal, sem espaço para vocação extra ou recados patrimoniais.",
  },
  {
    id: 1,
    frente: "sucessorio",
    etiqueta: "caro",
    titulo: "Inventário extrajudicial inviável",
    explicacao: "Herdeiro incapaz, testamento ou conflito empurra o inventário para o judicial, mais lento e caro.",
  },
  {
    id: 2,
    frente: "sucessorio",
    etiqueta: "invisivel",
    titulo: "União estável não formalizada",
    explicacao: "Companheiro pode ter de provar a união no inventário, com risco de disputa e atraso.",
  },
  {
    id: 3,
    frente: "sucessorio",
    etiqueta: "ignorado",
    titulo: "Herdeiros menores sem estrutura",
    explicacao: "Sem usufruto, administração ou holding, a partilha com menores exige alvará e trava liquidez.",
  },
  {
    id: 4,
    frente: "sucessorio",
    etiqueta: "invisivel",
    titulo: "Mapa patrimonial desatualizado",
    explicacao: "Bens, contratos e senhas não inventariados aumentam omissão e custo de localização.",
  },
  {
    id: 5,
    frente: "juridico",
    etiqueta: "ignorado",
    titulo: "Holding sem acordo de quotistas",
    explicacao: "A morte de sócio sem acordo gera entrada de herdeiros na sociedade e impasse de voto.",
  },
  {
    id: 6,
    frente: "juridico",
    etiqueta: "invisivel",
    titulo: "Regime de bens desalinhado",
    explicacao: "Comunhão inadequada mistura herança, meação e bens particulares no momento crítico.",
  },
  {
    id: 7,
    frente: "juridico",
    etiqueta: "caro",
    titulo: "Empresa sem cláusula de sucessão",
    explicacao: "Contrato social omisso pode dissolver a sociedade ou forçar apuração de haveres à vista.",
  },
  {
    id: 8,
    frente: "juridico",
    etiqueta: "invisivel",
    titulo: "Sem diretivas de incapacidade",
    explicacao: "Não há procuração, vontade antecipada ou curatela planejada se o titular ficar incapaz.",
  },
  {
    id: 9,
    frente: "juridico",
    etiqueta: "caro",
    titulo: "Condomínio informal de bens",
    explicacao: "Imóveis e cotas em nome de vários familiares sem regra de saída travam venda e partilha.",
  },
  {
    id: 10,
    frente: "fiscal",
    etiqueta: "caro",
    titulo: "Doações sem planejamento de ITCMD",
    explicacao: "Doações no mesmo ano se agregam; a alíquota e a isenção podem ser perdidas.",
  },
  {
    id: 11,
    frente: "fiscal",
    etiqueta: "invisivel",
    titulo: "Previdência tratada como sempre isenta",
    explicacao: "VGBL em regra não entra no inventário; PGBL e alguns produtos podem integrar a base.",
  },
  {
    id: 12,
    frente: "fiscal",
    etiqueta: "ignorado",
    titulo: "ITCMD não estimado por UF",
    explicacao: "Imóvel, quotas e dinheiro têm competências diferentes — a alíquota consolidada some.",
  },
  {
    id: 13,
    frente: "fiscal",
    etiqueta: "caro",
    titulo: "Imóveis concentrados em UF cara",
    explicacao: "A competência do imóvel é o estado da situação; alíquota local pode ser 7%–8%.",
  },
  {
    id: 14,
    frente: "fiscal",
    etiqueta: "caro",
    titulo: "Sem caixa para o ITCMD",
    explicacao: "Família precisa vender ativo ilíquido para pagar imposto, multa, honorários e custas.",
  },
  {
    id: 15,
    frente: "internacional",
    etiqueta: "caro",
    titulo: "Bens nos EUA sem estate tax plan",
    explicacao: "Não residente tem crédito de apenas US$ 13 mil (isenção ~US$ 60 mil) e tabela até 40%.",
  },
  {
    id: 16,
    frente: "internacional",
    etiqueta: "invisivel",
    titulo: "Domicílio sucessório indefinido",
    explicacao: "Dupla residência ou visto gera conflito de lei aplicável e bitributação de transmissão.",
  },
  {
    id: 17,
    frente: "internacional",
    etiqueta: "ignorado",
    titulo: "Offshore sem sucessão documentada",
    explicacao: "Estrutura no exterior sem herdeiro, trust ou testamento local fica inacessível.",
  },
  {
    id: 18,
    frente: "internacional",
    etiqueta: "invisivel",
    titulo: "Cônjuge estrangeiro sem planning",
    explicacao: "Marital deduction e residência fiscal do cônjuge mudam o estate tax e o ITCMD.",
  },
  {
    id: 19,
    frente: "internacional",
    etiqueta: "caro",
    titulo: "Conta/trust exterior sem sucessor",
    explicacao: "Instituição trava o ativo até probate local, com honorários e atraso em dólar.",
  },
]

const FRENTES: FrenteAlerta[] = ["sucessorio", "juridico", "fiscal", "internacional"]

function nivelDePontos(pontos: number): NivelAlerta {
  if (pontos >= 4) return "alto"
  if (pontos >= 2) return "medio"
  return "baixo"
}

export type ResultadoDiagnostico = {
  sinais: SinalAlerta[]
  porFrente: Record<
    FrenteAlerta,
    {
      pontos: number
      nivel: NivelAlerta
      ativos: number
    }
  >
  pontuacaoTotal: number
  nivelGeral: NivelAlerta
  frentePrioritaria: FrenteAlerta
  perguntaAbertura: string
  proximoPasso: string
}

const PERGUNTA_ABERTURA: Record<FrenteAlerta, string> = {
  sucessorio:
    "Se algo acontecesse amanhã, a família saberia exatamente quem decide e com qual caixa paga o imposto?",
  juridico:
    "O contrato social e o regime de bens realmente descrevem o que vocês acham que vai acontecer?",
  fiscal: "Vocês já simularam o ITCMD estado a estado — ou só o “cerca de 4%” de São Paulo?",
  internacional:
    "Tem patrimônio em dólar ou empresa no exterior cujo sucessor a instituição já reconhece?",
}

const PROXIMO_PASSO: Record<FrenteAlerta, string> = {
  sucessorio:
    "Levantar o mapa de bens, herdeiros e testamento (ou a falta dele) antes de discutir estruturas.",
  juridico:
    "Revisar regime de bens, acordo de quotistas e cláusulas de sucessão societária com o advogado da família.",
  fiscal:
    "Rodar o espólio por UF (imóvel no estado, quotas e dinheiro no domicílio) e provisionar caixa para o ITCMD.",
  internacional:
    "Inventariar bens nos EUA e offshores e estimar estate tax do não residente (crédito de US$ 13 mil).",
}

export function diagnosticoSinaisAlerta(respostas: boolean[]): ResultadoDiagnostico {
  const flags = Array.from({ length: 20 }, (_, i) => Boolean(respostas[i]))
  const sinais: SinalAlerta[] = SINAIS_ALERTA.map((s, i) => ({
    ...s,
    ativo: flags[i] ?? false,
  }))

  const porFrente = {} as ResultadoDiagnostico["porFrente"]
  for (const frente of FRENTES) {
    const doGrupo = sinais.filter((s) => s.frente === frente)
    const pontos = doGrupo.filter((s) => s.ativo).length
    porFrente[frente] = {
      pontos,
      nivel: nivelDePontos(pontos),
      ativos: pontos,
    }
  }

  const pontuacaoTotal = sinais.filter((s) => s.ativo).length
  const nivelGeral = nivelDePontos(Math.ceil(pontuacaoTotal / 4))

  let frentePrioritaria: FrenteAlerta = "sucessorio"
  let melhor = -1
  for (const frente of FRENTES) {
    const pontos = porFrente[frente].pontos
    const caros = sinais.filter((s) => s.frente === frente && s.ativo && s.etiqueta === "caro").length
    const score = pontos * 10 + caros
    if (score > melhor) {
      melhor = score
      frentePrioritaria = frente
    }
  }

  if (pontuacaoTotal === 0) {
    frentePrioritaria = "sucessorio"
  }

  return {
    sinais,
    porFrente,
    pontuacaoTotal,
    nivelGeral,
    frentePrioritaria,
    perguntaAbertura: PERGUNTA_ABERTURA[frentePrioritaria],
    proximoPasso: PROXIMO_PASSO[frentePrioritaria],
  }
}

export type { RegraItcmdUf, MemoriaFaixa, UfBrasil }
