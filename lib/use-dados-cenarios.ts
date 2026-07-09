"use client"

import { useMemo } from "react"
import { usePlano } from "@/lib/plano-context"
import { getFontesRenda, resolveAporteParaPremissas } from "@/lib/renda-utils"
import { calcularProjecao, type ProjecaoAno } from "@/lib/engine"

export function useDadosCenarios() {
  const { state, getSaldoInicialLiquido } = usePlano()
  const { premissas, objetivos, dadosPessoais, passivos } = state
  const moeda = state.moeda ?? "BRL"

  const cenarioConservador = premissas.rentabilidadeConservador ?? 7
  const cenarioModerado = premissas.rentabilidadeModerado ?? 10
  const cenarioAgressivo = premissas.rentabilidadeAgressivo ?? 13

  const aliquotaIR = Math.max(0, Math.min(1, Number(premissas.aliquotaImpostoRendimento) || 0.15))
  const inflacaoGlobal = Number(premissas.inflacao) || 0

  const rentabilidadeLiquidaDeBruta = (bruta: number) =>
    Math.max(0, (Number(bruta) || 0) * (1 - aliquotaIR))

  const saldoInicialCalculado = useMemo(
    () => getSaldoInicialLiquido(),
    [getSaldoInicialLiquido],
  )

  const idadeAtualCalculada = useMemo(() => {
    if (!dadosPessoais.nascimento) return 0
    const hoje = new Date()
    const nascimento = new Date(dadosPessoais.nascimento)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const m = hoje.getMonth() - nascimento.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--
    return Math.max(0, idade)
  }, [dadosPessoais.nascimento])

  const fontesRenda = useMemo(() => getFontesRenda(dadosPessoais), [dadosPessoais])
  const blocosAporte = useMemo(() => {
    const prazo = Math.max(0, Number(premissas.prazo) || 0)
    const blocos = Math.max(1, Math.ceil(prazo / 5))
    return Array.from({ length: blocos }, (_, i) => {
      const inicio = i * 5
      const fim = Math.min((i + 1) * 5, prazo)
      return { i, inicio, fim }
    })
  }, [premissas.prazo])

  const { aporteM: aporteMensal, aportePorAnoNominal } = useMemo(
    () => resolveAporteParaPremissas(fontesRenda, dadosPessoais.despesa, premissas, blocosAporte),
    [fontesRenda, dadosPessoais.despesa, premissas, blocosAporte],
  )

  const premissasCompletas = useMemo(
    () => ({
      ...premissas,
      saldoInicial: saldoInicialCalculado,
      aporteM: aporteMensal,
      aportePorAnoNominal,
      idadeAtual: idadeAtualCalculada,
    }),
    [premissas, saldoInicialCalculado, aporteMensal, aportePorAnoNominal, idadeAtualCalculada],
  )

  const objetivosEngine = useMemo(
    () =>
      objetivos.map((obj) => ({
        id: obj.id,
        descricao: obj.descricao,
        prazoAnos: obj.prazoAnos,
        valor: obj.valor,
        recorrente: obj.recorrente,
        frequenciaAnos: obj.frequenciaAnos,
        duracaoTipo: obj.duracaoTipo,
        duracaoAnos: obj.duracaoAnos,
      })),
    [objetivos],
  )

  const projecaoConservadora = useMemo(
    () =>
      calcularProjecao(
        { ...premissasCompletas, rendimento: rentabilidadeLiquidaDeBruta(cenarioConservador) },
        objetivosEngine,
        passivos,
      ),
    [premissasCompletas, objetivosEngine, passivos, cenarioConservador, aliquotaIR],
  )

  const projecaoModerada = useMemo(
    () =>
      calcularProjecao(
        { ...premissasCompletas, rendimento: rentabilidadeLiquidaDeBruta(cenarioModerado) },
        objetivosEngine,
        passivos,
      ),
    [premissasCompletas, objetivosEngine, passivos, cenarioModerado, aliquotaIR],
  )

  const projecaoAgressiva = useMemo(
    () =>
      calcularProjecao(
        { ...premissasCompletas, rendimento: rentabilidadeLiquidaDeBruta(cenarioAgressivo) },
        objetivosEngine,
        passivos,
      ),
    [premissasCompletas, objetivosEngine, passivos, cenarioAgressivo, aliquotaIR],
  )

  const fmtFull = (v: number) =>
    new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: moeda === "USD" ? "USD" : "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v)

  const formatarMoeda = (valor: number) => {
    const prefix = moeda === "USD" ? "US$ " : "R$ "
    if (Math.abs(valor) >= 1_000_000) return `${prefix}${(valor / 1_000_000).toFixed(1)}M`
    if (Math.abs(valor) >= 1_000) return `${prefix}${(valor / 1_000).toFixed(0)}K`
    return `${prefix}${valor.toFixed(0)}`
  }

  return {
    premissas,
    passivos,
    moeda,
    cenarioConservador,
    cenarioModerado,
    cenarioAgressivo,
    aliquotaIR,
    inflacaoGlobal,
    idadeAtualCalculada,
    premissasCompletas,
    objetivosEngine,
    projecaoConservadora,
    projecaoModerada,
    projecaoAgressiva,
    rentabilidadeLiquidaDeBruta,
    fmtFull,
    formatarMoeda,
  }
}

export type DadosCenarios = ReturnType<typeof useDadosCenarios>

export type LinhaCenarios = {
  idade: number
  conservador: number
  moderado: number
  agressivo: number
}

export function buildDadosLinhaCenarios(
  projecaoConservadora: ProjecaoAno[],
  projecaoModerada: ProjecaoAno[],
  projecaoAgressiva: ProjecaoAno[],
): LinhaCenarios[] {
  const byIdade = new Map<number, LinhaCenarios>()
  const push = (idade: number, key: keyof Omit<LinhaCenarios, "idade">, value: number) => {
    const row = byIdade.get(idade) ?? { idade, conservador: 0, moderado: 0, agressivo: 0 }
    row[key] = value
    byIdade.set(idade, row)
  }

  for (const ano of projecaoConservadora) push(ano.idade, "conservador", Number(ano.saldoNominal) || 0)
  for (const ano of projecaoModerada) push(ano.idade, "moderado", Number(ano.saldoNominal) || 0)
  for (const ano of projecaoAgressiva) push(ano.idade, "agressivo", Number(ano.saldoNominal) || 0)

  return Array.from(byIdade.values()).sort((a, b) => a.idade - b.idade)
}
