import { normalizeAtivoTipo } from "@/lib/patrimonio-utils"
import {
  calcularCustoInventario,
  calcularEspolio,
  calcularImpactoReforma,
  diagnosticoSinaisAlerta,
  type BemEspolio,
  type FrenteAlerta,
  type ResultadoCustoInventario,
  type ResultadoEspolio,
  type ResultadoImpactoReforma,
  type ViaInventario,
} from "./calculos.ts"
import { calcularEstateTax, type ResultadoEstateTax } from "./estate-tax-eua.ts"
import {
  calcularComparadorHolding,
  imoveisDeAtivos,
  irpfAluguelNaDeclaracao,
  retencaoDividendos,
  tributosLucroPresumidoLocacao,
  type ComparadorHolding,
  type HoldingInput,
} from "./holding.ts"
import { ITCMD_POR_UF, type UfBrasil } from "./itcmd-uf.ts"
import { type TipoRoteiro } from "./roteiros.ts"
import {
  DEFAULT_SUCESSAO_HOLDING,
  DEFAULT_SUCESSAO_SIMULADOR,
  hidratarHolding,
  type SucessaoDiagnostico,
  type SucessaoHolding,
  type SucessaoSimulador,
} from "./tipos.ts"

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100
}

function ufSegura(uf: string | undefined): UfBrasil {
  const u = (uf || "SP").trim().toUpperCase()
  return (u in ITCMD_POR_UF ? u : "SP") as UfBrasil
}

function idadeEm(iso: string | undefined, hoje: Date): number | null {
  if (!iso) return null
  const nasc = new Date(iso)
  if (Number.isNaN(nasc.getTime())) return null
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return Math.max(0, idade)
}

export const IRPFM_PISO = 600_000
export const IRPFM_TETO_RENDA = 1_200_000
export const IRPFM_ALIQUOTA_TETO = 0.1
export const CAMBIO_USD_PADRAO = 5

export type TriagemConsultoria = {
  testamento?: "Sim" | "Não"
  holdingExistente?: "Sim" | "Não"
  doacoesJaRealizadas?: "Sim" | "Não"
  usufruto?: "Sim" | "Não"
  planejamentoRealizado?: "Sim" | "Não" | "Em andamento"
  bensNoExterior?: "Sim" | "Não"
  usoPGBL?: "Sim, uso atualmente" | "Uso potencial" | "Não"
  preocupacaoInventario?: "Alta" | "Média" | "Baixa" | "Nenhuma"
  preocupacaoItcmd?: "Alta" | "Média" | "Baixa" | "Nenhuma"
  conflitoFamiliar?: boolean
  herdeiroIncapaz?: boolean
  temAcordoSocios?: boolean
  aceitaHolding?: boolean
  aceitaDoacao?: boolean
  aceitaSeguro?: boolean
  aceitaPrevidencia?: boolean
  viaPreferida?: ViaInventario
}

export type LacunaConsultoria = {
  campo: string
  pergunta: string
}

export type FilhoPerfil = { nome: string; idade: number | null; menor: boolean }

export type PerfilConsultoria = {
  nome: string
  idade: number | null
  estadoCivil: string
  regimeBens: string
  uf: UfBrasil
  filhos: FilhoPerfil[]
  herdeiros: number
  ativosPorTipo: Record<string, number>
  empresas: string[]
  imoveisAlugados: number
  aluguelMensal: number
  rendaAnual: number
  outrosRendimentosAnuais: number
  dividas: number
  capitalSegurado: number
  previdenciaPGBL: number
  previdenciaVGBL: number
  liquidos: number
  imoveis: number
  participacoes: number
  euaUSD: number
  bensEspolio: BemEspolio[]
  imoveisHolding: HoldingInput["imoveis"]
}

export type NivelScore = "baixo" | "medio" | "alto"

export type RiscoConsultoria = {
  id: string
  frente: FrenteAlerta
  titulo: string
  impactoReais: number
  urgencia: number
  numero: number
  oQueSustenta: string
  seNadaForFeito: string
  fonte: string
}

export type IdEstrategia =
  | "holding_patrimonial"
  | "doacao_usufruto"
  | "testamento"
  | "seguro_vida_liquidez"
  | "previdencia_vgbl_pgbl"
  | "acordo_socios"
  | "domicilio_fiscal"
  | "manter"
  | "holding_mais_seguro"
  | "holding_mais_doacao"
  | "holding_doacao_seguro"

export type ResponsavelAcao = "cliente" | "assessor" | "advogado" | "contador"

export type EstrategiaConsultoria = {
  id: IdEstrategia
  nome: string
  plano: boolean
  componentes: IdEstrategia[]
  elegivel: boolean
  score: number
  economia: number
  custo: number
  paybackAnos: number | null
  prazo: string
  complexidade: "baixa" | "media" | "alta"
  aderencia: number
  pros: string[]
  contras: string[]
  preRequisitos: string[]
  proximosPassos: string[]
  roteiro: TipoRoteiro | null
  templates: string[]
  clausulas: string[]
}

export type FaseAcao = "imediato" | "90_dias" | "12_meses"

export type ItemAcao = {
  fase: FaseAcao
  titulo: string
  responsavel: ResponsavelAcao
  estrategiaId: IdEstrategia
}

export type LeituraFiscal = {
  aluguelAnual: number
  irpfAluguelPF: number
  cargaHoldingAluguel: number
  economiaAluguelAno1: number
  retencaoDividendos: number
  irpfm: {
    rendaAnual: number
    enquadrado: boolean
    aliquota: number
    imposto: number
    organizarAntes: string[]
  }
}

export type SimulacoesConsultoria = {
  via: ViaInventario
  espolio: ResultadoEspolio
  inventario: ResultadoCustoInventario
  reforma: ResultadoImpactoReforma
  estate: ResultadoEstateTax | null
  holding: ComparadorHolding | null
  liquidez: number | null
  liquidos: number
}

export type Parecer = {
  geradoEm: string
  perfil: PerfilConsultoria
  lacunas: LacunaConsultoria[]
  simulacoes: SimulacoesConsultoria
  diagnostico: {
    score: number
    nivel: NivelScore
    riscos: RiscoConsultoria[]
  }
  recomendacao: {
    ranqueadas: EstrategiaConsultoria[]
    primeira: IdEstrategia | null
  }
  planoAcao: ItemAcao[]
  fiscal: LeituraFiscal
}

