"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { usePlano } from "@/lib/plano-context"
import { calcularProjecao, type ProjecaoAno } from "@/lib/engine"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

type DisplayMode = "nominal" | "real"

export interface CenariosInvestimentoProps {
  /** Se omitido, o componente mantém estado interno. */
  displayMode?: DisplayMode
  onDisplayModeChange?: (mode: DisplayMode) => void
  /** Se false, exibe rentabilidades como texto (sem inputs). Default: true */
  editable?: boolean
}

type LinhaCenarios = {
  idade: number
  conservador: number
  moderado: number
  agressivo: number
}

export function CenariosInvestimento(props: CenariosInvestimentoProps) {
  const { state, setPremissas } = usePlano()
  const { premissas, objetivos, dadosPessoais, ativos, passivos } = state
  const moeda = state.moeda ?? "BRL"

  const [showCenarios, setShowCenarios] = useState(true)
  const editable = props.editable ?? true

  const cenarioConservador = premissas.rentabilidadeConservador ?? 7
  const cenarioModerado = premissas.rentabilidadeModerado ?? 10
  const cenarioAgressivo = premissas.rentabilidadeAgressivo ?? 13

  const [displayModeInternal, setDisplayModeInternal] = useState<DisplayMode>("nominal")

  const displayMode = props.displayMode ?? displayModeInternal
  const setDisplayMode = props.onDisplayModeChange ?? setDisplayModeInternal
  const inflacaoGlobal = Number(premissas.inflacao) || 0

  const saldoInicialCalculado = useMemo(() => {
    const ativosLiquidos = (ativos ?? [])
      .filter((a) => (a.tipo ?? "").trim() === "Líquido")
      .reduce((s, a) => s + (Number(a.valor) || 0), 0)
    const totalPassivos = (passivos ?? []).reduce(
      (s, p) => s + (Number(p.saldoDevedor) > 0 ? Number(p.saldoDevedor) : Number(p.valor) || 0),
      0
    )
    return ativosLiquidos - totalPassivos
  }, [ativos, passivos])

  const idadeAtualCalculada = useMemo(() => {
    if (!dadosPessoais.nascimento) return 0
    const hoje = new Date()
    const nascimento = new Date(dadosPessoais.nascimento)
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const m = hoje.getMonth() - nascimento.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) idade--
    return Math.max(0, idade)
  }, [dadosPessoais.nascimento])

  const aporteMensal = Math.max(0, (dadosPessoais.renda || 0) - (dadosPessoais.despesa || 0))

  const aporteModo = premissas.aporteModo ?? "fixo"
  const aportePorAnoNominal = useMemo(() => {
    if (aporteModo !== "periodos") return undefined
    const prazo = Math.max(0, Number(premissas.prazo) || 0)
    const inf = (Number(premissas.inflacao) || 0) / 100
    const blocos = Math.max(1, Math.ceil(prazo / 5))
    const periodos = premissas.aportePeriodosReal ?? []

    const byYear = Array.from({ length: prazo + 1 }, () => 0)
    for (let i = 0; i < blocos; i++) {
      const inicio = i * 5
      const fim = Math.min((i + 1) * 5, prazo)
      const real = Number(periodos[i] ?? aporteMensal) || 0
      const nominalNoInicio = real * Math.pow(1 + inf, inicio)
      for (let t = inicio; t < fim; t++) byYear[t] = nominalNoInicio
    }
    if (prazo > 0 && byYear[prazo] === 0) byYear[prazo] = byYear[prazo - 1] ?? 0
    return byYear
  }, [aporteModo, premissas.prazo, premissas.inflacao, premissas.aportePeriodosReal, aporteMensal])

  const premissasCompletas = useMemo(
    () => ({
      ...premissas,
      saldoInicial: saldoInicialCalculado,
      aporteM: aporteMensal,
      ...(aportePorAnoNominal ? { aportePorAnoNominal } : {}),
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

  const anosAteAposentadoria = Math.max(0, (premissas.idadeApos || 0) - idadeAtualCalculada)
  const retiradaDesejada = premissas.retiradaMensal ?? 0
  const rendaApos = premissas.rendaAposentadoria ?? 0
  const retiradaLiquida = Math.max(0, retiradaDesejada - rendaApos)

  const deflatorAposentadoria = useMemo(() => {
    const inf = inflacaoGlobal / 100
    return Math.pow(1 + inf, anosAteAposentadoria)
  }, [inflacaoGlobal, anosAteAposentadoria])

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

  const objetivoPatrimonioParaTaxa = (taxaAnualPct: number) => {
    const taxa = (Number(taxaAnualPct) || 0) / 100
    return taxa > 0 ? (retiradaLiquida * 12) / taxa : Infinity
  }

  const idadeIndependenciaNaProjecao = (projecaoLocal: ProjecaoAno[], taxaAnualPct: number) => {
    const objetivoPatrimonio = objetivoPatrimonioParaTaxa(taxaAnualPct)
    if (!isFinite(objetivoPatrimonio)) return null
    for (const ano of projecaoLocal) {
      if (!ano.isAposentado && (ano.saldoNominal ?? 0) >= objetivoPatrimonio) return ano.idade
    }
    return null
  }

  const patrimonioNaIdadeApos = (projecaoLocal: ProjecaoAno[]) =>
    projecaoLocal.find((p) => p.idade === premissas.idadeApos)?.saldoNominal ?? 0

  const rendaMensalNaApos = (patrimonio: number, taxaAnualPct: number) =>
    (Math.max(0, patrimonio) * ((Number(taxaAnualPct) || 0) / 100)) / 12

  const projecaoConservadora = useMemo(() => {
    return calcularProjecao({ ...premissasCompletas, rendimento: cenarioConservador }, objetivosEngine, passivos)
  }, [premissasCompletas, objetivosEngine, passivos, cenarioConservador])

  const projecaoModerada = useMemo(() => {
    return calcularProjecao({ ...premissasCompletas, rendimento: cenarioModerado }, objetivosEngine, passivos)
  }, [premissasCompletas, objetivosEngine, passivos, cenarioModerado])

  const projecaoAgressiva = useMemo(() => {
    return calcularProjecao({ ...premissasCompletas, rendimento: cenarioAgressivo }, objetivosEngine, passivos)
  }, [premissasCompletas, objetivosEngine, passivos, cenarioAgressivo])

  const cenarios = useMemo(() => {
    const pCon = patrimonioNaIdadeApos(projecaoConservadora)
    const pMod = patrimonioNaIdadeApos(projecaoModerada)
    const pAgr = patrimonioNaIdadeApos(projecaoAgressiva)

    return [
      {
        key: "conservador" as const,
        nome: "Conservador",
        sub: "Maior previsibilidade",
        vol: "Baixa",
        cor: "#22C787",
        corBg: "bg-[rgba(34,199,135,0.06)]",
        corBorder: "border-[#22C787]/25",
        taxa: cenarioConservador,
        patrimonioApos: pCon,
        rendaMensalApos: rendaMensalNaApos(pCon, cenarioConservador),
        idadeIF: idadeIndependenciaNaProjecao(projecaoConservadora, cenarioConservador),
      },
      {
        key: "moderado" as const,
        nome: "Moderado",
        sub: "Equilíbrio risco/retorno",
        vol: "Média",
        cor: "#1E5CE6",
        corBg: "bg-[rgba(30,92,230,0.06)]",
        corBorder: "border-[#1E5CE6]/25",
        taxa: cenarioModerado,
        patrimonioApos: pMod,
        rendaMensalApos: rendaMensalNaApos(pMod, cenarioModerado),
        idadeIF: idadeIndependenciaNaProjecao(projecaoModerada, cenarioModerado),
      },
      {
        key: "agressivo" as const,
        nome: "Agressivo",
        sub: "Maior retorno esperado",
        vol: "Alta",
        cor: "#F5A623",
        corBg: "bg-[rgba(245,166,35,0.06)]",
        corBorder: "border-[#F5A623]/25",
        taxa: cenarioAgressivo,
        patrimonioApos: pAgr,
        rendaMensalApos: rendaMensalNaApos(pAgr, cenarioAgressivo),
        idadeIF: idadeIndependenciaNaProjecao(projecaoAgressiva, cenarioAgressivo),
      },
    ]
  }, [
    cenarioConservador,
    cenarioModerado,
    cenarioAgressivo,
    projecaoConservadora,
    projecaoModerada,
    projecaoAgressiva,
  ])

  const dadosLinhaCenarios = useMemo(() => {
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
  }, [projecaoConservadora, projecaoModerada, projecaoAgressiva])

  const dadosLinhaCenariosDisplay = useMemo(() => {
    if (displayMode === "nominal") return dadosLinhaCenarios
    const deflatorPorIdade = (idade: number) => {
      const anos = Math.max(0, idade - idadeAtualCalculada)
      const inf = inflacaoGlobal / 100
      return Math.pow(1 + inf, anos)
    }
    return dadosLinhaCenarios.map((row) => {
      const d = deflatorPorIdade(row.idade)
      return {
        idade: row.idade,
        conservador: row.conservador / d,
        moderado: row.moderado / d,
        agressivo: row.agressivo / d,
      }
    })
  }, [dadosLinhaCenarios, displayMode, inflacaoGlobal, idadeAtualCalculada])

  const ToggleNominalReal = (
    <div className="flex items-center gap-3">
      <div className="inline-flex rounded-lg bg-[#131929] p-1">
        {(["nominal", "real"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setDisplayMode(m)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
              displayMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            type="button"
          >
            {m === "nominal" ? "Nominal" : "Real"}
          </button>
        ))}
      </div>

      <div className={`text-xs font-medium uppercase tracking-wide ${displayMode === "real" ? "text-muted-foreground" : "text-muted-foreground/60"}`}>
        INFLAÇÃO: <span className="text-foreground">{inflacaoGlobal}%</span>
      </div>
    </div>
  )

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium text-foreground">Cenários Alternativos de Investimento</CardTitle>
        <div className="flex items-center gap-3">
          {ToggleNominalReal}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCenarios((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
          >
            {showCenarios ? "Ocultar Cenários" : "Ver Cenários"}
          </Button>
        </div>
      </CardHeader>

      {showCenarios && (
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cenarios.map((c) => (
              <div key={c.key} className={`rounded-xl border p-5 ${c.corBg} ${c.corBorder}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.cor }} />
                      <p className="text-sm font-semibold text-foreground">{c.nome}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{c.sub}</p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    Volatilidade: <span className="text-foreground font-medium">{c.vol}</span>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <Label className="text-xs uppercase text-muted-foreground tracking-wide">Rentabilidade</Label>
                  {editable ? (
                    <div className="relative">
                      <Input
                        type="number"
                        value={c.taxa}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0
                          if (c.key === "conservador") setPremissas({ rentabilidadeConservador: v })
                          if (c.key === "moderado") setPremissas({ rentabilidadeModerado: v })
                          if (c.key === "agressivo") setPremissas({ rentabilidadeAgressivo: v })
                        }}
                        className="bg-[#131929] border-white/10 text-foreground focus:border-primary pr-16"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">% a.a.</span>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-[#131929] border border-white/10 px-3 py-2 text-sm text-foreground tabular-nums">
                      {c.taxa}% a.a.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D1220] overflow-hidden">
            <div className="px-5 py-4 border-b border-[rgba(255,255,255,0.06)]">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comparação de Resultados</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.06)]">
                    <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Métrica
                    </th>
                    {cenarios.map((c) => (
                      <th
                        key={c.key}
                        className="py-3 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide"
                      >
                        {c.nome}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Rentabilidade", values: cenarios.map((c) => `${c.taxa}% a.a.`) },
                    {
                      label: "Patrimônio na Aposentadoria",
                      values: cenarios.map((c) =>
                        fmtFull(displayMode === "real" ? c.patrimonioApos / deflatorAposentadoria : c.patrimonioApos),
                      ),
                    },
                    {
                      label: "Renda Mensal na Aposentadoria",
                      values: cenarios.map((c) =>
                        fmtFull(
                          displayMode === "real" ? c.rendaMensalApos / deflatorAposentadoria : c.rendaMensalApos,
                        ),
                      ),
                    },
                    { label: "Independência Financeira", values: cenarios.map((c) => (c.idadeIF ? `${c.idadeIF} anos` : "—")) },
                  ].map((row) => (
                    <tr key={row.label} className="border-b border-[rgba(255,255,255,0.06)] last:border-b-0">
                      <td className="py-3 px-4 text-sm text-muted-foreground">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="py-3 px-4 text-right text-sm text-foreground tabular-nums">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0D1220] p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Evolução Patrimonial Comparativa
            </p>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosLinhaCenariosDisplay} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="idade"
                    stroke="#4A5268"
                    tick={{ fill: "#4A5268", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(255,255,255,0.04)" }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#4A5268"
                    tick={{ fill: "#4A5268", fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatarMoeda}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#131929",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    labelStyle={{ color: "#ffffff", fontWeight: 600 }}
                    itemStyle={{ color: "#ffffff" }}
                    labelFormatter={(label) => `Idade: ${label} anos`}
                    formatter={(value: number) => fmtFull(value)}
                  />
                  <Legend
                    verticalAlign="bottom"
                    formatter={(value) => {
                      if (value === "conservador") return `Conservador (${cenarioConservador}% a.a.)`
                      if (value === "moderado") return `Moderado (${cenarioModerado}% a.a.)`
                      if (value === "agressivo") return `Agressivo (${cenarioAgressivo}% a.a.)`
                      return String(value)
                    }}
                  />
                  <Line type="monotone" dataKey="conservador" name="conservador" stroke="#22C787" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="moderado" name="moderado" stroke="#1E5CE6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="agressivo" name="agressivo" stroke="#F5A623" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

