"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react"
import { usePlano } from "@/lib/plano-context"
import { calcularProjecao } from "@/lib/engine"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { MAG_PRODUTO_META, taxaFaixaEtaria, nomeProdutoMag } from "@/lib/mag/produtos"
import { cn } from "@/lib/utils"

interface SimuladorSegurosProps {
  onNavigate: (section: string) => void
}

const CS_MIN = 500_000
const CS_MAX = 25_000_000
const CS_INICIAL = 3_000_000

const PRODUTOS_BTNS: { codigo: string; label: string }[] = [
  { codigo: "WL10", label: "Whole Life Integral (10a)" },
  { codigo: "WL5", label: "Whole Life (5a)" },
  { codigo: "TL10", label: "Term Life 10a" },
  { codigo: "TL20", label: "Term Life 20a" },
  { codigo: "TL30", label: "Term Life 30a" },
]

function getAnospag(codigo: string): number {
  return MAG_PRODUTO_META[codigo]?.anospag ?? 10
}

function calcularFallback(cs: number, idade: number, codigo: string) {
  const mult = MAG_PRODUTO_META[codigo]?.mult ?? 1
  return cs * taxaFaixaEtaria(idade) * mult
}

function custoTotalNominalPremios(premioMensal: number, anosPag: number, inflacaoPct: number) {
  if (anosPag <= 0 || premioMensal <= 0) return 0
  const inf = Math.max(0, inflacaoPct) / 100
  let total = 0
  for (let y = 0; y < anosPag; y++) {
    total += premioMensal * 12 * Math.pow(1 + inf, y)
  }
  return total
}

/** Lê `sexo` ou `genero` (M/F, Masculino/Feminino, 1/2). */
function normalizeSexoMF(dp: { sexo?: unknown; genero?: unknown }): "M" | "F" | null {
  const raw = dp.sexo !== undefined && dp.sexo !== "" ? dp.sexo : dp.genero
  if (raw === 1 || raw === "1") return "M"
  if (raw === 2 || raw === "2") return "F"
  if (typeof raw === "string") {
    const s = raw.trim()
    const lower = s.toLowerCase()
    if (lower === "m" || lower === "masculino" || lower.startsWith("masc")) return "M"
    if (lower === "f" || lower === "feminino" || lower.startsWith("fem")) return "F"
  }
  return null
}

function labelSexoExibicao(dp: { sexo?: unknown; genero?: unknown }): string {
  const g = normalizeSexoMF(dp)
  if (g === "M") return "Masculino"
  if (g === "F") return "Feminino"
  return "—"
}

function sexoIdParaMag(dp: { sexo?: unknown; genero?: unknown }): 1 | 2 {
  return normalizeSexoMF(dp) === "M" ? 1 : 2
}