export type SucessaoConsultoria = {
  geradoEm: string
  triagem: TriagemConsultoria
  parecer: Parecer
  textoNarrativo?: string
  acoesConcluidas?: string[]
}

export type PlanoConsultoria = {
  dadosPessoais?: {
    nome?: string
    nascimento?: string
    estadoCivil?: string
    regime?: string
    uf?: string
    filhos?: Array<{ nome?: string; dataNascimento?: string }>
    fontesRenda?: Array<{ tipo?: string; valorMensal?: number }>
    renda?: number
  }
  ativos?: Array<{
    id?: string
    tipo?: string
    descricao?: string
    valor?: number
    uf?: string
    localizacao?: string
    empresa?: string
    aluguelMensal?: number
    valorIrpf?: number
    tipoImovel?: string
    municipio?: string
    heranca?: boolean
    bemDeHeranca?: boolean
    tipoPlanoPrevidencia?: string
  }>
  passivos?: Array<{ saldoDevedor?: number; valor?: number }>
  seguros?: Array<{ capitalSegurado?: number }>
  sucessao?: {
    diagnostico?: SucessaoDiagnostico
    simulador?: SucessaoSimulador
    holding?: SucessaoHolding
    regimeSucessao?: string
    herdeiros?: number
    questionario?: TriagemConsultoria & Record<string, unknown>
  }
}

export function triagemDoQuestionario(q: Record<string, unknown> | undefined): TriagemConsultoria {
  if (!q) return {}
  return {
    testamento: q.testamento === "Sim" || q.testamento === "Não" ? q.testamento : undefined,
    holdingExistente:
      q.holdingPatrimonialOuFamiliar === "Sim" || q.holdingPatrimonialOuFamiliar === "Não"
        ? q.holdingPatrimonialOuFamiliar
        : q.holdingExistente === "Sim" || q.holdingExistente === "Não"
          ? q.holdingExistente
          : undefined,
    doacoesJaRealizadas:
      q.doacoesJaRealizadas === "Sim" || q.doacoesJaRealizadas === "Não" ? q.doacoesJaRealizadas : undefined,
    usufruto: q.usufruto === "Sim" || q.usufruto === "Não" ? q.usufruto : undefined,
    planejamentoRealizado:
      q.planejamentoSucessorioRealizado === "Sim" ||
      q.planejamentoSucessorioRealizado === "Não" ||
      q.planejamentoSucessorioRealizado === "Em andamento"
        ? q.planejamentoSucessorioRealizado
        : q.planejamentoRealizado === "Sim" ||
            q.planejamentoRealizado === "Não" ||
            q.planejamentoRealizado === "Em andamento"
          ? q.planejamentoRealizado
          : undefined,
    bensNoExterior: q.bensNoExterior === "Sim" || q.bensNoExterior === "Não" ? q.bensNoExterior : undefined,
    usoPGBL:
      q.usoPGBL === "Sim, uso atualmente" || q.usoPGBL === "Uso potencial" || q.usoPGBL === "Não"
        ? q.usoPGBL
        : undefined,
    preocupacaoInventario:
      q.preocupacaoComInventario === "Alta" ||
      q.preocupacaoComInventario === "Média" ||
      q.preocupacaoComInventario === "Baixa" ||
      q.preocupacaoComInventario === "Nenhuma"
        ? q.preocupacaoComInventario
        : q.preocupacaoInventario === "Alta" ||
            q.preocupacaoInventario === "Média" ||
            q.preocupacaoInventario === "Baixa" ||
            q.preocupacaoInventario === "Nenhuma"
          ? q.preocupacaoInventario
          : undefined,
    preocupacaoItcmd:
      q.preocupacaoComITCMD === "Alta" ||
      q.preocupacaoComITCMD === "Média" ||
      q.preocupacaoComITCMD === "Baixa" ||
      q.preocupacaoComITCMD === "Nenhuma"
        ? q.preocupacaoComITCMD
        : q.preocupacaoItcmd === "Alta" ||
            q.preocupacaoItcmd === "Média" ||
            q.preocupacaoItcmd === "Baixa" ||
            q.preocupacaoItcmd === "Nenhuma"
          ? q.preocupacaoItcmd
          : undefined,
    conflitoFamiliar: q.conflitoFamiliar == null ? undefined : Boolean(q.conflitoFamiliar),
    herdeiroIncapaz: q.herdeiroIncapaz == null ? undefined : Boolean(q.herdeiroIncapaz),
    temAcordoSocios: q.temAcordoSocios == null ? undefined : Boolean(q.temAcordoSocios),
    aceitaHolding: q.aceitaHolding == null ? undefined : Boolean(q.aceitaHolding),
    aceitaDoacao: q.aceitaDoacao == null ? undefined : Boolean(q.aceitaDoacao),
    aceitaSeguro: q.aceitaSeguro == null ? undefined : Boolean(q.aceitaSeguro),
    aceitaPrevidencia: q.aceitaPrevidencia == null ? undefined : Boolean(q.aceitaPrevidencia),
    viaPreferida:
      q.viaPreferida === "judicial" || q.viaPreferida === "litigio" || q.viaPreferida === "extrajudicial"
        ? q.viaPreferida
        : undefined,
  }
}

