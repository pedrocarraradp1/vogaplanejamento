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

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface DadosPessoais {
  nome: string
  conjuge: string
  profissao: string
  nascimento: string
  estadoCivil: string
  regime: string
  filhos: number
  renda: number
  despesa: number
}

export interface Ativo {
  id: string
  tipo: string
  descricao: string
  instituicao: string
  valor: number
  /** Se true, o bem vai direto à herança (sem incidir na meação nos regimes parcial/aquestos). Padrão false. */
  heranca?: boolean
}

export interface Passivo {
  id: string
  tipo: string
  modelo: "SAC" | "PRICE" | "AMERICANA"
  descricao: string
  valor: number
  taxa: number
  prazo: number
}

export interface Objetivo {
  id: string
  descricao: string
  prazo: number
  valor: number
  recorrente: boolean
  aCada: number
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
  novaEntrada: number
  idadeEntrada: number
  rentabilidadeConservador: number
  rentabilidadeModerado: number
  rentabilidadeAgressivo: number
  /** Modo de aporte mensal na simulação. */
  aporteModo: "fixo" | "periodos"
  /** Aporte mensal (em valor real de hoje) para cada bloco de 5 anos. */
  aportePeriodosReal: number[]
}

export interface Sucessao {
  plEditavel: number
  itcmd: number
  honorarios: number
  cartoriais: number
  herdeiros: number
  regimeSucessao: string
}

export interface Protecao {
  custoVida: number
  anosCob: number
  eduFilhos: number
  dividasPend: number
}

export interface PlanoState {
  dadosPessoais: DadosPessoais
  ativos: Ativo[]
  passivos: Passivo[]
  objetivos: Objetivo[]
  premissas: Premissas
  sucessao: Sucessao
  protecao: Protecao
  projecao: ProjecaoAno[]
  kpis: KPIs | null
  inventario: InventarioResult | null
  protecaoResult: ProtecaoResult | null
}

interface PlanoContextType {
  state: PlanoState
  setDadosPessoais: (dados: Partial<DadosPessoais>) => void
  setAtivos: (ativos: Ativo[]) => void
  setPassivos: (passivos: Passivo[]) => void
  setObjetivos: (objetivos: Objetivo[]) => void
  setPremissas: (premissas: Partial<Premissas>) => void
  setSucessao: (sucessao: Partial<Sucessao>) => void
  setProtecao: (protecao: Partial<Protecao>) => void
  getPatrimonioLiquido: () => number
  getAporteMensal: () => number
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
  rentabilidadeConservador: 7,
  rentabilidadeModerado: 10,
  rentabilidadeAgressivo: 13,
  aporteModo: "fixo",
  aportePeriodosReal: [],
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
  rentabilidadeConservador: 7,
  rentabilidadeModerado: 10,
  rentabilidadeAgressivo: 13,
  aporteModo: "fixo",
  aportePeriodosReal: [],
}

const initialState: PlanoState = {
  dadosPessoais: {
    nome:        "",
    conjuge:     "",
    profissao:   "",
    nascimento:  "",
    estadoCivil: "",
    regime:      "",
    filhos:      0,
    renda:       0,
    despesa:     0,
  },
  ativos: [],
  passivos: [],
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
  projecao: calcularProjecao(
    { ...defaultPremissas, saldoInicial: 0, aporteM: 0, idadeAtual: 0 },
    [],
    []
  ),
  kpis:           null,
  inventario:     null,
  protecaoResult: null,
}

// ─── Context ──────────────────────────────────────────────────────────────────

const PlanoContext = createContext<PlanoContextType | null>(null)

