"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { usePlano } from "@/lib/plano-context"
import type { FluxoMesRealizado } from "@/lib/plano-context"
import { calcularProjecao, calcularFluxoAnual, calcularPassivosPorAnoSeries } from "@/lib/engine"
import { buildDadosFluxoGrafico } from "@/lib/projecao-graficos-dados"
import { getFontesRenda, resolveAporteParaPremissas } from "@/lib/renda-utils"
import {
  MESES_LABELS,
  MESES_LABELS_COMPLETOS,
  CORES_FLUXO_CAIXA,
  calcularRealizadoMensal,
  calcularOrcadoVsRealizado,
  formatBRL,
  formatBRLSaida,
  formatPct,
} from "@/lib/fluxo-caixa-utils"
import {
  GraficoRealizadoMensal,
  GraficoOrcadoVsRealizado,
  LegendaFluxo,
} from "@/components/charts/fluxo-caixa-charts"
import { FluxoAnualChart } from "@/components/charts/projecao-extra-charts"

interface FluxoDeCaixaProps {
  onNavigate: (section: string) => void
}

const PAINEL_BG = "#F5F5F5"

const LEGENDA_PAINEL1 = [
  { id: "rentabilidade", label: "Rentabilidade", fill: CORES_FLUXO_CAIXA.rentabilidade },
  { id: "receita", label: "Receita", fill: CORES_FLUXO_CAIXA.receita },
  { id: "despesa", label: "Despesa", fill: CORES_FLUXO_CAIXA.despesa },
]