export function montarPerfil(plano: PlanoConsultoria, hoje = new Date()): PerfilConsultoria {
  const dp = plano.dadosPessoais ?? {}
  const uf = ufSegura(dp.uf)
  const filhos = (dp.filhos ?? []).map((f) => {
    const idade = idadeEm(f.dataNascimento, hoje)
    return { nome: f.nome ?? "", idade, menor: idade != null && idade < 18 }
  })
  const ativos = plano.ativos ?? []
  const ativosPorTipo: Record<string, number> = {
    imobilizado: 0,
    ativo_liquido: 0,
    participacao_societaria: 0,
    previdencia: 0,
  }
  const empresas: string[] = []
  let imoveisAlugados = 0
  let aluguelMensal = 0
  let liquidos = 0
  let imoveis = 0
  let participacoes = 0
  let euaUSD = 0
  let previdenciaPGBL = 0
  let previdenciaVGBL = 0
  const bensEspolio: BemEspolio[] = []

  for (const a of ativos) {
    const tipo = normalizeAtivoTipo(a.tipo ?? "", a.descricao)
    const valor = Number(a.valor) || 0
    if (valor <= 0) continue
    ativosPorTipo[tipo] = (ativosPorTipo[tipo] ?? 0) + valor
    if (tipo === "imobilizado") {
      imoveis += valor
      const aluguel = Number(a.aluguelMensal) || 0
      if (aluguel > 0) {
        imoveisAlugados += 1
        aluguelMensal += aluguel
      }
      bensEspolio.push({ tipo: "imovel", valor, uf: ufSegura(a.uf || uf) })
    } else if (tipo === "participacao_societaria") {
      participacoes += valor
      if (a.empresa?.trim()) empresas.push(a.empresa.trim())
      bensEspolio.push({ tipo: "quotas", valor, uf })
    } else if (tipo === "previdencia") {
      if (a.tipoPlanoPrevidencia === "PGBL") previdenciaPGBL += valor
      else previdenciaVGBL += valor
    } else {
      liquidos += valor
      if (a.localizacao === "internacional") euaUSD += valor
      bensEspolio.push({ tipo: "dinheiro", valor, uf })
    }
  }

  const fontes = dp.fontesRenda ?? []
  const rendaFontes = fontes.reduce((s, f) => s + (Number(f.valorMensal) || 0), 0)
  const rendaMensal = rendaFontes || Number(dp.renda) || 0
  const rendaAluguelFontes = fontes
    .filter((f) => f.tipo === "aluguel")
    .reduce((s, f) => s + (Number(f.valorMensal) || 0), 0)
  const outrosMensal = Math.max(0, rendaMensal - rendaAluguelFontes)
  const dividas = (plano.passivos ?? []).reduce(
    (s, p) => s + (Number(p.saldoDevedor) || Number(p.valor) || 0),
    0,
  )
  const capitalSegurado = (plano.seguros ?? []).reduce((s, x) => s + (Number(x.capitalSegurado) || 0), 0)
  const simulador = { ...DEFAULT_SUCESSAO_SIMULADOR, ...(plano.sucessao?.simulador ?? {}) }
  if (simulador.bensEuaUSD != null && simulador.bensEuaUSD > 0) euaUSD = simulador.bensEuaUSD

  return {
    nome: dp.nome ?? "",
    idade: idadeEm(dp.nascimento, hoje),
    estadoCivil: dp.estadoCivil ?? "",
    regimeBens: plano.sucessao?.regimeSucessao || dp.regime || "",
    uf,
    filhos,
    herdeiros: filhos.length || Number(plano.sucessao?.herdeiros) || 0,
    ativosPorTipo,
    empresas,
    imoveisAlugados,
    aluguelMensal,
    rendaAnual: round2(rendaMensal * 12),
    outrosRendimentosAnuais: round2(outrosMensal * 12),
    dividas,
    capitalSegurado,
    previdenciaPGBL,
    previdenciaVGBL,
    liquidos,
    imoveis,
    participacoes,
    euaUSD,
    bensEspolio,
    imoveisHolding: imoveisDeAtivos(
      ativos.map((a, i) => ({
        id: a.id || `a-${i}`,
        tipo: normalizeAtivoTipo(a.tipo ?? "", a.descricao),
        descricao: a.descricao,
        valor: a.valor,
        valorIrpf: a.valorIrpf,
        aluguelMensal: a.aluguelMensal,
        uf: a.uf,
        municipio: a.municipio,
        tipoImovel: a.tipoImovel,
        localizacao: a.localizacao,
      })),
    ),
  }
}

export function listarLacunas(plano: PlanoConsultoria, perfil: PerfilConsultoria, triagem: TriagemConsultoria): LacunaConsultoria[] {
  const lacunas: LacunaConsultoria[] = []
  const dp = plano.dadosPessoais ?? {}
  if (!dp.nascimento) lacunas.push({ campo: "nascimento", pergunta: "Qual a data de nascimento do titular?" })
  if (!dp.estadoCivil) lacunas.push({ campo: "estadoCivil", pergunta: "Qual o estado civil?" })
  if (!perfil.regimeBens) lacunas.push({ campo: "regime", pergunta: "Qual o regime de bens?" })
  if (!dp.uf) lacunas.push({ campo: "uf", pergunta: "Qual a UF de domicílio?" })
  if ((dp.filhos ?? []).some((f) => !f.dataNascimento)) {
    lacunas.push({ campo: "filhos.idade", pergunta: "Qual a data de nascimento de cada filho?" })
  }
  const imoveis = (plano.ativos ?? []).filter((a) => normalizeAtivoTipo(a.tipo ?? "", a.descricao) === "imobilizado")
  if (imoveis.some((a) => !a.uf)) {
    lacunas.push({ campo: "imoveis.uf", pergunta: "Em qual UF está cada imóvel?" })
  }
  if (imoveis.some((a) => a.aluguelMensal == null && (a.descricao ?? "").toLowerCase().includes("invest"))) {
    lacunas.push({ campo: "imoveis.aluguel", pergunta: "Qual o aluguel mensal de cada imóvel de investimento?" })
  }
  if (perfil.participacoes > 0 && (perfil.empresas.length === 0 || (plano.ativos ?? []).some((a) => normalizeAtivoTipo(a.tipo ?? "", a.descricao) === "participacao_societaria" && !a.empresa))) {
    lacunas.push({ campo: "empresas", pergunta: "Qual o nome da empresa de cada participação societária?" })
  }
  if (triagem.testamento == null) lacunas.push({ campo: "testamento", pergunta: "Já existe testamento?" })
  if (triagem.holdingExistente == null && (perfil.imoveisAlugados > 0 || perfil.participacoes > 0)) {
    lacunas.push({ campo: "holding", pergunta: "Já existe holding patrimonial ou familiar?" })
  }
  if (perfil.participacoes > 0 && triagem.temAcordoSocios == null) {
    lacunas.push({ campo: "acordoSocios", pergunta: "A empresa tem acordo de sócios / cláusula de sucessão?" })
  }
  if (triagem.bensNoExterior == null && perfil.euaUSD <= 0) {
    lacunas.push({ campo: "bensNoExterior", pergunta: "Há bens, contas ou ações no exterior?" })
  }
  return lacunas
}

export function inferirVia(perfil: PerfilConsultoria, triagem: TriagemConsultoria): ViaInventario {
  if (triagem.viaPreferida) return triagem.viaPreferida
  if (triagem.conflitoFamiliar) return "litigio"
  if (triagem.herdeiroIncapaz || perfil.filhos.some((f) => f.menor) || triagem.testamento === "Sim") {
    return "judicial"
  }
  return "extrajudicial"
}