export function SimuladorSeguros({ onNavigate }: SimuladorSegurosProps) {
  const { state, getIdadeAtual, getPatrimonioLiquido } = usePlano()
  const { dadosPessoais, projecao, premissas, objetivos, passivos, kpis } = state
  const moeda = state.moeda ?? "BRL"

  /** Aliases alinhados ao modelo de dados (globais: `nascimento`, `renda`). */
  const dataNascimento = dadosPessoais.nascimento
  const rendaMensal = dadosPessoais.renda

  const fmt = (v: number) =>
    new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: moeda === "USD" ? "USD" : "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v)

  const fmtShort = (v: number) => {
    if (v >= 1e6) return `${moeda === "USD" ? "US$" : "R$"} ${(v / 1e6).toFixed(1)}M`
    if (v >= 1e3) return `${moeda === "USD" ? "US$" : "R$"} ${(v / 1e3).toFixed(0)}k`
    return fmt(v)
  }

  const [capitalSegurado, setCapitalSegurado] = useState(CS_INICIAL)
  const [produtoSelecionado, setProdutoSelecionado] = useState<string>("TL10")
  const [premioMensal, setPremioMensal] = useState<number | null>(null)
  const [premioAnual, setPremioAnual] = useState<number | null>(null)
  const [fonte, setFonte] = useState<"mag_api" | "estimativa">("estimativa")
  const [loadingMAG, setLoadingMAG] = useState(false)

  const idade = getIdadeAtual()
  const inflacaoPct = premissas.inflacao ?? 4
  const anospag = getAnospag(produtoSelecionado)
  const isWholeLife = produtoSelecionado.startsWith("WL")

  /** Mesmo horizonte da aba Projeção: idade aposentadoria − idade atual (anos). */
  const horizonteAnos = useMemo(
    () => Math.max(1, Math.round((Number(premissas.idadeApos) || 65) - (idade || 0))),
    [premissas.idadeApos, idade],
  )

  const projecaoEfetiva = useMemo(() => {
    const n = horizonteAnos
    const saldoInicial = getPatrimonioLiquido()
    const aporteM = Math.max(0, dadosPessoais.renda - dadosPessoais.despesa)
    const idadeAtual = idade

    const aporteArr = premissas.aportePorAnoNominal
    const aportePorAnoNominal =
      Array.isArray(aporteArr) && aporteArr.length > 0
        ? aporteArr.slice(0, n + 1)
        : undefined

    const premEngine = {
      ...premissas,
      saldoInicial,
      aporteM,
      idadeAtual,
      prazo: n,
      ...(aportePorAnoNominal !== undefined ? { aportePorAnoNominal } : {}),
    }

    if (projecao?.length && projecao.length >= n + 1) {
      const slice = projecao.slice(0, n + 1)
      const ultimoSaldo = slice[slice.length - 1]?.saldoNominal ?? 0
      const temInput = Math.abs(saldoInicial) + aporteM > 1
      if (Math.abs(ultimoSaldo) > 1 || !temInput) return slice
    }

    return calcularProjecao(premEngine as Parameters<typeof calcularProjecao>[0], objetivos, passivos)
  }, [
    horizonteAnos,
    getPatrimonioLiquido,
    dadosPessoais.renda,
    dadosPessoais.despesa,
    idade,
    premissas,
    projecao,
    objetivos,
    passivos,
  ])

  /** Patrimônio final Cenário A: último ano da projeção efetiva, ou KPI da Projeção, ou recálculo embutido em `projecaoEfetiva`. */
  const patrimonioFinalCenarioA = useMemo(() => {
    const ultimo = projecaoEfetiva.at(-1)?.saldoNominal
    if (ultimo != null && Math.abs(ultimo) > 1) return ultimo
    const k = kpis?.patrimonioApos
    if (k != null && Math.abs(k) > 1) return k
    return ultimo ?? 0
  }, [projecaoEfetiva, kpis?.patrimonioApos])

  useEffect(() => {
    const fb = calcularFallback(capitalSegurado, idade || 35, produtoSelecionado)
    setPremioMensal(fb)
    setPremioAnual(fb * 12)
    setFonte("estimativa")
  }, [capitalSegurado, produtoSelecionado, idade])

  const simularMAG = useCallback(async () => {
    if (!dataNascimento) return

    setLoadingMAG(true)
    try {
      const res = await fetch("/api/mag/simulacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataNascimento,
          sexoId: sexoIdParaMag(dadosPessoais),
          renda: rendaMensal,
          uf: dadosPessoais.uf || "SP",
          codigoModeloProposta: produtoSelecionado,
          capitalSegurado,
          anospag: getAnospag(produtoSelecionado),
        }),
      })

      let data: {
        premioMensal?: number | null
        premioAnual?: number | null
        rawResponse?: unknown
        error?: string
      }
      try {
        data = (await res.json()) as typeof data
      } catch {
        const fb = calcularFallback(capitalSegurado, idade || 35, produtoSelecionado)
        setPremioMensal(fb)
        setPremioAnual(fb * 12)
        setFonte("estimativa")
        return
      }

      if (typeof data.premioMensal === "number" && data.premioMensal > 0) {
        setPremioMensal(data.premioMensal)
        setPremioAnual(
          typeof data.premioAnual === "number" ? data.premioAnual : data.premioMensal * 12,
        )
        setFonte("mag_api")
        return
      }

      const fb = calcularFallback(capitalSegurado, idade || 35, produtoSelecionado)
      setPremioMensal(fb)
      setPremioAnual(fb * 12)
      setFonte("estimativa")
      // eslint-disable-next-line no-console -- diagnóstico MAG em sandbox
      console.log("MAG raw response:", data.rawResponse ?? data)
    } catch (e) {
      const fb = calcularFallback(capitalSegurado, idade || 35, produtoSelecionado)
      setPremioMensal(fb)
      setPremioAnual(fb * 12)
      setFonte("estimativa")
      // eslint-disable-next-line no-console
      console.warn("Simular MAG:", e)
    } finally {
      setLoadingMAG(false)
    }
  }, [
    capitalSegurado,
    dataNascimento,
    rendaMensal,
    dadosPessoais,
    idade,
    produtoSelecionado,
  ])

  const pm = premioMensal ?? 0
  const pa = premioAnual ?? pm * 12

  const custoNominal = useMemo(
    () => custoTotalNominalPremios(pm, anospag, inflacaoPct),
    [pm, anospag, inflacaoPct],
  )

  const alavancagem = pm > 0 ? capitalSegurado / pm : null

  const chartData = useMemo(() => {
    if (!projecaoEfetiva?.length) return []

    const pmSafe = Math.max(0, pm)
    let cumPremioNominal = 0
    const inf = inflacaoPct / 100

    return projecaoEfetiva.map((p, idx) => {
      if (pmSafe > 0) cumPremioNominal += pmSafe * 12 * Math.pow(1 + inf, idx)

      const cenárioA = p.saldoNominal
      const patrimonioInvestAno = Math.max(0, cenárioA - cumPremioNominal)
      const prazoCoberturaAnos = isWholeLife ? Infinity : anospag
      const coberto = isWholeLife || idx < prazoCoberturaAnos
      const cenárioBvivo = patrimonioInvestAno
      const cenárioBmorte = patrimonioInvestAno + (coberto ? capitalSegurado : 0)

      return {
        ano: p.t,
        label: `T${p.t}`,
        cenárioA,
        cenárioBvivo,
        cenárioBmorte,
      }
    })
  }, [projecaoEfetiva, pm, inflacaoPct, capitalSegurado, isWholeLife, anospag])

  const formatNasc = dataNascimento
    ? new Date(dataNascimento + "T12:00:00").toLocaleDateString("pt-BR")
    : "—"

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Planejamento</p>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-[#1E5CE6]" />
          Simulador de <span className="text-[#1E5CE6]">Seguros</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Cotação MAG integrada com cenários de patrimônio e proteção por capital segurado
        </p>
      </div>

      {/* Dados globais (somente leitura) */}
      <Card className="bg-[#131929] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-foreground">Dados do cliente (plano)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Data de nascimento</p>
              <p className="font-medium text-foreground tabular-nums">{formatNasc}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Sexo</p>
              <p className="font-medium text-foreground">{labelSexoExibicao(dadosPessoais)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">UF</p>
              <p className="font-medium text-foreground">{dadosPessoais.uf || "SP"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Renda mensal</p>
              <p className="font-medium text-foreground tabular-nums">{fmt(rendaMensal || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controles locais */}
      <Card className="bg-[#131929] border-white/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">Parâmetros da simulação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Label className="text-sm text-muted-foreground shrink-0">Capital segurado</Label>
              <div className="flex flex-1 items-center gap-4 min-w-0">
                <Slider
                  value={[capitalSegurado]}
                  onValueChange={(v) => setCapitalSegurado(Math.max(CS_MIN, v[0] ?? CS_MIN))}
                  min={CS_MIN}
                  max={CS_MAX}
                  step={50_000}
                  className="flex-1 min-w-0"
                />
                <span className="text-sm font-semibold text-[#1E5CE6] tabular-nums shrink-0 min-w-[7.5rem] text-right">
                  {fmt(capitalSegurado)}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Faixa de {fmt(CS_MIN)} a {fmt(CS_MAX)} · inicial {fmt(CS_INICIAL)}
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm text-muted-foreground">Produto</Label>
            <div className="flex flex-wrap gap-2">
              {PRODUTOS_BTNS.map((p) => (
                <Button
                  key={p.codigo}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProdutoSelecionado(p.codigo)}
                  className={cn(
                    "border-white/10 bg-[#0D1220] text-foreground hover:bg-white/5",
                    produtoSelecionado === p.codigo &&
                      "border-[#1E5CE6] bg-[#1E5CE6]/15 text-foreground ring-1 ring-[#1E5CE6]/50",
                  )}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          {loadingMAG && <p className="text-xs text-muted-foreground">Consultando API MAG…</p>}
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-[#131929] border-white/10">
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Prêmio mensal</p>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xl font-semibold tabular-nums text-foreground">{fmt(pm)}</p>
              {fonte === "mag_api" ? (
                <Badge className="border-transparent bg-[#1E5CE6] text-white hover:bg-[#1E5CE6]">
                  Cotação MAG
                </Badge>
              ) : (
                <Badge variant="secondary" className="border-transparent bg-zinc-600 text-zinc-100 hover:bg-zinc-600">
                  Estimativa
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#131929] border-white/10">
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Prêmio anual (referência)</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{fmt(pa)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#131929] border-white/10">
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Custo total nominal ({anospag}a, inflação {inflacaoPct}% a.a.)
            </p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{fmt(custoNominal)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#131929] border-white/10">
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Alavancagem dia 1 (CS ÷ prêmio)</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">
              {alavancagem != null ? `${alavancagem.toFixed(0)}x` : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card className="bg-[#131929] border-white/10">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">Evolução patrimonial</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Horizonte: {horizonteAnos} anos (idade aposentadoria − idade atual). Azul: projeção atual. Verde: investimento
            líquido de prêmios. Tracejado: óbito = patrimônio investido + capital segurado apenas enquanto houver cobertura
            (Term); depois segue só o patrimônio investido.
          </p>
        </CardHeader>
        <CardContent className="h-[320px] w-full">
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ajuste idade e aposentadoria em &quot;Projeção&quot; para montar o horizonte ({horizonteAnos} anos).
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="ano" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                  tickFormatter={(v) => fmtShort(Number(v))}
                  width={56}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#131929",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: "#a1a1aa" }}
                  formatter={(value: number | string, name: string) => [fmt(Number(value)), name]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="cenárioA"
                  name="Cenário A — prev + invest"
                  stroke="#1E5CE6"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="cenárioBvivo"
                  name="Cenário B — invest + prêmio"
                  stroke="#22C787"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="cenárioBmorte"
                  name="Cenário B — + CS (óbito)"
                  stroke="#22C787"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detalhamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#131929] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Cenário A</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Previdência + investimentos conforme a projeção do plano; IR modelado no motor ao resgate (visão
              agregada na projeção global).
            </p>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Patrimônio final nominal (fim do horizonte de {horizonteAnos} anos na projeção):{" "}
              <span className="text-foreground font-medium tabular-nums">{fmt(patrimonioFinalCenarioA)}</span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-[#131929] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Cenário B</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              100% investimento com dedução acumulada do prêmio do seguro ({fonte === "mag_api" ? "cotação MAG" : "estimativa"}{" "}
              — {nomeProdutoMag(produtoSelecionado)}).
            </p>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Prêmio mensal:{" "}
              <span className="text-foreground font-medium tabular-nums">{fmt(pm)}</span>
            </p>
            <p>
              Cobertura: <span className="text-foreground font-medium">{fmt(capitalSegurado)}</span> —{" "}
              {isWholeLife ? "Whole Life (CS permanente na linha de óbito)" : `Term ${anospag} anos (CS até o prazo)`}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => onNavigate("protecao")}
          className="border-white/10 bg-[#131929] text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            className="bg-[#1E5CE6] hover:bg-[#1E5CE6]/90 text-white disabled:opacity-50"
            disabled={!dataNascimento || loadingMAG}
            onClick={() => void simularMAG()}
          >
            {loadingMAG ? "Simulando…" : "Simular via MAG"}
          </Button>
          <Button onClick={() => onNavigate("dashboard")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
