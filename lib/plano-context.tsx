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
  rendimento: number
  inflacao: number
  prazo: number
  idadeApos: number
  retiradaMensal: number
  novaEntrada: number
  idadeEntrada: number
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

// ─── Estado inicial ───────────────────────────────────────────────────────────

const initialPL      = 200000
const initialAporteM = 20000

const initialPremissas: Premissas = {
  rendimento:     9,
  inflacao:       4,
  prazo:          70,
  idadeApos:      65,
  retiradaMensal: 31000,
  novaEntrada:    0,
  idadeEntrada:   0,
}

const initialState: PlanoState = {
  dadosPessoais: {
    nome:        "Guilherme e Mariana",
    conjuge:     "Mariana",
    profissao:   "Médico",
    nascimento:  "1995-07-02",
    estadoCivil: "Casado(a)",
    regime:      "Comunhão Parcial de Bens",
    filhos:      0,
    renda:       50000,
    despesa:     30000,
  },
  ativos: [
    { id: "1", tipo: "Líquido", descricao: "Aplicações BTG Pactual", instituicao: "BTG Pactual", valor: 200000 },
  ],
  passivos: [],
  objetivos: [
    { id: "1", descricao: "Aquisição de Imóvel", prazo: 5,  valor: 1500000, recorrente: false, aCada: 0 },
    { id: "2", descricao: "Viagens",              prazo: 0,  valor: 35000,   recorrente: true,  aCada: 1 },
    { id: "3", descricao: "Compra de Veículo",    prazo: 3,  valor: 80000,   recorrente: true,  aCada: 3 },
  ],
  premissas: initialPremissas,
  sucessao: {
    plEditavel:     200000,
    itcmd:          4,
    honorarios:     5,
    cartoriais:     2,
    herdeiros:      2,
    regimeSucessao: "Comunhão Parcial de Bens",
  },
  protecao: {
    custoVida:   30000,
    anosCob:     10,
    eduFilhos:   100000,
    dividasPend: 0,
  },
  projecao: calcularProjecao(
    { ...initialPremissas, saldoInicial: initialPL, aporteM: initialAporteM, idadeAtual: 29 },
    [
      { id: "1", descricao: "Aquisição de Imóvel", prazo: 5,  valor: 1500000, recorrente: false, aCada: 0 },
      { id: "2", descricao: "Viagens",              prazo: 0,  valor: 35000,   recorrente: true,  aCada: 1 },
      { id: "3", descricao: "Compra de Veículo",    prazo: 3,  valor: 80000,   recorrente: true,  aCada: 3 },
    ]
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
    if (!nasc) return 30
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
    setState(prev => ({ ...prev, ativos }))
  }, [])

  const setPassivos = useCallback((passivos: Passivo[]) => {
    setState(prev => ({ ...prev, passivos }))
  }, [])

  const setObjetivos = useCallback((objetivos: Objetivo[]) => {
    setState(prev => ({ ...prev, objetivos }))
  }, [])

  const setPremissas = useCallback((premissas: Partial<Premissas>) => {
    setState(prev => ({ ...prev, premissas: { ...prev.premissas, ...premissas } }))
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
      if (!nasc) return 30
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
      if (!nasc) return 30
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

    const inventario = calcularInventario(
      state.sucessao.plEditavel,
      state.sucessao.regimeSucessao,
      state.sucessao.herdeiros,
      state.sucessao.itcmd,
      state.sucessao.honorarios,
      state.sucessao.cartoriais
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