export function respostasDiagnostico(perfil: PerfilConsultoria, triagem: TriagemConsultoria, liquidez: number | null): boolean[] {
  const r = Array.from({ length: 20 }, () => false)
  r[0] = triagem.testamento === "Não"
  r[1] = inferirVia(perfil, triagem) !== "extrajudicial"
  r[3] = perfil.filhos.some((f) => f.menor)
  r[4] = triagem.planejamentoRealizado === "Não"
  r[5] = perfil.participacoes > 0 && triagem.temAcordoSocios !== true
  r[6] = !perfil.regimeBens
  r[7] = perfil.participacoes > 0 && triagem.temAcordoSocios !== true
  r[10] = triagem.doacoesJaRealizadas === "Sim"
  r[11] = triagem.usoPGBL === "Sim, uso atualmente" || perfil.previdenciaPGBL > 0
  r[12] = triagem.preocupacaoItcmd === "Nenhuma" || triagem.preocupacaoItcmd === "Baixa"
  r[14] = liquidez != null && liquidez < 1
  r[15] = triagem.bensNoExterior === "Sim" || perfil.euaUSD > 0
  r[17] = perfil.euaUSD > 0 && triagem.testamento === "Não"
  r[19] = perfil.euaUSD > 0 && triagem.testamento === "Não"
  return r
}

export function calcularIrpfm(rendaAnual: number): LeituraFiscal["irpfm"] {
  const renda = Math.max(0, Number(rendaAnual) || 0)
  const enquadrado = renda > IRPFM_PISO
  const aliquota =
    renda <= IRPFM_PISO
      ? 0
      : renda >= IRPFM_TETO_RENDA
        ? IRPFM_ALIQUOTA_TETO
        : IRPFM_ALIQUOTA_TETO * ((renda - IRPFM_PISO) / (IRPFM_TETO_RENDA - IRPFM_PISO))
  return {
    rendaAnual: round2(renda),
    enquadrado,
    aliquota: round2(aliquota * 10000) / 10000,
    imposto: round2(renda * aliquota),
    organizarAntes: enquadrado
      ? [
          "Separar dividendos, aluguéis e rendimentos isentos na escrituração de 2025/2026.",
          "Levantar o IR já retido (carnê-leão, fonte e 10% da Lei 15.270/2025) para creditar no IRPFM.",
          "Antes do ajuste, decidir se a distribuição da holding fica abaixo de R$ 50 mil/mês por beneficiário.",
        ]
      : ["Renda anual abaixo de R$ 600 mil — IRPFM não se aplica neste recorte."],
  }
}

export function montarSimulacoes(
  plano: PlanoConsultoria,
  perfil: PerfilConsultoria,
  triagem: TriagemConsultoria,
): SimulacoesConsultoria {
  const via = inferirVia(perfil, triagem)
  const simulador = { ...DEFAULT_SUCESSAO_SIMULADOR, ...(plano.sucessao?.simulador ?? {}) }
  const espolio = calcularEspolio({
    domicilioUF: perfil.uf,
    modalidade: "causa_mortis",
    bens: perfil.bensEspolio,
  })
  const inventario = calcularCustoInventario({
    uf: perfil.uf,
    patrimonio: espolio.patrimonio,
    via,
    honorariosPct: (simulador.honorariosPct ?? 6) / 100,
    custasPct: (simulador.custasPct ?? 1.5) / 100,
    diasAteAbertura: simulador.diasAteAbertura ?? 30,
  })
  const reforma = calcularImpactoReforma({
    uf: perfil.uf,
    patrimonio: espolio.patrimonio,
    holding: perfil.participacoes,
    imoveis: perfil.imoveis,
    previdencia: perfil.previdenciaPGBL + perfil.previdenciaVGBL,
    exterior: perfil.euaUSD,
  })
  const cambio = simulador.cambio && simulador.cambio > 0 ? simulador.cambio : CAMBIO_USD_PADRAO
  const estate = perfil.euaUSD > 0 ? calcularEstateTax(perfil.euaUSD, cambio) : null
  const deveHolding = perfil.imoveisAlugados > 0 || perfil.participacoes > 0
  let holding: ComparadorHolding | null = null
  if (deveHolding) {
    const saved = hidratarHolding(plano.sucessao?.holding)
    const imoveis =
      saved.imoveis.length > 0
        ? saved.imoveis
        : perfil.imoveisHolding.length > 0
          ? perfil.imoveisHolding
          : []
    const input: HoldingInput = {
      ...DEFAULT_SUCESSAO_HOLDING,
      ...saved,
      imoveis,
      herdeiros: perfil.herdeiros,
      ufDomicilio: perfil.uf,
      regimeBens: perfil.regimeBens || saved.regimeBens,
      outrosRendimentosAnuais: perfil.outrosRendimentosAnuais,
      viaInventario: via,
      honorariosPct: simulador.honorariosPct,
      custasPct: simulador.custasPct,
      diasAteAbertura: simulador.diasAteAbertura,
    }
    holding = calcularComparadorHolding(input)
  }
  const liquidez = inventario.total > 0 ? round2(perfil.liquidos / inventario.total) : null
  return {
    via,
    espolio,
    inventario,
    reforma,
    estate,
    holding,
    liquidez,
    liquidos: perfil.liquidos,
  }
}

function nivelScore(score: number): NivelScore {
  if (score >= 70) return "alto"
  if (score >= 40) return "medio"
  return "baixo"
}

