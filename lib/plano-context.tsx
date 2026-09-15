"use client"

import React, { createContext, useContext, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase"
import {
  calcularProjecao,
  calcularKPIs,
  calcularInventario,
  calcularProtecao,
  type ProjecaoAno,
  type KPIs,
  type InventarioResult,
  type ProtecaoResult,
} from "@/lib/engine"
import {
  computePatrimonioTotals,
  computeTotaisAtivos,
  getPatrimonioTotalConsolidado as calcPatrimonioTotalConsolidado,
  getSaldoDevedorPassivo,
  normalizePassivo,
  normalizeAtivoRecord,
  normalizeAtivoTipo,
} from "@/lib/patrimonio-utils"
import { criarFluxoDeCaixaInicial, normalizarFluxoDeCaixa, type FluxoDeCaixaState, type FluxoMesRealizado } from "@/lib/fluxo-caixa-utils"
import {
  type FonteRenda,
  normalizarFontesRenda,
  receitaMensalAtual,
  aporteMensalAtual,
  resolveAporteParaPremissas,
  getFontesRenda,
  aporteMensalEm,
} from "@/lib/renda-utils"
import {
  type DespesaItem,
  normalizarDespesas,
  despesaMensalAtual,
  despesaMensalEm,
  getDespesas,
} from "@/lib/despesa-utils"
import { normalizarEntradasCapitais, type EntradaCapital } from "@/lib/entradas-capitais"
import {
  defaultProjecaoLivre,
  hidratarProjecaoLivre,
  type ProjecaoLivreState,
} from "@/lib/projecao-livre"

// ─── Interfaces ───────────────────────────────────────────────────────────────

export type { FonteRenda, TipoFonteRenda, PrazoFonteRenda } from "@/lib/renda-utils"
export type { DespesaItem, CategoriaDespesa } from "@/lib/despesa-utils"

export type ClasseInvestimento =
  | "Renda fixa"
  | "Multimercado"
  | "Ações"
  | "FIIs"
  | "Exterior"
  | "Alternativos"

export interface PerfilInvestidor {
  experiencia?: "Nenhuma" | "Iniciante" | "Intermediária" | "Avançada"
  toleranciaOscilacoes?: "Baixa" | "Moderada" | "Alta"
  reacaoPerdas?: "Resgata" | "Mantém posição" | "Aproveita para aportar"
  necessidadeLiquidez?: "Imediata" | "Curto prazo" | "Baixa / não relevante"
  horizontePredominante?: "Curto prazo" | "Médio prazo" | "Longo prazo"
  classesAceita: ClasseInvestimento[]
  classesEvitar: ClasseInvestimento[]
  perfil?: "Conservador" | "Moderado" | "Agressivo"
  grauDelegacao?:
    | "Delega 100%"
    | "Acompanha seus próprios investimentos"
    | "Delega porém gosta de acompanhar"
}

export interface DadosBanking {
  bancoPrincipal?: string
  instituicoesBancariasUtilizadas?: string
  cartoesEBeneficios?: string
}

export interface DadosPessoais {
  nome: string
  conjuge: string
  profissao: string
  nascimento: string
  estadoCivil: string
  regime: string
  filhos: Array<{ nome: string; dataNascimento: string }>
  /** Soma das fontes vigentes no mês corrente (derivado). */
  renda: number
  /** Soma das despesas vigentes no mês 0 (derivado). */
  despesa: number
  despesas?: DespesaItem[]
  fontesRenda?: FonteRenda[]
  /** Sexo para cotações (ex.: MAG API): M ou F */
  sexo?: "M" | "F" | ""
  /** Legado / formulários externos (ex.: Masculino, 1, 2) */
  genero?: string | number | ""
  /** UF (2 letras) para simulações de seguro */
  uf?: string
  /** CPF (só números) para simulações MAG */
  cpf?: string
  email?: string
  telefone?: string
  cidadeResidencia?: string
  estadoResidencia?: string
  dataNascimentoConjuge?: string
  profissaoConjuge?: string
  observacoesDinamicaFamiliar?: string
  perfilInvestidor?: PerfilInvestidor
  banking?: DadosBanking
}

export interface Ativo {
  id: string
  /** imobilizado | ativo_liquido | participacao_societaria | previdencia */
  tipo: string
  descricao: string
  instituicao?: string
  /** Nome da empresa — apenas participação societária. Ativos antigos podem não ter o campo. */
  empresa?: string
  /** Percentual de participação (0–100). Opcional; ativos antigos podem não ter o campo. */
  percentualParticipacao?: number
  valor: number
  subcategoria?: string
  localizacao?: string
  observacao?: string
  /** Quando false, o valor não entra no cálculo da reserva de emergência. Padrão: true. */
  reservaLiquidez?: boolean
  /**
   * Bem de herança — quando true, o valor entra na base de cálculo do ITCMD (aba Sucessório).
   * Persistido como `heranca` no estado; `bemDeHeranca` é alias de leitura/escrita na UI.
   */
  heranca?: boolean
  bemDeHeranca?: boolean
  regimeTributarioPrevidencia?: "Regressiva" | "Progressiva"
  tipoPlanoPrevidencia?: "PGBL" | "VGBL"
}

export interface Passivo {
  id: string
  categoria: string
  descricao: string
  saldoDevedor: number
  parcelaMensal: number
  taxaJurosMensal: number
  prazoRestanteMeses: number
  instituicao: string
  bemVinculado: string
  /** Legado: espelha `saldoDevedor` para compatibilidade com simulação antiga. */
  valor?: number
  tipo?: string
  modelo?: "SAC" | "PRICE" | "AMERICANA" | "OUTRO"
  taxa?: number
  prazo?: number
}

export interface Objetivo {
  id: string
  descricao: string
  /** Quando o objetivo começa (anos a partir de hoje). */
  prazoAnos: number
  valor: number
  recorrente: boolean
  /** Repetir a cada X anos (quando recorrente). */
  frequenciaAnos: number
  /** Janela de vigência da recorrência (a partir do prazo). */
  duracaoTipo: "total" | "personalizado"
  /** Só se `duracaoTipo` = "personalizado". */
  duracaoAnos: number
  observacoes: string
}

export interface Premissas {
  /** Rendimento líquido (% a.a.) usado nas simulações. Derivado de bruto e alíquota. */
  rendimento: number
  /** Rendimento bruto (% a.a.) informado pelo advisor. */
  rendimentoBruto: number
  /** Alíquota (0-1) aplicada sobre o rendimento para cálculo do líquido. Ex: 0.15 = 15%. */
  aliquotaImpostoRendimento: number
  inflacao: number
  prazo: number
  idadeApos: number
  retiradaMensal: number
  rendaAposentadoria: number
  /** @deprecated Preferir `entradasCapitais`. */
  novaEntrada: number
  /** @deprecated Preferir `entradasCapitais`. */
  idadeEntrada: number
  entradasCapitais: EntradaCapital[]
  /** Horizonte de aposentadoria (anos que o patrimônio precisa durar). Padrão 35. */
  horizonteAposentadoria?: number
  rentabilidadeConservador: number
  rentabilidadeModerado: number
  rentabilidadeAgressivo: number
  /** Opcional: aporte nominal por ano (modo períodos), alinhado ao motor de projeção. */
  aportePorAnoNominal?: number[]
  /** Modo de aporte mensal na simulação. */
  aporteModo: "fixo" | "periodos"
  /** Aporte mensal (em valor real de hoje) para cada bloco de 5 anos. */
  aportePeriodosReal: number[]
  /** Modo de rentabilidade na simulação patrimonial. */
  modoRentabilidade: "padrao" | "por_periodo" | "acumulacao_aposentadoria"
  /** Rentabilidade bruta (% a.a.) por bloco de 5 anos (modo por_periodo). */
  rendimentoPeriodosBruto: number[]
  /** Rentabilidade bruta na fase de acumulação (modo acumulacao_aposentadoria). */
  rendimentoAcumulacao: number
  /** Rentabilidade bruta na fase de aposentadoria (modo acumulacao_aposentadoria). */
  rendimentoAposentadoria: number
  /** Observações livres sobre aposentadoria (advisor/cliente). */
  observacaoAposentadoria?: string
}

export interface SeguroItem {
  id: string
  tipoSeguro: string
  capitalSegurado: number
  beneficiario: string
  observacao?: string
}

export interface Protecao {
  custoVida: number
  anosCob: number
  eduFilhos: number
  dividasPend: number
}

export interface QuestionarioSucessorio {
  modeloDeclaracaoIR?: "Completa" | "Simplificada" | "Não declara"
  usoPGBL?: "Sim, uso atualmente" | "Uso potencial" | "Não"
  bensNoExterior?: "Sim" | "Não"
  planejamentoSucessorioRealizado?: "Sim" | "Não" | "Em andamento"
  testamento?: "Sim" | "Não"
  holdingPatrimonialOuFamiliar?: "Sim" | "Não"
  doacoesJaRealizadas?: "Sim" | "Não"
  usufruto?: "Sim" | "Não"
  preocupacaoComInventario?: "Alta" | "Média" | "Baixa" | "Nenhuma"
  preocupacaoComITCMD?: "Alta" | "Média" | "Baixa" | "Nenhuma"
  observacoesSucessorio?: string
}

export type { EntradaCapital } from "@/lib/entradas-capitais"

export interface PatrimonioState {
  ativosLiquidos: number
  previdencia: number
  imobilizado: number
  participacoes: number
  passivos: number
}

export interface Sucessao {
  plEditavel: number
  itcmd: number
  honorarios: number
  cartoriais: number
  herdeiros: number
  regimeSucessao: string
  questionario?: QuestionarioSucessorio
}

export interface ComentariosConsultor {
  projecao?: string
  planoCompleto?: string
}

const COMENTARIOS_MAX = 2000

function hidratarComentariosConsultor(raw: unknown): ComentariosConsultor {
  if (!raw || typeof raw !== "object") return {}
  const r = raw as Record<string, unknown>
  const out: ComentariosConsultor = {}
  if (typeof r.projecao === "string") out.projecao = r.projecao.slice(0, COMENTARIOS_MAX)
  if (typeof r.planoCompleto === "string") out.planoCompleto = r.planoCompleto.slice(0, COMENTARIOS_MAX)
  return out
}

export interface PlanoState {
  moeda: "BRL" | "USD"
  dadosPessoais: DadosPessoais
  ativos: Ativo[]
  passivos: Passivo[]
  patrimonio: PatrimonioState
  objetivos: Objetivo[]
  premissas: Premissas
  sucessao: Sucessao
  protecao: Protecao
  seguros: SeguroItem[]
  fluxoDeCaixa: FluxoDeCaixaState
  projecao: ProjecaoAno[]
  /** Simulador isolado da seção Projeção Livre — nenhum outro cálculo lê esta chave. */
  projecaoLivre: ProjecaoLivreState
  kpis: KPIs | null
  inventario: InventarioResult | null
  protecaoResult: ProtecaoResult | null
  comentariosConsultor: ComentariosConsultor
}

export interface SimulacaoMeta {
  simulacaoId: string | null
  clienteId: string | null
  nomeSimulacao: string | null
  nomeCenario: string | null
  updatedAt: string | null
}

interface PlanoContextType {
  state: PlanoState
  simulacaoMeta: SimulacaoMeta
  setMoeda: (moeda: PlanoState["moeda"]) => void
  setSimulacaoMeta: (meta: Partial<SimulacaoMeta>) => void
  setDadosPessoais: (dados: Partial<DadosPessoais>) => void
  setFontesRenda: (fontes: FonteRenda[]) => void
  setDespesas: (despesas: DespesaItem[]) => void
  setAtivos: (ativos: Ativo[]) => void
  setPassivos: (passivos: Passivo[]) => void
  setPatrimonio: (patrimonio: Partial<PatrimonioState>) => void
  setObjetivos: (objetivos: Objetivo[]) => void
  setPremissas: (premissas: Partial<Premissas>) => void
  setSucessao: (sucessao: Partial<Sucessao>) => void
  setProtecao: (protecao: Partial<Protecao>) => void
  setSeguros: (seguros: SeguroItem[]) => void
  setFluxoDeCaixa: (fluxo: Partial<FluxoDeCaixaState>) => void
  setProjecaoLivre: (projecaoLivre: Partial<ProjecaoLivreState>) => void
  setComentariosConsultor: (comentarios: Partial<ComentariosConsultor>) => void
  /** Substitui o estado atual por um estado salvo (hidratando defaults) */
  loadState: (state: unknown, meta?: Partial<SimulacaoMeta>) => void
  /** Limpa meta de simulação (volta para "nova simulação") */
  clearSimulacaoMeta: () => void
  getPatrimonioLiquido: () => number
  /** Ativos Líquidos + Previdência — saldo inicial da simulação (sem passivos). */
  getSaldoInicialLiquido: () => number
  /** Soma ativos líquidos + previdência (sem passivos). */
  getAtivosFinanceiros: () => number
  /** Apenas ativos líquidos imediatos (sem previdência). */
  getAtivosLiquidosImediatos: () => number
  /** Todos os ativos − passivos (líquidos + imobilizado + participações). */
  getPatrimonioTotalConsolidado: () => number
  getAporteMensal: () => number
  getDespesaMensalEm: (mesSimulacao: number) => number
  getAporteMensalEm: (mesSimulacao: number) => number
  getIdadeAtual: () => number
  simulatePreview: () => void
  calcular: () => void
  /** Upsert em `public.clientes` (`id` = usuário, `dados` = estado completo em JSONB). */
  salvarPlano: () => Promise<{ error: string | null }>
}

// ─── Estado inicial (vazio — sem dados de exemplo) ───────────────────────────

const emptyPremissas: Premissas = {
  rendimento:     0,
  rendimentoBruto: 10,
  aliquotaImpostoRendimento: 0.15,
  inflacao:       0,
  prazo:          0,
  idadeApos:      0,
  retiradaMensal: 0,
  rendaAposentadoria: 0,
  novaEntrada:    0,
  idadeEntrada:   0,
  entradasCapitais: [],
  horizonteAposentadoria: 35,
  rentabilidadeConservador: 7,
  rentabilidadeModerado: 10,
  rentabilidadeAgressivo: 13,
  aporteModo: "fixo",
  aportePeriodosReal: [],
  modoRentabilidade: "padrao",
  rendimentoPeriodosBruto: [],
  rendimentoAcumulacao: 10,
  rendimentoAposentadoria: 10,
}

const defaultPremissas: Premissas = {
  rendimento: 10 * (1 - 0.15),
  rendimentoBruto: 10,
  aliquotaImpostoRendimento: 0.15,
  inflacao: 4,
  prazo: 50,
  idadeApos: 65,
  retiradaMensal: 0,
  rendaAposentadoria: 0,
  novaEntrada: 0,
  idadeEntrada: 0,
  entradasCapitais: [],
  horizonteAposentadoria: 35,
  rentabilidadeConservador: 7,
  rentabilidadeModerado: 10,
  rentabilidadeAgressivo: 13,
  aporteModo: "fixo",
  aportePeriodosReal: [],
  modoRentabilidade: "padrao",
  rendimentoPeriodosBruto: [],
  rendimentoAcumulacao: 10,
  rendimentoAposentadoria: 10,
}

const initialState: PlanoState = {
  moeda: "BRL",
  dadosPessoais: {
    nome:        "",
    conjuge:     "",
    profissao:   "",
    nascimento:  "",
    estadoCivil: "solteiro",
    regime:      "Comunhão Parcial de Bens",
    filhos:      [],
    renda:       0,
    despesa:     0,
    fontesRenda: [],
    sexo:        "M",
    genero:      "",
    uf:          "SP",
  },
  ativos: [],
  passivos: [],
  patrimonio: { ativosLiquidos: 0, previdencia: 0, imobilizado: 0, participacoes: 0, passivos: 0 },
  objetivos: [],
  premissas: defaultPremissas,
  sucessao: {
    plEditavel:     0,
    itcmd:          4,
    honorarios:     4,
    cartoriais:     2,
    herdeiros:      0,
    regimeSucessao: "",
  },
  protecao: {
    custoVida:   0,
    anosCob:     0,
    eduFilhos:   0,
    dividasPend: 0,
  },
  seguros: [],
  fluxoDeCaixa: criarFluxoDeCaixaInicial(),
  projecao: calcularProjecao(
    { ...defaultPremissas, saldoInicial: 0, aporteM: 0, idadeAtual: 0 },
    [],
    []
  ),
  projecaoLivre: defaultProjecaoLivre,
  kpis:           null,
  inventario:     null,
  protecaoResult: null,
  comentariosConsultor: {},
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PlanoContext = createContext<PlanoContextType | null>(null)

export function PlanoProvider({
  children,
  initial,
}: {
  children: React.ReactNode
  initial?: PlanoState
}) {
  const [state, setState] = useState<PlanoState>(initial ?? initialState)
  const [simulacaoMeta, setSimulacaoMeta] = useState<SimulacaoMeta>({
    simulacaoId: null,
    clienteId: null,
    nomeSimulacao: null,
    nomeCenario: null,
    updatedAt: null,
  })

  const hydrateState = useCallback((raw: any): PlanoState => {
    const merged: PlanoState = {
      ...initialState,
      ...(raw ?? {}),
      moeda: (raw?.moeda === "USD" ? "USD" : "BRL"),
      dadosPessoais: { ...initialState.dadosPessoais, ...(raw?.dadosPessoais ?? {}) },
      premissas: { ...initialState.premissas, ...(raw?.premissas ?? {}) },
      sucessao: { ...initialState.sucessao, ...(raw?.sucessao ?? {}) },
      protecao: { ...initialState.protecao, ...(raw?.protecao ?? {}) },
      seguros: Array.isArray(raw?.seguros) ? raw.seguros : [],
      ativos: Array.isArray(raw?.ativos) ? raw.ativos : [],
      passivos: Array.isArray(raw?.passivos) ? raw.passivos : [],
      patrimonio: {
        ativosLiquidos: 0,
        previdencia: 0,
        imobilizado: 0,
        participacoes: 0,
        passivos: 0,
      },
      objetivos: Array.isArray(raw?.objetivos) ? raw.objetivos : [],
      fluxoDeCaixa: normalizarFluxoDeCaixa(raw?.fluxoDeCaixa),
      projecao: Array.isArray(raw?.projecao) ? raw.projecao : initialState.projecao,
      projecaoLivre: hidratarProjecaoLivre(raw?.projecaoLivre),
      kpis: raw?.kpis ?? null,
      inventario: raw?.inventario ?? null,
      protecaoResult: raw?.protecaoResult ?? null,
      comentariosConsultor: hidratarComentariosConsultor(raw?.comentariosConsultor),
    }

    // Normaliza filhos (compatibilidade: modelos antigos tinham `filhos` como número)
    const rawFilhos = (merged.dadosPessoais as any)?.filhos
    if (typeof rawFilhos === "number") {
      merged.dadosPessoais.filhos = Array.from({ length: Math.max(0, rawFilhos) }, () => ({
        nome: "",
        dataNascimento: "",
      }))
    } else if (Array.isArray(rawFilhos)) {
      merged.dadosPessoais.filhos = rawFilhos.map((f: any) => ({
        nome: String(f?.nome ?? ""),
        dataNascimento: String(f?.dataNascimento ?? ""),
      }))
    } else {
      merged.dadosPessoais.filhos = []
    }

    const dp = merged.dadosPessoais
    if (dp.sexo !== "M" && dp.sexo !== "F") dp.sexo = "M"
    if (!dp.estadoCivil?.trim()) dp.estadoCivil = "solteiro"
    if (!dp.regime?.trim()) dp.regime = "Comunhão Parcial de Bens"
    if (!dp.uf?.trim()) dp.uf = "SP"

    dp.fontesRenda = normalizarFontesRenda(dp.fontesRenda, dp.renda)
    dp.renda = receitaMensalAtual(dp.fontesRenda)
    dp.despesas = normalizarDespesas(dp.despesas, dp.despesa)

    const rawPerfil = (raw?.dadosPessoais as any)?.perfilInvestidor
    if (rawPerfil && typeof rawPerfil === "object") {
      dp.perfilInvestidor = {
        ...rawPerfil,
        classesAceita: Array.isArray(rawPerfil.classesAceita) ? rawPerfil.classesAceita : [],
        classesEvitar: Array.isArray(rawPerfil.classesEvitar) ? rawPerfil.classesEvitar : [],
      }
    }
    const rawBanking = (raw?.dadosPessoais as any)?.banking
    dp.banking =
      rawBanking && typeof rawBanking === "object" ? { ...rawBanking } : undefined

    const rawQuestionario = (raw?.sucessao as any)?.questionario
    merged.sucessao.questionario =
      rawQuestionario && typeof rawQuestionario === "object" ? { ...rawQuestionario } : undefined

    merged.seguros = (Array.isArray(raw?.seguros) ? raw.seguros : []).map((s: any) => ({
      id: String(s?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      tipoSeguro: String(s?.tipoSeguro ?? ""),
      capitalSegurado: Number(s?.capitalSegurado) || 0,
      beneficiario: String(s?.beneficiario ?? ""),
      observacao: s?.observacao != null ? String(s.observacao) : undefined,
    }))
    dp.despesa = despesaMensalAtual(dp.despesas)

    if (merged.premissas.aporteModo !== "fixo" && merged.premissas.aporteModo !== "periodos") {
      merged.premissas.aporteModo = "fixo"
    }
    const modoRent = merged.premissas.modoRentabilidade
    if (
      modoRent !== "padrao" &&
      modoRent !== "por_periodo" &&
      modoRent !== "acumulacao_aposentadoria"
    ) {
      merged.premissas.modoRentabilidade = "padrao"
    }
    if (!Array.isArray(merged.premissas.rendimentoPeriodosBruto)) {
      merged.premissas.rendimentoPeriodosBruto = []
    }
    const brutoBase = Number(merged.premissas.rendimentoBruto) || 0
    if (merged.premissas.rendimentoAcumulacao == null) {
      merged.premissas.rendimentoAcumulacao = brutoBase
    }
    if (merged.premissas.rendimentoAposentadoria == null) {
      merged.premissas.rendimentoAposentadoria = brutoBase
    }

    // Normaliza objetivos (compatibilidade com modelos antigos: prazo/aCada)
    merged.objetivos = (merged.objetivos ?? []).map((o: any) => {
      const prazoAnos = Number(o?.prazoAnos ?? o?.prazo) || 0
      const recorrente = Boolean(o?.recorrente)
      const frequenciaAnos = recorrente ? (Number(o?.frequenciaAnos ?? o?.aCada) || 1) : 0
      const duracaoTipo = (o?.duracaoTipo === "personalizado" ? "personalizado" : "total") as
        | "total"
        | "personalizado"
      const duracaoAnos = duracaoTipo === "personalizado" ? (Number(o?.duracaoAnos) || 1) : 0
      const observacoes = String(o?.observacoes ?? "").trim()
      return {
        ...o,
        prazoAnos,
        recorrente,
        frequenciaAnos,
        duracaoTipo,
        duracaoAnos,
        observacoes,
      }
    })

    merged.ativos = (merged.ativos ?? []).map((a: Ativo) => normalizeAtivoRecord(a))

    const rawPat = (raw?.patrimonio ?? {}) as Partial<PatrimonioState> & { participacoes?: number }
    const participacoesLegado = Number(rawPat.participacoes) || 0
    const temAtivosParticipacao = (merged.ativos ?? []).some(
      (a) => normalizeAtivoTipo(a.tipo, a.descricao) === "participacao_societaria",
    )
    if (participacoesLegado > 0 && !temAtivosParticipacao) {
      merged.ativos = [
        ...merged.ativos,
        {
          id: `mig-part-${Date.now()}`,
          tipo: "participacao_societaria",
          descricao: "Outros",
          instituicao: "",
          valor: participacoesLegado,
          heranca: false,
        },
      ]
    }

    merged.passivos = (merged.passivos ?? []).map((p: any) => normalizePassivo(p))

    merged.patrimonio = computePatrimonioTotals(merged.ativos, merged.passivos)

    // Normaliza rendimento líquido derivado
    const bruto = Number(merged.premissas.rendimentoBruto) || 0
    const aliq = Number(merged.premissas.aliquotaImpostoRendimento) || 0
    merged.premissas.rendimento = Math.max(0, bruto * (1 - Math.max(0, Math.min(1, aliq))))

    merged.premissas.entradasCapitais = normalizarEntradasCapitais(merged.premissas)
    if (merged.premissas.entradasCapitais.length > 0) {
      merged.premissas.novaEntrada = 0
      merged.premissas.idadeEntrada = 0
    }

    return merged
  }, [])

  // ── Helpers derivados ──────────────────────────────────────────────────────

  const getAtivosLiquidosImediatos = useCallback(() => {
    return computeTotaisAtivos(state.ativos ?? []).totalAtivoLiquido
  }, [state.ativos])

  const getAtivosFinanceiros = useCallback(() => {
    return computeTotaisAtivos(state.ativos ?? []).totalAtivosFinanceiros
  }, [state.ativos])

  const getSaldoInicialLiquido = useCallback(() => {
    return getAtivosFinanceiros()
  }, [getAtivosFinanceiros])

  const getTotalPassivos = useCallback(() => {
    return (state.passivos ?? []).reduce((s, p) => s + getSaldoDevedorPassivo(p), 0)
  }, [state.passivos])

  const getPatrimonioLiquido = useCallback(() => {
    // Projeção / proteção: ativos líquidos + previdência − passivos
    const { totalAtivosFinanceiros } = computeTotaisAtivos(state.ativos ?? [])
    const totalPassivos = (state.passivos ?? []).reduce((s, p) => s + getSaldoDevedorPassivo(p), 0)
    return totalAtivosFinanceiros - totalPassivos
  }, [state.ativos, state.passivos])

  const getPatrimonioTotalConsolidado = useCallback(() => {
    return calcPatrimonioTotalConsolidado(state.ativos ?? [], state.passivos ?? [])
  }, [state.ativos, state.passivos])

  const getAporteMensal = useCallback(() => {
    const fontes = getFontesRenda(state.dadosPessoais)
    const despesas = getDespesas(state.dadosPessoais)
    return aporteMensalAtual(fontes, despesas)
  }, [state.dadosPessoais])

  const getDespesaMensalEm = useCallback(
    (mesSimulacao: number) => despesaMensalEm(getDespesas(state.dadosPessoais), mesSimulacao),
    [state.dadosPessoais],
  )

  const getAporteMensalEm = useCallback(
    (mesSimulacao: number) => {
      const fontes = getFontesRenda(state.dadosPessoais)
      const despesas = getDespesas(state.dadosPessoais)
      return aporteMensalEm(fontes, despesas, mesSimulacao)
    },
    [state.dadosPessoais],
  )

  const getIdadeAtual = useCallback(() => {
    const nasc = state.dadosPessoais.nascimento
    if (!nasc) return 0
    const nascDate = new Date(nasc)
    const hoje     = new Date()
    let idade      = hoje.getFullYear() - nascDate.getFullYear()
    const m        = hoje.getMonth() - nascDate.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nascDate.getDate())) idade--
    return Math.max(0, idade)
  }, [state.dadosPessoais.nascimento])

  // ── Setters ────────────────────────────────────────────────────────────────

  const setMoeda = useCallback((moeda: PlanoState["moeda"]) => {
    setState(prev => ({ ...prev, moeda }))
  }, [])

  const setDadosPessoais = useCallback((dados: Partial<DadosPessoais>) => {
    setState((prev) => {
      const next = { ...prev.dadosPessoais, ...dados }
      if (dados.fontesRenda) {
        next.fontesRenda = dados.fontesRenda
        next.renda = receitaMensalAtual(next.fontesRenda)
      }
      if (dados.despesas) {
        next.despesas = dados.despesas
        next.despesa = despesaMensalAtual(next.despesas)
      }
      return { ...prev, dadosPessoais: next }
    })
  }, [])

  const setFontesRenda = useCallback((fontesRenda: FonteRenda[]) => {
    setDadosPessoais({
      fontesRenda,
      renda: receitaMensalAtual(fontesRenda),
    })
  }, [setDadosPessoais])

  const setDespesas = useCallback((despesas: DespesaItem[]) => {
    setDadosPessoais({
      despesas,
      despesa: despesaMensalAtual(despesas),
    })
  }, [setDadosPessoais])

  const setAtivos = useCallback((ativos: Ativo[]) => {
    setState(prev => {
      const normalized = ativos.map((a) => {
        const bem = a.heranca === true || a.bemDeHeranca === true
        return normalizeAtivoRecord({ ...a, heranca: bem, bemDeHeranca: bem })
      })
      return {
        ...prev,
        ativos: normalized,
        patrimonio: computePatrimonioTotals(normalized, prev.passivos),
      }
    })
  }, [])

  const setPassivos = useCallback((passivos: Passivo[]) => {
    const normalized = (passivos ?? []).map((p) => normalizePassivo(p))
    setState((prev) => ({
      ...prev,
      passivos: normalized,
      patrimonio: computePatrimonioTotals(prev.ativos, normalized),
    }))
  }, [])

  const setPatrimonio = useCallback((patrimonio: Partial<PatrimonioState>) => {
    setState(prev => ({
      ...prev,
      patrimonio: { ...prev.patrimonio, ...patrimonio },
    }))
  }, [])

  const setObjetivos = useCallback((objetivos: Objetivo[]) => {
    setState(prev => ({ ...prev, objetivos }))
  }, [])

  const setPremissas = useCallback((premissas: Partial<Premissas>) => {
    setState(prev => {
      const merged = { ...prev.premissas, ...premissas }
      const bruto = Number(merged.rendimentoBruto) || 0
      const aliq = Number(merged.aliquotaImpostoRendimento) || 0
      const liquido = Math.max(0, bruto * (1 - Math.max(0, Math.min(1, aliq))))
      return { ...prev, premissas: { ...merged, rendimento: liquido } }
    })
  }, [])

  const setSucessao = useCallback((sucessao: Partial<Sucessao>) => {
    setState(prev => ({ ...prev, sucessao: { ...prev.sucessao, ...sucessao } }))
  }, [])

  const setProtecao = useCallback((protecao: Partial<Protecao>) => {
    setState(prev => ({ ...prev, protecao: { ...prev.protecao, ...protecao } }))
  }, [])

  const setSeguros = useCallback((seguros: SeguroItem[]) => {
    setState((prev) => ({ ...prev, seguros }))
  }, [])

  const setFluxoDeCaixa = useCallback((fluxo: Partial<FluxoDeCaixaState>) => {
    setState((prev) => ({
      ...prev,
      fluxoDeCaixa: { ...prev.fluxoDeCaixa, ...fluxo },
    }))
  }, [])

  const setProjecaoLivre = useCallback((projecaoLivre: Partial<ProjecaoLivreState>) => {
    setState((prev) => ({
      ...prev,
      projecaoLivre: hidratarProjecaoLivre({ ...prev.projecaoLivre, ...projecaoLivre }),
    }))
  }, [])

  const setComentariosConsultor = useCallback((comentarios: Partial<ComentariosConsultor>) => {
    setState((prev) => ({
      ...prev,
      comentariosConsultor: hidratarComentariosConsultor({
        ...prev.comentariosConsultor,
        ...comentarios,
      }),
    }))
  }, [])

  const loadState = useCallback((raw: unknown, meta?: Partial<SimulacaoMeta>) => {
    setState(hydrateState(raw))
    if (meta) {
      // Usar !== undefined para respeitar `null` vindo do Supabase (ex.: cliente_id ainda não vinculado).
      setSimulacaoMeta((prev) => ({
        simulacaoId: meta.simulacaoId !== undefined ? meta.simulacaoId : prev.simulacaoId,
        clienteId: meta.clienteId !== undefined ? meta.clienteId : prev.clienteId,
        nomeSimulacao: meta.nomeSimulacao !== undefined ? meta.nomeSimulacao : prev.nomeSimulacao,
        nomeCenario: meta.nomeCenario !== undefined ? meta.nomeCenario : prev.nomeCenario,
        updatedAt: meta.updatedAt !== undefined ? meta.updatedAt : prev.updatedAt,
      }))
    }
  }, [hydrateState])

  const clearSimulacaoMeta = useCallback(() => {
    setSimulacaoMeta({
      simulacaoId: null,
      clienteId: null,
      nomeSimulacao: null,
      nomeCenario: null,
      updatedAt: null,
    })
  }, [])

  const setSimulacaoMetaPartial = useCallback((meta: Partial<SimulacaoMeta>) => {
    setSimulacaoMeta((prev) => ({ ...prev, ...meta }))
  }, [])

  // ── Cálculos ───────────────────────────────────────────────────────────────

  const simulatePreview = useCallback(() => {
    const saldoInicial = getSaldoInicialLiquido()
    const idadeAtual = getIdadeAtual()
    const fontes = getFontesRenda(state.dadosPessoais)
    const despesas = getDespesas(state.dadosPessoais)
    const { aporteM, aportePorAnoNominal } = resolveAporteParaPremissas(
      fontes,
      despesas,
      { ...state.premissas, idadeAtual },
    )

    const projecao = calcularProjecao(
      {
        ...state.premissas,
        saldoInicial,
        aporteM,
        idadeAtual,
        aportePorAnoNominal,
      },
      state.objetivos,
      state.passivos,
    )
    setState((prev) => ({ ...prev, projecao }))
  }, [state.premissas, state.objetivos, state.passivos, state.dadosPessoais, getSaldoInicialLiquido, getIdadeAtual])

  const calcular = useCallback(() => {
    const saldoInicial = getSaldoInicialLiquido()
    const idadeAtual = getIdadeAtual()
    const fontes = getFontesRenda(state.dadosPessoais)
    const despesas = getDespesas(state.dadosPessoais)
    const { aporteM, aportePorAnoNominal } = resolveAporteParaPremissas(
      fontes,
      despesas,
      { ...state.premissas, idadeAtual },
    )

    const premissasCompletas = {
      ...state.premissas,
      saldoInicial,
      aporteM,
      idadeAtual,
      aportePorAnoNominal,
    }

    const projecao = calcularProjecao(premissasCompletas, state.objetivos, state.passivos)

    const kpis = calcularKPIs(
      projecao,
      premissasCompletas,
      receitaMensalAtual(fontes),
      state.dadosPessoais.despesa,
      state.objetivos,
    )

    const totalPassivosInv = state.passivos.reduce((s, p) => s + getSaldoDevedorPassivo(p), 0)
    const patrimonioTotalConsolidado = calcPatrimonioTotalConsolidado(state.ativos, state.passivos)
    const plInventario =
      state.sucessao.plEditavel > 0 ? state.sucessao.plEditavel : patrimonioTotalConsolidado
    const regimeInventario =
      state.sucessao.regimeSucessao ||
      state.dadosPessoais.regime ||
      "Comunhão Parcial de Bens"
    const inventario = calcularInventario(
      plInventario,
      regimeInventario,
      state.sucessao.herdeiros,
      state.sucessao.itcmd,
      state.sucessao.honorarios,
      state.sucessao.cartoriais,
      state.ativos,
      totalPassivosInv
    )

    const protecaoResult = calcularProtecao(
      state.protecao.custoVida,
      state.protecao.anosCob,
      state.protecao.eduFilhos,
      state.protecao.dividasPend,
      getPatrimonioLiquido(),
      state.premissas.rendimento
    )

    setState(prev => ({ ...prev, projecao, kpis, inventario, protecaoResult }))
  }, [state, getSaldoInicialLiquido, getPatrimonioLiquido, getIdadeAtual])

  const salvarPlano = useCallback(async (): Promise<{ error: string | null }> => {
    try {
      const supabase = createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        return { error: "Sessão inválida. Faça login novamente." }
      }

      const { error } = await (supabase as unknown as import("@supabase/supabase-js").SupabaseClient)
        .from("clientes")
        .upsert(
          {
            id: user.id,
            dados: state,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )

      if (error) return { error: error.message }
      return { error: null }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao salvar o plano."
      return { error: msg }
    }
  }, [state])

  return (
    <PlanoContext.Provider value={{
      state,
      simulacaoMeta,
      setMoeda,
      setSimulacaoMeta: setSimulacaoMetaPartial,
      setDadosPessoais, setFontesRenda, setDespesas, setAtivos, setPassivos, setPatrimonio, setObjetivos,
      setPremissas, setSucessao, setProtecao, setSeguros, setFluxoDeCaixa, setProjecaoLivre, setComentariosConsultor,
      loadState, clearSimulacaoMeta,
      getPatrimonioLiquido, getSaldoInicialLiquido, getAtivosFinanceiros, getAtivosLiquidosImediatos,
      getPatrimonioTotalConsolidado, getAporteMensal, getDespesaMensalEm, getAporteMensalEm, getIdadeAtual,
      simulatePreview, calcular, salvarPlano,
    }}>
      {children}
    </PlanoContext.Provider>
  )
}

export function usePlano() {
  const ctx = useContext(PlanoContext)
  if (!ctx) throw new Error("usePlano must be used within PlanoProvider")
  return ctx
}