export function PlanoProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlanoState>(initialState)

  // ── Helpers derivados ──────────────────────────────────────────────────────

  const getPatrimonioLiquido = useCallback(() => {
    const ta = state.ativos
    .filter(a => a.tipo === "Líquido")
    .reduce((s, a) => s + (a.valor || 0), 0)
    const tp = state.passivos.reduce((s, p) => s + (p.valor || 0), 0)
    return ta - tp
  }, [state.ativos, state.passivos])

  const getAporteMensal = useCallback(() => {
    return Math.max(0, state.dadosPessoais.renda - state.dadosPessoais.despesa)
  }, [state.dadosPessoais.renda, state.dadosPessoais.despesa])

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

  const setDadosPessoais = useCallback((dados: Partial<DadosPessoais>) => {
    setState(prev => ({ ...prev, dadosPessoais: { ...prev.dadosPessoais, ...dados } }))
  }, [])

  const setAtivos = useCallback((ativos: Ativo[]) => {
    setState(prev => ({
      ...prev,
      ativos: ativos.map(a => ({ ...a, heranca: a.heranca === true })),
    }))
  }, [])

  const setPassivos = useCallback((passivos: Passivo[]) => {
    setState(prev => ({ ...prev, passivos }))
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

  // ── Cálculos ───────────────────────────────────────────────────────────────

  const simulatePreview = useCallback(() => {
    const saldoInicial = state.ativos.reduce((s, a) => s + (a.valor || 0), 0)
                       - state.passivos.reduce((s, p) => s + (p.valor || 0), 0)
    const aporteM    = Math.max(0, state.dadosPessoais.renda - state.dadosPessoais.despesa)
    const idadeAtual = (() => {
      const nasc = state.dadosPessoais.nascimento
      if (!nasc) return 0
      const nascDate = new Date(nasc)
      const hoje     = new Date()
      let idade      = hoje.getFullYear() - nascDate.getFullYear()
      const m        = hoje.getMonth() - nascDate.getMonth()
      if (m < 0 || (m === 0 && hoje.getDate() < nascDate.getDate())) idade--
      return Math.max(0, idade)
    })()

    const projecao = calcularProjecao(
      { ...state.premissas, saldoInicial, aporteM, idadeAtual },
      state.objetivos,
      state.passivos
    )
    setState(prev => ({ ...prev, projecao }))
  }, [state.premissas, state.objetivos, state.ativos, state.passivos, state.dadosPessoais])

  const calcular = useCallback(() => {
    const saldoInicial = state.ativos.reduce((s, a) => s + (a.valor || 0), 0)
                       - state.passivos.reduce((s, p) => s + (p.valor || 0), 0)
    const aporteM    = Math.max(0, state.dadosPessoais.renda - state.dadosPessoais.despesa)
    const idadeAtual = (() => {
      const nasc = state.dadosPessoais.nascimento
      if (!nasc) return 0
      const nascDate = new Date(nasc)
      const hoje     = new Date()
      let idade      = hoje.getFullYear() - nascDate.getFullYear()
      const m        = hoje.getMonth() - nascDate.getMonth()
      if (m < 0 || (m === 0 && hoje.getDate() < nascDate.getDate())) idade--
      return Math.max(0, idade)
    })()

    const premissasCompletas = { ...state.premissas, saldoInicial, aporteM, idadeAtual }

    const projecao = calcularProjecao(
      premissasCompletas,
      state.objetivos,
      state.passivos
    )

    const kpis = calcularKPIs(
      projecao,
      premissasCompletas,
      state.dadosPessoais.renda,
      state.dadosPessoais.despesa
    )

    const totalPassivosInv = state.passivos.reduce((s, p) => s + (p.valor || 0), 0)
    const plInventario =
      state.sucessao.plEditavel > 0 ? state.sucessao.plEditavel : saldoInicial
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
      saldoInicial,
      state.premissas.rendimento
    )

    setState(prev => ({ ...prev, projecao, kpis, inventario, protecaoResult }))
  }, [state])

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
      setDadosPessoais, setAtivos, setPassivos, setObjetivos,
      setPremissas, setSucessao, setProtecao,
      getPatrimonioLiquido, getAporteMensal, getIdadeAtual,
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