function montarRiscos(
  perfil: PerfilConsultoria,
  triagem: TriagemConsultoria,
  sim: SimulacoesConsultoria,
): RiscoConsultoria[] {
  const cambio = sim.estate?.cambio || CAMBIO_USD_PADRAO
  const sinais = diagnosticoSinaisAlerta(respostasDiagnostico(perfil, triagem, sim.liquidez)).sinais
  const gapLiquidez = Math.max(0, sim.inventario.total - perfil.liquidos - perfil.capitalSegurado)
  const riscos: RiscoConsultoria[] = []

  const push = (r: RiscoConsultoria) => {
    if (r.impactoReais <= 0 && r.urgencia < 3) return
    riscos.push(r)
  }

  if (sinais[0]?.ativo) {
    push({
      id: "sem-testamento",
      frente: "sucessorio",
      titulo: "A família ainda não tem um recado escrito sobre a partilha",
      impactoReais: round2(sim.inventario.honorarios),
      urgencia: 4,
      numero: sim.inventario.total,
      oQueSustenta: `Custo estimado do inventário: R$ ${sim.inventario.total.toLocaleString("pt-BR")}`,
      seNadaForFeito: "A partilha segue só a lei, com mais briga de narrativa e o mesmo ITCMD.",
      fonte: "calcularCustoInventario",
    })
  }
  if (sim.liquidez != null && sim.liquidez < 1) {
    push({
      id: "liquidez-inventario",
      frente: "sucessorio",
      titulo: "Não há caixa visível para pagar o inventário sem vender bem",
      impactoReais: round2(gapLiquidez),
      urgencia: 5,
      numero: sim.liquidez,
      oQueSustenta: `Liquidez do espólio = ativos líquidos ÷ custo do inventário = ${sim.liquidez}`,
      seNadaForFeito: "Herdeiros vendem imóvel ou empresa com pressa para pagar ITCMD, honorários e custas.",
      fonte: "ativos líquidos / calcularCustoInventario",
    })
  }
  if (sim.espolio.imposto > 0) {
    push({
      id: "itcmd-espolio",
      frente: "fiscal",
      titulo: "O ITCMD já tem número — e não é um “cerca de 4%” único",
      impactoReais: sim.espolio.imposto,
      urgencia: 4,
      numero: sim.espolio.imposto,
      oQueSustenta: `ITCMD consolidado R$ ${sim.espolio.imposto.toLocaleString("pt-BR")} (${(sim.espolio.aliquotaConsolidada * 100).toFixed(2)}%)`,
      seNadaForFeito: "O imposto é devido na abertura da sucessão, estado a estado.",
      fonte: "calcularEspolio",
    })
  }
  if (sim.reforma.aumento > 0) {
    push({
      id: "reforma-itcmd",
      frente: "fiscal",
      titulo: "A reforma pode encarecer a conta se a família esperar",
      impactoReais: sim.reforma.aumento,
      urgencia: 3,
      numero: sim.reforma.aumento,
      oQueSustenta: `Diferença reforma vs. hoje: R$ ${sim.reforma.aumento.toLocaleString("pt-BR")}`,
      seNadaForFeito: "A partilha futura pode encontrar teto de 8% e bases reajustadas.",
      fonte: "calcularImpactoReforma",
    })
  }
  if (sim.estate && sim.estate.imposto > 0) {
    push({
      id: "estate-tax",
      frente: "internacional",
      titulo: "Há patrimônio com situs nos EUA sem plano de estate tax",
      impactoReais: round2(sim.estate.imposto * cambio),
      urgencia: 5,
      numero: sim.estate.imposto,
      oQueSustenta: `Estate tax US$ ${sim.estate.imposto.toLocaleString("en-US")}`,
      seNadaForFeito: "O crédito do não residente é só US$ 13 mil; o resto entra na tabela até 40%.",
      fonte: "calcularEstateTax",
    })
  }
  if (perfil.participacoes > 0 && triagem.temAcordoSocios !== true) {
    push({
      id: "acordo-socios",
      frente: "juridico",
      titulo: "A empresa não tem regra clara para a morte do sócio",
      impactoReais: round2(perfil.participacoes * 0.2),
      urgencia: 4,
      numero: perfil.participacoes,
      oQueSustenta: `Participações de R$ ${perfil.participacoes.toLocaleString("pt-BR")}`,
      seNadaForFeito: "Herdeiros entram no quadro ou cobram haveres à vista.",
      fonte: "participacao_societaria do plano",
    })
  }
  if (sim.holding && sim.holding.anos[0] && sim.holding.anos[0].economia > 0 && triagem.holdingExistente !== "Sim") {
    push({
      id: "aluguel-pf",
      frente: "fiscal",
      titulo: "O aluguel na pessoa física está mais caro do que numa holding de locação",
      impactoReais: sim.holding.economiaAnos,
      urgencia: 3,
      numero: sim.holding.anos[0].economia,
      oQueSustenta: `Economia no 1º ano R$ ${sim.holding.anos[0].economia.toLocaleString("pt-BR")}`,
      seNadaForFeito: "A família segue no carnê-leão e perde o VPL da estrutura.",
      fonte: "calcularComparadorHolding",
    })
  }

  riscos.sort((a, b) => b.impactoReais - a.impactoReais || b.urgencia - a.urgencia)
  return riscos
}

function paybackAnos(economia: number, custo: number): number | null {
  if (custo <= 0) return economia > 0 ? 0 : null
  if (economia <= 0) return null
  return round2(custo / economia)
}

function scoreEstrategia(opts: {
  economia: number
  custo: number
  complexidade: number
  prazoMeses: number
  aderencia: number
  tetoEconomia: number
}): number {
  const eco = opts.tetoEconomia > 0 ? Math.min(1, Math.max(0, opts.economia / opts.tetoEconomia)) : 0
  const custoN = opts.tetoEconomia > 0 ? Math.min(1, opts.custo / Math.max(opts.tetoEconomia, 1)) : 0
  const prazoN = Math.min(1, opts.prazoMeses / 24)
  return round2(
    40 * eco + 25 * opts.aderencia - 15 * custoN - 10 * opts.complexidade - 10 * prazoN,
  )
}