function ToggleDois({
  a,
  b,
  value,
  onChange,
}: {
  a: { id: string; label: string }
  b: { id: string; label: string }
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex rounded-lg bg-white p-1 border border-border/60">
      {[a, b].map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            value === opt.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function FluxoDeCaixa({ onNavigate }: FluxoDeCaixaProps) {
  const { state, setFluxoDeCaixa, getSaldoInicialLiquido, getIdadeAtual } = usePlano()
  const { fluxoDeCaixa, premissas, objetivos, passivos, dadosPessoais } = state
  const moeda = state.moeda ?? "BRL"

  const [hoveredMesP1, setHoveredMesP1] = useState<number | null>(null)
  const [displayModeP3, setDisplayModeP3] = useState<"real" | "nominal">("real")

  const anoCorrente = new Date().getFullYear()
  const prazoTotal = Math.max(0, Number(premissas.prazo) || 0)
  const anoPlanoFim = anoCorrente + prazoTotal
  const [periodoInicio, setPeriodoInicio] = useState(anoCorrente)
  const [periodoFim, setPeriodoFim] = useState(anoPlanoFim)

  const saldoInicial = getSaldoInicialLiquido()
  const idadeAtual = getIdadeAtual()

  const fontesRenda = useMemo(() => getFontesRenda(dadosPessoais), [dadosPessoais])
  const { aporteM: aporteMensal, aportePorAnoNominal } = useMemo(
    () => resolveAporteParaPremissas(fontesRenda, dadosPessoais.despesa, premissas),
    [fontesRenda, dadosPessoais.despesa, premissas],
  )

  const premissasCompletas = useMemo(
    () => ({
      ...premissas,
      saldoInicial,
      aporteM: aporteMensal,
      aportePorAnoNominal,
      idadeAtual,
      prazo: Math.max(1, Number(premissas.prazo) || 1),
    }),
    [premissas, saldoInicial, aporteMensal, aportePorAnoNominal, idadeAtual],
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

  const taxaAnualLiquida = Math.max(0, (Number(premissas.rendimento) || 0) / 100)

  const projecaoNominal = useMemo(
    () => calcularProjecao(premissasCompletas, objetivosEngine, passivos, "nominal"),
    [premissasCompletas, objetivosEngine, passivos],
  )

  const fluxoAnualNominal = useMemo(
    () =>
      calcularFluxoAnual(
        premissasCompletas,
        objetivosEngine,
        passivos,
        Number(premissas.aliquotaImpostoRendimento) || 0.15,
        "nominal",
      ),
    [premissasCompletas, objetivosEngine, passivos, premissas.aliquotaImpostoRendimento],
  )

  const dadosFluxoOrcado = useMemo(
    () =>
      buildDadosFluxoGrafico(projecaoNominal, {
        taxaLiqAnual: taxaAnualLiquida,
        aporteMensal,
        idadeAtual,
        idadeApos: Number(premissas.idadeApos) || 0,
        rendaMensalMeta: Number(premissas.retiradaMensal) || 0,
        displayMode: "nominal",
        inflacaoPct: Number(premissas.inflacao) || 0,
        objetivosPorAno: fluxoAnualNominal.map((r) => r.objetivos),
        passivosPorAno: calcularPassivosPorAnoSeries(passivos, premissasCompletas.prazo),
        aportePorAno: fluxoAnualNominal.map((r) => r.aporte),
        retiradaPorAno: fluxoAnualNominal.map((r) => r.retirada),
      }),
    [
      projecaoNominal,
      fluxoAnualNominal,
      passivos,
      premissasCompletas.prazo,
      premissas.inflacao,
      premissas.idadeApos,
      premissas.retiradaMensal,
      taxaAnualLiquida,
      aporteMensal,
      idadeAtual,
    ],
  )

  const projecao = useMemo(
    () => calcularProjecao(premissasCompletas, objetivosEngine, passivos, displayModeP3),
    [premissasCompletas, objetivosEngine, passivos, displayModeP3],
  )

  const fluxoAnual = useMemo(
    () =>
      calcularFluxoAnual(
        premissasCompletas,
        objetivosEngine,
        passivos,
        Number(premissas.aliquotaImpostoRendimento) || 0.15,
        displayModeP3,
      ),
    [premissasCompletas, objetivosEngine, passivos, premissas.aliquotaImpostoRendimento, displayModeP3],
  )

  const passivosPorAno = useMemo(
    () => calcularPassivosPorAnoSeries(passivos, premissasCompletas.prazo),
    [passivos, premissasCompletas.prazo],
  )

  const dadosFluxo = useMemo(
    () =>
      buildDadosFluxoGrafico(projecao, {
        taxaLiqAnual: taxaAnualLiquida,
        aporteMensal,
        idadeAtual,
        idadeApos: Number(premissas.idadeApos) || 0,
        rendaMensalMeta: Number(premissas.retiradaMensal) || 0,
        displayMode: displayModeP3,
        inflacaoPct: Number(premissas.inflacao) || 0,
        objetivosPorAno: fluxoAnual.map((r) => r.objetivos),
        passivosPorAno,
        aportePorAno: fluxoAnual.map((r) => r.aporte),
        retiradaPorAno: fluxoAnual.map((r) => r.retirada),
      }),
    [
      projecao,
      fluxoAnual,
      passivosPorAno,
      displayModeP3,
      premissas.inflacao,
      premissas.idadeApos,
      premissas.retiradaMensal,
      taxaAnualLiquida,
      aporteMensal,
      idadeAtual,
    ],
  )

  const patrimonioInicioOrcado = useMemo(() => {
    const p0 = projecaoNominal[0]
    if (!p0) return saldoInicial
    return Number(p0.saldoNominal) || saldoInicial
  }, [projecaoNominal, saldoInicial])

  const dadosOrcadoVsReal = useMemo(() => {
    const primeiroAno = dadosFluxoOrcado[0]
    if (!primeiroAno) return []
    return calcularOrcadoVsRealizado(
      fluxoDeCaixa,
      primeiroAno,
      patrimonioInicioOrcado,
      taxaAnualLiquida,
    )
  }, [fluxoDeCaixa, dadosFluxoOrcado, patrimonioInicioOrcado, taxaAnualLiquida])

  const fmt = (v: number) => formatBRL(v, moeda)

  const formatarMoeda = (valor: number) => {
    const prefix = moeda === "USD" ? "US$ " : "R$ "
    if (Math.abs(valor) >= 1_000_000) return `${prefix}${(valor / 1_000_000).toFixed(1)}M`
    if (Math.abs(valor) >= 1_000) return `${prefix}${(valor / 1_000).toFixed(0)}K`
    return `${prefix}${valor.toFixed(0)}`
  }

  const formatarMoedaCompleta = (valor: number) => fmt(valor)

  const parseCurrency = (value: string) => parseInt(value.replace(/\D/g, ""), 10) || 0
  const formatCurrencyInput = (value: number) => {
    if (!value) return ""
    return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const dadosRealizado = useMemo(
    () => calcularRealizadoMensal(fluxoDeCaixa),
    [fluxoDeCaixa],
  )

  const totaisAno = useMemo(() => {
    const rent = dadosRealizado.reduce((s, d) => s + d.rentabilidade, 0)
    const rec = dadosRealizado.reduce((s, d) => s + d.receita, 0)
    const desp = dadosRealizado.reduce((s, d) => s + d.despesa, 0)
    const fluxo = dadosRealizado.reduce((s, d) => s + d.fluxoLiquido, 0)
    const entradas = rent + rec
    const taxaPoup = entradas > 0 ? (fluxo / entradas) * 100 : 0
    return { rent, rec, desp, fluxo, taxaPoup }
  }, [dadosRealizado])

  const idxSaldoCard = hoveredMesP1 ?? 11
  const saldoCardLabel =
    hoveredMesP1 !== null
      ? `Até ${MESES_LABELS_COMPLETOS[hoveredMesP1].toLowerCase()}`
      : "Até dezembro"
  const saldoCardValor = dadosRealizado[idxSaldoCard]?.saldoAcumulado ?? 0

  const updateMes = (idx: number, field: keyof FluxoMesRealizado, raw: string) => {
    const next = [...fluxoDeCaixa.meses]
    next[idx] = { ...next[idx], [field]: parseCurrency(raw) }
    setFluxoDeCaixa({ meses: next })
  }

  const updateAnualUnico = (field: keyof FluxoMesRealizado, raw: string) => {
    setFluxoDeCaixa({
      anualUnico: { ...fluxoDeCaixa.anualUnico, [field]: parseCurrency(raw) },
    })
  }

  const aplicarPresetPeriodo = (anos: number | "todos") => {
    const inicio = anoCorrente
    const fim = anos === "todos" ? anoPlanoFim : Math.min(inicio + anos - 1, anoPlanoFim)
    setPeriodoInicio(inicio)
    setPeriodoFim(fim)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground mb-1">Planejamento</p>
        <h1 className="page-title text-[24px] text-foreground">
          Fluxo de <span className="text-primary">caixa</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe o realizado do ano corrente e compare com o orçamento e a projeção patrimonial
        </p>
      </div>

      {/* Painel 1 */}
      <Card className="form-card">
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Fluxo de caixa realizado ({anoCorrente})
          </CardTitle>
          <ToggleDois
            a={{ id: "mensal", label: "Mês a mês" }}
            b={{ id: "anual", label: "Valor anual único" }}
            value={fluxoDeCaixa.modoRealizado}
            onChange={(v) => setFluxoDeCaixa({ modoRealizado: v as "mensal" | "anual" })}
          />
        </CardHeader>
        <CardContent className="space-y-5">
          <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
            {fluxoDeCaixa.modoRealizado === "mensal" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "0.5px solid rgba(0,0,0,0.08)" }}>
                      <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Mês</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Rentabilidade (R$)</th>
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Receita (R$)</th>
                      <th className="text-left py-2 pl-2 text-muted-foreground font-medium">Despesa (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MESES_LABELS.map((mes, i) => (
                      <tr key={mes} style={{ borderBottom: "0.5px solid rgba(0,0,0,0.06)" }}>
                        <td className="py-2 pr-3 font-medium text-foreground">{mes}</td>
                        {(["rentabilidade", "receita", "despesa"] as const).map((field) => (
                          <td key={field} className="py-1.5 px-1">
                            <Input
                              value={formatCurrencyInput(fluxoDeCaixa.meses[i]?.[field] ?? 0)}
                              onChange={(e) => updateMes(i, field, e.target.value)}
                              className="h-8 text-sm bg-white"
                              placeholder="0"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(
                  [
                    { field: "rentabilidade" as const, label: "Rentabilidade mensal" },
                    { field: "receita" as const, label: "Receita mensal" },
                    { field: "despesa" as const, label: "Despesa mensal" },
                  ]
                ).map(({ field, label }) => (
                  <div key={field} className="space-y-2">
                    <Label className="field-label">{label}</Label>
                    <Input
                      value={formatCurrencyInput(fluxoDeCaixa.anualUnico[field])}
                      onChange={(e) => updateAnualUnico(field, e.target.value)}
                      className="h-9 bg-white"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "14px 16px" }}>
              <p className="text-xs text-muted-foreground mb-1">Fluxo líquido</p>
              <p className="text-xl font-bold text-foreground">{fmt(totaisAno.fluxo)}</p>
              <p className="text-xs text-muted-foreground mt-1">Ano {anoCorrente}</p>
            </div>
            <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "14px 16px" }}>
              <p className="text-xs text-muted-foreground mb-1">Saldo acumulado</p>
              <p className="text-xl font-bold text-foreground">{fmt(saldoCardValor)}</p>
              <p className="text-xs text-muted-foreground mt-1">{saldoCardLabel}</p>
            </div>
            <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "14px 16px" }}>
              <p className="text-xs text-muted-foreground mb-1">Taxa de poupança efetiva</p>
              <p className="text-xl font-bold text-foreground">{formatPct(totaisAno.taxaPoup)}</p>
              <p className="text-xs text-muted-foreground mt-1">Fluxo líquido ÷ entradas</p>
            </div>
          </div>

          <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
            <LegendaFluxo itens={LEGENDA_PAINEL1} />
            <GraficoRealizadoMensal
              dados={dadosRealizado}
              formatBRL={fmt}
              onHoverMes={setHoveredMesP1}
              getDetalhes={(d) => [
                {
                  id: "r",
                  label: "Rentabilidade",
                  valor: fmt(d.rentabilidade),
                  fill: CORES_FLUXO_CAIXA.rentabilidade,
                },
                {
                  id: "rec",
                  label: "Receita",
                  valor: fmt(d.receita),
                  fill: CORES_FLUXO_CAIXA.receita,
                },
                {
                  id: "d",
                  label: "Despesa",
                  valor: formatBRLSaida(d.despesa, moeda),
                  fill: CORES_FLUXO_CAIXA.despesa,
                },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Painel 2 */}
      <Card className="form-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Saldo orçado vs realizado ({anoCorrente})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
            <LegendaFluxo
              itens={[
                { id: "orc", label: "Orçado (tracejado)", fill: CORES_FLUXO_CAIXA.orcado, dashed: true },
                { id: "real", label: "Realizado", fill: CORES_FLUXO_CAIXA.realizado },
              ]}
            />
            <GraficoOrcadoVsRealizado dados={dadosOrcadoVsReal} formatBRL={fmt} />
          </div>
        </CardContent>
      </Card>

      {/* Painel 3 */}
      <Card className="form-card">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Projeção anual orçada
          </CardTitle>
          <ToggleDois
            a={{ id: "real", label: "Real" }}
            b={{ id: "nominal", label: "Nominal" }}
            value={displayModeP3}
            onChange={(v) => setDisplayModeP3(v as "real" | "nominal")}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(
                [
                  { label: "5 anos", anos: 5 },
                  { label: "10 anos", anos: 10 },
                  { label: "25 anos", anos: 25 },
                  { label: "Todos", anos: "todos" as const },
                ] as const
              ).map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs bg-white"
                  onClick={() => aplicarPresetPeriodo(preset.anos)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontSize: 12, color: "#5F85B8" }}>De</label>
              <Input
                type="number"
                min={anoCorrente}
                max={periodoFim}
                value={periodoInicio}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!Number.isNaN(v)) {
                    setPeriodoInicio(Math.max(anoCorrente, Math.min(v, periodoFim)))
                  }
                }}
                className="h-8 w-[88px] text-sm bg-white"
              />
              <label style={{ fontSize: 12, color: "#5F85B8" }}>até</label>
              <Input
                type="number"
                min={periodoInicio}
                max={anoPlanoFim}
                value={periodoFim}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!Number.isNaN(v)) {
                    setPeriodoFim(Math.min(anoPlanoFim, Math.max(v, periodoInicio)))
                  }
                }}
                className="h-8 w-[88px] text-sm bg-white"
              />
            </div>
          </div>

          <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
            <FluxoAnualChart
              data={dadosFluxo}
              periodoInicioAno={periodoInicio}
              periodoFimAno={periodoFim}
              anoBase={anoCorrente}
              formatarMoeda={formatarMoeda}
              formatarMoedaCompleta={formatarMoedaCompleta}
              hideTitle
              hideMetaRenda
            />
          </div>
        </CardContent>
      </Card>

      <div className="nav-footer">
        <Button variant="ghost" className="btn-back" onClick={() => onNavigate("objetivos")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={() => onNavigate("projecao")} className="btn-next">
          Próximo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