function avaliarCatalogo(
  perfil: PerfilConsultoria,
  triagem: TriagemConsultoria,
  sim: SimulacoesConsultoria,
): EstrategiaConsultoria[] {
  const gap = Math.max(0, sim.inventario.total - perfil.liquidos - perfil.capitalSegurado)
  const y1 = sim.holding?.anos[0]
  const ecoHolding = sim.holding?.economiaAnos ?? 0
  const custoHolding = sim.holding?.entrada.total ?? DEFAULT_SUCESSAO_HOLDING.custoAbertura
  const ecoDoacao = sim.holding?.sucessao.economiaSucessao ?? Math.max(0, sim.inventario.total * 0.4)
  const custoDoacao = sim.holding?.sucessao.doacao.imposto ?? 0
  const teto = Math.max(ecoHolding, ecoDoacao, sim.inventario.total, gap, 1)

  const temImovelOuEmpresa = perfil.imoveisAlugados > 0 || perfil.participacoes > 0
  const temFilhos = perfil.herdeiros > 0 || perfil.filhos.length > 0
  const holdingJa = triagem.holdingExistente === "Sim"
  const testamentoJa = triagem.testamento === "Sim"

  const itens: EstrategiaConsultoria[] = []

  const holdingElegivel = temImovelOuEmpresa && triagem.aceitaHolding !== false && !holdingJa
  itens.push({
    id: "holding_patrimonial",
    nome: "Holding patrimonial",
    plano: false,
    componentes: ["holding_patrimonial"],
    elegivel: holdingElegivel,
    score: 0,
    economia: ecoHolding,
    custo: custoHolding,
    paybackAnos: sim.holding && sim.holding.paybackDentro ? sim.holding.paybackAnos + sim.holding.paybackMeses / 12 : paybackAnos(y1?.economia ?? 0, custoHolding),
    prazo: "12 meses",
    complexidade: "alta",
    aderencia: triagem.aceitaHolding === false ? 0 : triagem.preocupacaoItcmd === "Alta" ? 1 : 0.7,
    pros: ["Carga da locação no lucro presumido", "Quotas em vez de matrícula na sucessão"],
    contras: ["ITBI e custo de estrutura", "IBS/CBS ainda em regulamentação"],
    preRequisitos: ["Mapa de imóveis e IRPF", "Contador e advogado de societário"],
    proximosPassos: ["Rodar o comparador Holding", "Definir integralização a custo ou a mercado"],
    roteiro: "holding_patrimonial",
    templates: ["contrato-social-holding", "minuta-holding-integralizacao-imoveis"],
    clausulas: ["objeto-social", "quotas-restricoes", "usufruto-vitalicio"],
  })

  const doacaoElegivel =
    temFilhos &&
    (perfil.imoveis > 0 || perfil.participacoes > 0) &&
    triagem.aceitaDoacao !== false &&
    triagem.usufruto !== "Sim"
  itens.push({
    id: "doacao_usufruto",
    nome: "Doação com reserva de usufruto",
    plano: false,
    componentes: ["doacao_usufruto"],
    elegivel: doacaoElegivel,
    score: 0,
    economia: ecoDoacao,
    custo: custoDoacao,
    paybackAnos: 0,
    prazo: "90 dias",
    complexidade: "media",
    aderencia: triagem.aceitaDoacao === false ? 0 : 0.8,
    pros: ["Antecipa a partilha", "Usufruto mantém renda e controle"],
    contras: ["ITCMD da doação agora", "Base da nua-propriedade varia por UF"],
    preRequisitos: ["Filhos capazes ou representação", "Caixa para o ITCMD da doação"],
    proximosPassos: ["Simular ITCMD da doação por herdeiro", "Minuta com cláusula de usufruto"],
    roteiro: "doacao_usufruto",
    templates: ["alteracao-contratual-doacao-quotas"],
    clausulas: ["usufruto-vitalicio", "incomunicabilidade", "dispensa-colacao"],
  })

  itens.push({
    id: "testamento",
    nome: "Testamento",
    plano: false,
    componentes: ["testamento"],
    elegivel: !testamentoJa,
    score: 0,
    economia: round2(sim.inventario.honorarios * 0.15),
    custo: 5_000,
    paybackAnos: 0,
    prazo: "imediato",
    complexidade: "baixa",
    aderencia: triagem.testamento === "Não" ? 1 : 0.3,
    pros: ["Barato e rápido", "Organiza a vocação e o testamenteiro"],
    contras: ["Não reduz o ITCMD sozinho", "Pode empurrar o inventário para o judicial"],
    preRequisitos: ["Capacidade civil", "Lista de bens e herdeiros"],
    proximosPassos: ["Agendar cartório ou advogado", "Alinhar com o regime de bens"],
    roteiro: "testamento",
    templates: ["checklist-planejamento-patrimonial"],
    clausulas: ["testamenteiro", "legado"],
  })

  const seguroElegivel = gap > 0 && triagem.aceitaSeguro !== false
  itens.push({
    id: "seguro_vida_liquidez",
    nome: "Seguro de vida para liquidez do inventário",
    plano: false,
    componentes: ["seguro_vida_liquidez"],
    elegivel: seguroElegivel,
    score: 0,
    economia: gap,
    custo: round2(gap * 0.008),
    paybackAnos: 0,
    prazo: "90 dias",
    complexidade: "baixa",
    aderencia: triagem.aceitaSeguro === false ? 0 : triagem.preocupacaoInventario === "Alta" ? 1 : 0.75,
    pros: ["Capital cai fora do inventário", "Paga ITCMD sem vender imóvel"],
    contras: ["Custo anual", "Não reduz o imposto, só o caixa"],
    preRequisitos: ["Saúde segurável", "Beneficiário alinhado aos herdeiros"],
    proximosPassos: ["Dimensionar capital = gap de liquidez", "Cotação de vida"],
    roteiro: null,
    templates: ["checklist-planejamento-patrimonial"],
    clausulas: [],
  })

  itens.push({
    id: "previdencia_vgbl_pgbl",
    nome: "Previdência VGBL/PGBL como instrumento sucessório",
    plano: false,
    componentes: ["previdencia_vgbl_pgbl"],
    elegivel:
      triagem.aceitaPrevidencia !== false &&
      (perfil.liquidos - perfil.euaUSD > 0 || perfil.previdenciaVGBL + perfil.previdenciaPGBL > 0),
    score: 0,
    economia: round2(Math.min(Math.max(0, perfil.liquidos - perfil.euaUSD), sim.inventario.itcmd)),
    custo: 0,
    paybackAnos: 0,
    prazo: "90 dias",
    complexidade: "baixa",
    aderencia: triagem.usoPGBL === "Não" ? 0.4 : 0.85,
    pros: ["VGBL em regra não entra no inventário", "PGBL pode deduzir na declaração completa"],
    contras: ["PGBL pode integrar o espólio", "Não substitui testamento nem holding"],
    preRequisitos: ["Definir VGBL vs. PGBL", "Beneficiários na apólice"],
    proximosPassos: ["Revisar tipo de plano no patrimônio", "Alinhar beneficiários"],
    roteiro: "previdencia_sucessoria",
    templates: ["checklist-planejamento-patrimonial"],
    clausulas: [],
  })

  itens.push({
    id: "acordo_socios",
    nome: "Acordo de sócios",
    plano: false,
    componentes: ["acordo_socios"],
    elegivel: perfil.participacoes > 0 && triagem.temAcordoSocios !== true,
    score: 0,
    economia: round2(perfil.participacoes * 0.2),
    custo: 8_000,
    paybackAnos: 0,
    prazo: "90 dias",
    complexidade: "media",
    aderencia: 0.8,
    pros: ["Trava entrada de herdeiro na gestão", "Define haveres e prazo"],
    contras: ["Exige consenso dos sócios", "Não resolve ITCMD do quinhão"],
    preRequisitos: ["Contrato social atual", "Demais sócios alinhados"],
    proximosPassos: ["Cláusula de sucessão e apuração de haveres", "Registrar na junta se couber"],
    roteiro: "acordo_socios",
    templates: ["alteracao-contratual-post-mortem"],
    clausulas: ["acordo-socios", "sucessao-socio", "apuracao-haveres"],
  })

  itens.push({
    id: "domicilio_fiscal",
    nome: "Planejamento de domicílio fiscal",
    plano: false,
    componentes: ["domicilio_fiscal"],
    elegivel: sim.espolio.porEstado.length > 1 || perfil.euaUSD > 0 || perfil.uf !== "SP",
    score: 0,
    economia: round2(sim.reforma.aumento * 0.3),
    custo: 20_000,
    paybackAnos: paybackAnos(sim.reforma.aumento * 0.3, 20_000),
    prazo: "12 meses",
    complexidade: "alta",
    aderencia: perfil.euaUSD > 0 ? 0.7 : 0.4,
    pros: ["Pode mudar a competência de bens móveis", "Organiza o mapa internacional"],
    contras: ["Domicílio fictício é contestável", "Imóvel continua no estado da situação"],
    preRequisitos: ["Residência efetiva", "Inventário de bens no exterior"],
    proximosPassos: ["Mapear UFs e situs", "Não mudar domicílio só no papel"],
    roteiro: null,
    templates: ["checklist-planejamento-patrimonial"],
    clausulas: [],
  })

  const jaEstruturado =
    testamentoJa &&
    (holdingJa || !temImovelOuEmpresa) &&
    gap <= 0 &&
    (triagem.temAcordoSocios === true || perfil.participacoes <= 0)
  itens.push({
    id: "manter",
    nome: "Manter como está",
    plano: false,
    componentes: ["manter"],
    elegivel: true,
    score: 0,
    economia: 0,
    custo: 0,
    paybackAnos: 0,
    prazo: "imediato",
    complexidade: "baixa",
    aderencia: jaEstruturado ? 1 : 0.15,
    pros: ["Zero custo de implementação", "Útil quando a casa já está em ordem"],
    contras: ["Congela o risco que o diagnóstico acabou de medir"],
    preRequisitos: ["Revisar o parecer a cada mudança patrimonial"],
    proximosPassos: ["Revisar anualmente ITCMD, seguros e beneficiários"],
    roteiro: null,
    templates: [],
    clausulas: [],
  })

  for (const e of itens) {
    const cx = e.complexidade === "alta" ? 1 : e.complexidade === "media" ? 0.5 : 0
    const prazoMeses = e.prazo === "imediato" ? 1 : e.prazo === "90 dias" ? 3 : 12
    e.score = e.elegivel
      ? scoreEstrategia({
          economia: e.economia,
          custo: e.custo,
          complexidade: cx,
          prazoMeses,
          aderencia: e.aderencia,
          tetoEconomia: teto,
        })
      : -100
  }

  const holding = itens.find((e) => e.id === "holding_patrimonial")
  const doacao = itens.find((e) => e.id === "doacao_usufruto")
  const seguro = itens.find((e) => e.id === "seguro_vida_liquidez")
  const absorvidos = new Set<IdEstrategia>()
  const planos: EstrategiaConsultoria[] = []

  if (holding?.elegivel && seguro?.elegivel) {
    const id: IdEstrategia = doacao?.elegivel ? "holding_doacao_seguro" : "holding_mais_seguro"
    const componentes: IdEstrategia[] = doacao?.elegivel
      ? ["holding_patrimonial", "doacao_usufruto", "seguro_vida_liquidez"]
      : ["holding_patrimonial", "seguro_vida_liquidez"]
    const economia = (holding.economia || 0) + (seguro.economia || 0) + (doacao?.elegivel ? doacao.economia : 0)
    const custo = (holding.custo || 0) + (seguro.custo || 0) + (doacao?.elegivel ? doacao.custo : 0)
    planos.push({
      id,
      nome: doacao?.elegivel
        ? "Plano: holding + doação com usufruto + seguro de liquidez"
        : "Plano: holding + seguro de liquidez",
      plano: true,
      componentes,
      elegivel: true,
      score: Math.max(holding.score, 0) + Math.max(seguro.score, 0) * 0.5 + (doacao?.elegivel ? 8 : 0),
      economia,
      custo,
      paybackAnos: paybackAnos(y1?.economia ?? holding.economia, custo),
      prazo: "12 meses",
      complexidade: "alta",
      aderencia: Math.min(1, ((holding.aderencia + seguro.aderencia) / 2)),
      pros: [...holding.pros, ...seguro.pros.slice(0, 1)],
      contras: [...holding.contras.slice(0, 1), "Exige coordenar advogado, contador e seguradora"],
      preRequisitos: [...holding.preRequisitos, "Capital de seguro = gap de liquidez"],
      proximosPassos: ["Constituir a holding", "Doar nua-propriedade se couber", "Contratar o seguro no valor do gap"],
      roteiro: "holding_patrimonial",
      templates: holding.templates,
      clausulas: holding.clausulas,
    })
    absorvidos.add("holding_patrimonial")
    absorvidos.add("seguro_vida_liquidez")
    if (doacao?.elegivel) absorvidos.add("doacao_usufruto")
  } else if (holding?.elegivel && doacao?.elegivel) {
    planos.push({
      id: "holding_mais_doacao",
      nome: "Plano: holding + doação com usufruto",
      plano: true,
      componentes: ["holding_patrimonial", "doacao_usufruto"],
      elegivel: true,
      score: holding.score + 6,
      economia: holding.economia + doacao.economia,
      custo: holding.custo + doacao.custo,
      paybackAnos: holding.paybackAnos,
      prazo: "12 meses",
      complexidade: "alta",
      aderencia: (holding.aderencia + doacao.aderencia) / 2,
      pros: [...holding.pros, ...doacao.pros.slice(0, 1)],
      contras: holding.contras,
      preRequisitos: [...holding.preRequisitos, ...doacao.preRequisitos.slice(0, 1)],
      proximosPassos: ["Constituir a holding", "Doar quotas com usufruto"],
      roteiro: "holding_patrimonial",
      templates: [...holding.templates, ...doacao.templates],
      clausulas: [...holding.clausulas, ...doacao.clausulas],
    })
    absorvidos.add("holding_patrimonial")
    absorvidos.add("doacao_usufruto")
  }

  const ranqueadas = [...planos, ...itens.filter((e) => e.elegivel && !absorvidos.has(e.id))].sort(
    (a, b) => b.score - a.score,
  )
  return ranqueadas
}

function montarPlanoAcao(ranqueadas: EstrategiaConsultoria[]): ItemAcao[] {
  const acoes: ItemAcao[] = []
  const top = ranqueadas.slice(0, 4)
  for (const e of top) {
    if (e.id === "manter" && top[0]?.id === "manter") {
      acoes.push({
        fase: "imediato",
        titulo: "Revisar beneficiários e o mapa de bens no próximo aniversário do plano",
        responsavel: "assessor",
        estrategiaId: "manter",
      })
      continue
    }
    if (e.id === "testamento" || e.prazo === "imediato") {
      acoes.push({
        fase: "imediato",
        titulo: e.proximosPassos[0] || e.nome,
        responsavel: e.id === "testamento" ? "advogado" : "cliente",
        estrategiaId: e.id,
      })
    } else if (e.prazo === "90 dias" || e.id === "seguro_vida_liquidez" || e.id === "acordo_socios") {
      acoes.push({
        fase: "90_dias",
        titulo: e.proximosPassos[0] || e.nome,
        responsavel: e.id === "seguro_vida_liquidez" ? "assessor" : "advogado",
        estrategiaId: e.id,
      })
    } else {
      acoes.push({
        fase: "12_meses",
        titulo: e.proximosPassos[0] || e.nome,
        responsavel: e.id.includes("holding") ? "contador" : "advogado",
        estrategiaId: e.id,
      })
    }
  }
  return acoes
}

function montarFiscal(perfil: PerfilConsultoria, sim: SimulacoesConsultoria): LeituraFiscal {
  const aluguelAnual = round2(perfil.aluguelMensal * 12)
  const irpfAluguelPF = irpfAluguelNaDeclaracao(Math.max(0, aluguelAnual - 0), perfil.outrosRendimentosAnuais)
  const federal = tributosLucroPresumidoLocacao(aluguelAnual)
  const custoHoldingAno = DEFAULT_SUCESSAO_HOLDING.custoMensal * 12
  const cargaHoldingAluguel = sim.holding?.anos[0]?.holdingCarga ?? round2(federal.totalFederal + custoHoldingAno)
  const lucroDistribuivel = Math.max(0, aluguelAnual - federal.totalFederal - custoHoldingAno)
  return {
    aluguelAnual,
    irpfAluguelPF: sim.holding?.anos[0]?.pfIrpf ?? irpfAluguelPF,
    cargaHoldingAluguel,
    economiaAluguelAno1: sim.holding?.anos[0]?.economia ?? round2(irpfAluguelPF - cargaHoldingAluguel),
    retencaoDividendos: retencaoDividendos(lucroDistribuivel),
    irpfm: calcularIrpfm(Math.max(perfil.rendaAnual, perfil.outrosRendimentosAnuais + aluguelAnual)),
  }
}

export function gerarParecer(
  plano: PlanoConsultoria,
  triagemEntrada: TriagemConsultoria = {},
  opts?: { agora?: Date },
): Parecer {
  const agora = opts?.agora ?? new Date()
  const q = plano.sucessao?.questionario
  const triagem = { ...triagemDoQuestionario(q as Record<string, unknown> | undefined), ...triagemEntrada }
  const perfil = montarPerfil(plano, agora)
  const lacunas = listarLacunas(plano, perfil, triagem)
  const simulacoes = montarSimulacoes(plano, perfil, triagem)
  const riscos = montarRiscos(perfil, triagem, simulacoes)
  const sinaisAtivos = diagnosticoSinaisAlerta(respostasDiagnostico(perfil, triagem, simulacoes.liquidez)).pontuacaoTotal
  const gapPct = simulacoes.inventario.total > 0 ? Math.min(20, (1 - Math.min(1, simulacoes.liquidez ?? 1)) * 20) : 0
  const score = Math.max(0, Math.min(100, round2(sinaisAtivos * 5 + gapPct + (simulacoes.estate ? 10 : 0) + Math.min(15, simulacoes.reforma.aumento / 100_000))))
  const ranqueadas = avaliarCatalogo(perfil, triagem, simulacoes)
  return {
    geradoEm: agora.toISOString(),
    perfil,
    lacunas,
    simulacoes,
    diagnostico: {
      score,
      nivel: nivelScore(score),
      riscos,
    },
    recomendacao: {
      ranqueadas,
      primeira: ranqueadas[0]?.id ?? null,
    },
    planoAcao: montarPlanoAcao(ranqueadas),
    fiscal: montarFiscal(perfil, simulacoes),
  }
}

export function pacoteConsultoria(parecer: Parecer, triagem: TriagemConsultoria): SucessaoConsultoria {
  return { geradoEm: parecer.geradoEm, triagem, parecer }
}

export function hidratarConsultoria(raw: unknown): SucessaoConsultoria | undefined {
  if (!raw || typeof raw !== "object") return undefined
  const c = raw as Record<string, unknown>
  if (!c.parecer || typeof c.parecer !== "object") return undefined
  const geradoEm = typeof c.geradoEm === "string" ? c.geradoEm : new Date().toISOString()
  const triagem = triagemDoQuestionario(c.triagem as Record<string, unknown> | undefined)
  return {
    geradoEm,
    triagem,
    parecer: c.parecer as Parecer,
    textoNarrativo: typeof c.textoNarrativo === "string" ? c.textoNarrativo : undefined,
    acoesConcluidas: Array.isArray(c.acoesConcluidas)
      ? c.acoesConcluidas.filter((x): x is string => typeof x === "string")
      : undefined,
  }
}

