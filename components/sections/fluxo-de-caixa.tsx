"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { usePlano } from "@/lib/plano-context"
import type { FluxoMesRealizado } from "@/lib/plano-context"
import {
  MESES_LABELS,
  MESES_LABELS_COMPLETOS,
  CORES_FLUXO_CAIXA,
  calcularRealizadoMensal,
  calcularOrcadoVsRealizado,
  calcularProjecaoAnualOrcada,
  rotuloStepAnos,
  deveMostrarRotuloAno,
  formatBRL,
  formatPct,
} from "@/lib/fluxo-caixa-utils"
import {
  GraficoRealizadoMensal,
  GraficoOrcadoVsRealizado,
  LegendaFluxo,
  DestaqueHover,
} from "@/components/charts/fluxo-caixa-charts"

interface FluxoDeCaixaProps {
  onNavigate: (section: string) => void
}

const PAINEL_BG = "#F5F5F5"

const LEGENDA_PAINEL1 = [
  { id: "rentabilidade", label: "Rentabilidade", fill: CORES_FLUXO_CAIXA.rentabilidade },
  { id: "receita", label: "Receita", fill: CORES_FLUXO_CAIXA.receita },
  { id: "despesa", label: "Despesa", fill: CORES_FLUXO_CAIXA.despesa },
  { id: "saldo", label: "Saldo acumulado", fill: CORES_FLUXO_CAIXA.saldoAcumulado },
]

const LEGENDA_PAINEL3 = [
  { id: "rentabilidade", label: "Rentabilidade", fill: CORES_FLUXO_CAIXA.rentabilidade },
  { id: "aportes", label: "Aportes", fill: CORES_FLUXO_CAIXA.aportes },
  { id: "passivos", label: "Passivos", fill: CORES_FLUXO_CAIXA.passivos },
  { id: "objetivos", label: "Objetivos", fill: CORES_FLUXO_CAIXA.objetivos },
  { id: "outros", label: "Outros", fill: CORES_FLUXO_CAIXA.outros },
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
  const [hoveredMesP2, setHoveredMesP2] = useState<number | null>(null)
  const [hoveredAnoP3, setHoveredAnoP3] = useState<number | null>(null)
  const [displayModeP3, setDisplayModeP3] = useState<"real" | "nominal">("real")

  const anoCorrente = new Date().getFullYear()
  const prazoTotal = Math.max(0, Number(premissas.prazo) || 0)
  const anoPlanoFim = anoCorrente + prazoTotal
  const [periodoInicio, setPeriodoInicio] = useState(anoCorrente)
  const [periodoFim, setPeriodoFim] = useState(anoPlanoFim)

  const saldoInicial = getSaldoInicialLiquido()
  const idadeAtual = getIdadeAtual()

  const premissasCompletas = useMemo(
    () => ({
      ...premissas,
      saldoInicial,
      aporteM: Math.max(0, dadosPessoais.renda - dadosPessoais.despesa),
      idadeAtual,
      prazo: Math.max(1, Number(premissas.prazo) || 1),
    }),
    [premissas, saldoInicial, dadosPessoais.renda, dadosPessoais.despesa, idadeAtual],
  )

  const fmt = (v: number) => formatBRL(v, moeda)

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

  const dadosOrcadoVsReal = useMemo(
    () => calcularOrcadoVsRealizado(fluxoDeCaixa, premissas, dadosPessoais, saldoInicial),
    [fluxoDeCaixa, premissas, dadosPessoais, saldoInicial],
  )

  const anosVisiveisP3 = useMemo(() => {
    const inicio = Math.min(periodoInicio, periodoFim)
    const fim = Math.max(periodoInicio, periodoFim)
    const anos: number[] = []
    for (let y = inicio; y <= fim; y++) anos.push(y)
    return anos
  }, [periodoInicio, periodoFim])

  const projecaoAnual = useMemo(
    () =>
      calcularProjecaoAnualOrcada(
        premissasCompletas,
        objetivos,
        passivos,
        displayModeP3,
        anosVisiveisP3[0] ?? anoCorrente,
        anosVisiveisP3[anosVisiveisP3.length - 1] ?? anoPlanoFim,
      ),
    [
      premissasCompletas,
      objetivos,
      passivos,
      displayModeP3,
      anosVisiveisP3,
      anoCorrente,
      anoPlanoFim,
    ],
  )

  const maxAbsAnoP3 = useMemo(() => {
    let max = 0
    for (const row of projecaoAnual) {
      max = Math.max(max, row.entradasTotal, row.saidasTotal)
    }
    return max
  }, [projecaoAnual])

  const stepP3 = rotuloStepAnos(anosVisiveisP3.length)

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
    setHoveredAnoP3(null)
  }

  const p2Hover = hoveredMesP2 !== null ? dadosOrcadoVsReal[hoveredMesP2] : null
  const p3Hover = hoveredAnoP3 !== null ? projecaoAnual.find((r) => r.ano === hoveredAnoP3) : null

  const detalhesP3 = p3Hover
    ? (
        [
          { id: "rent", label: "Rentabilidade", v: p3Hover.categorias.rentabilidade, fill: CORES_FLUXO_CAIXA.rentabilidade },
          { id: "ap", label: "Aportes", v: p3Hover.categorias.aportes, fill: CORES_FLUXO_CAIXA.aportes },
          { id: "pass", label: "Passivos", v: p3Hover.categorias.passivos, fill: CORES_FLUXO_CAIXA.passivos },
          { id: "obj", label: "Objetivos", v: p3Hover.categorias.objetivos, fill: CORES_FLUXO_CAIXA.objetivos },
          { id: "out", label: "Outros", v: p3Hover.categorias.outros, fill: CORES_FLUXO_CAIXA.outros },
        ] as const
      )
        .filter((d) => d.v > 0)
        .map((d) => ({ id: d.id, label: d.label, valor: fmt(d.v), fill: d.fill }))
    : undefined

  const totalPeriodoP3 = projecaoAnual.reduce((s, r) => s + r.fluxoLiquido, 0)

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
              valorPadrao={fmt(totaisAno.fluxo)}
              subtituloPadrao={`Fluxo líquido do ano ${anoCorrente}`}
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
                  valor: fmt(d.despesa),
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
            <DestaqueHover
              valor={fmt(p2Hover ? p2Hover.realizadoAcumulado : dadosOrcadoVsReal[11]?.realizadoAcumulado ?? 0)}
              subtitulo={
                p2Hover
                  ? `${p2Hover.labelCompleto}`
                  : "Saldo acumulado realizado até dezembro"
              }
              detalhes={
                p2Hover
                  ? [
                      { id: "o", label: "Orçado", valor: fmt(p2Hover.orcadoAcumulado), fill: CORES_FLUXO_CAIXA.orcado },
                      {
                        id: "r",
                        label: "Realizado",
                        valor: fmt(p2Hover.realizadoAcumulado),
                        fill: CORES_FLUXO_CAIXA.realizado,
                      },
                      {
                        id: "d",
                        label: "Diferença",
                        valor: fmt(p2Hover.diferenca),
                        fill: p2Hover.diferenca >= 0 ? CORES_FLUXO_CAIXA.diffPositiva : CORES_FLUXO_CAIXA.diffNegativa,
                        valorColor: p2Hover.diferenca >= 0 ? CORES_FLUXO_CAIXA.diffPositiva : CORES_FLUXO_CAIXA.diffNegativa,
                      },
                    ]
                  : undefined
              }
            />
            <GraficoOrcadoVsRealizado
              dados={dadosOrcadoVsReal}
              formatBRL={fmt}
              onHoverMes={setHoveredMesP2}
            />
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
              <label style={{ fontSize: 12, color: "#6B7280" }}>De</label>
              <Input
                type="number"
                min={anoCorrente}
                max={periodoFim}
                value={periodoInicio}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!Number.isNaN(v)) {
                    setPeriodoInicio(Math.max(anoCorrente, Math.min(v, periodoFim)))
                    setHoveredAnoP3(null)
                  }
                }}
                className="h-8 w-[88px] text-sm bg-white"
              />
              <label style={{ fontSize: 12, color: "#6B7280" }}>até</label>
              <Input
                type="number"
                min={periodoInicio}
                max={anoPlanoFim}
                value={periodoFim}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10)
                  if (!Number.isNaN(v)) {
                    setPeriodoFim(Math.min(anoPlanoFim, Math.max(v, periodoInicio)))
                    setHoveredAnoP3(null)
                  }
                }}
                className="h-8 w-[88px] text-sm bg-white"
              />
            </div>
          </div>

          <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
            <LegendaFluxo itens={LEGENDA_PAINEL3} />
            <DestaqueHover
              valor={fmt(p3Hover ? p3Hover.fluxoLiquido : totalPeriodoP3)}
              subtitulo={
                p3Hover
                  ? `Saldo líquido em ${p3Hover.ano}`
                  : `Total líquido entre ${Math.min(periodoInicio, periodoFim)} e ${Math.max(periodoInicio, periodoFim)}`
              }
              detalhes={detalhesP3}
            />

            <div
              style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 160 }}
              onMouseLeave={() => setHoveredAnoP3(null)}
            >
              {projecaoAnual.map((row) => {
                const anoInicio = anosVisiveisP3[0]
                const anoFim = anosVisiveisP3[anosVisiveisP3.length - 1]
                const mostrarAno = deveMostrarRotuloAno(row.ano, anoInicio, anoFim, stepP3)
                const ent = row.entradasTotal
                const sai = row.saidasTotal
                const barHeight =
                  maxAbsAnoP3 > 0
                    ? Math.max(20, Math.round((Math.max(ent, sai) / maxAbsAnoP3) * 100))
                    : 4

                const entradas = [
                  { id: "rent", valor: row.categorias.rentabilidade, fill: CORES_FLUXO_CAIXA.rentabilidade },
                  { id: "ap", valor: row.categorias.aportes, fill: CORES_FLUXO_CAIXA.aportes },
                ].filter((s) => s.valor > 0)

                const saidas = [
                  { id: "pass", valor: row.categorias.passivos, fill: CORES_FLUXO_CAIXA.passivos },
                  { id: "obj", valor: row.categorias.objetivos, fill: CORES_FLUXO_CAIXA.objetivos },
                  { id: "out", valor: row.categorias.outros, fill: CORES_FLUXO_CAIXA.outros },
                ].filter((s) => s.valor > 0)

                const temDados = ent > 0 || sai > 0

                return (
                  <div
                    key={row.ano}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      minWidth: 0,
                      height: "100%",
                      justifyContent: "center",
                    }}
                    onMouseEnter={() => setHoveredAnoP3(row.ano)}
                  >
                    <div
                      style={{
                        flex: 1,
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        opacity: hoveredAnoP3 === row.ano ? 1 : hoveredAnoP3 !== null ? 0.65 : 1,
                      }}
                    >
                      {temDados ? (
                        <>
                          <div
                            style={{
                              height: barHeight / 2,
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "flex-end",
                            }}
                          >
                            {(() => {
                              const h = entradas.map((s) =>
                                Math.max(2, Math.round((s.valor / ent) * (barHeight / 2))),
                              )
                              const used = h.slice(0, -1).reduce((a, b) => a + b, 0)
                              if (h.length) h[h.length - 1] = Math.max(2, barHeight / 2 - used)
                              return entradas.map((s, idx) => (
                                <div
                                  key={s.id}
                                  style={{
                                    width: "100%",
                                    height: h[idx],
                                    background: s.fill,
                                    borderRadius: idx === entradas.length - 1 ? "3px 3px 0 0" : 0,
                                  }}
                                />
                              ))
                            })()}
                          </div>
                          <div style={{ height: 1, background: "rgba(0,0,0,0.15)", width: "100%" }} />
                          <div style={{ height: barHeight / 2, display: "flex", flexDirection: "column" }}>
                            {(() => {
                              const h = saidas.map((s) =>
                                Math.max(2, Math.round((s.valor / sai) * (barHeight / 2))),
                              )
                              const used = h.slice(0, -1).reduce((a, b) => a + b, 0)
                              if (h.length) h[h.length - 1] = Math.max(2, barHeight / 2 - used)
                              return saidas.map((s, idx) => (
                                <div
                                  key={s.id}
                                  style={{
                                    width: "100%",
                                    height: h[idx],
                                    background: s.fill,
                                  }}
                                />
                              ))
                            })()}
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            width: "100%",
                            height: 4,
                            background: "var(--border, #D9D9D9)",
                            borderRadius: 2,
                            margin: "auto 0",
                          }}
                        />
                      )}
                    </div>
                    <span
                      style={{
                        marginTop: 8,
                        fontSize: 10,
                        color: "#6B7280",
                        visibility: mostrarAno ? "visible" : "hidden",
                        height: 14,
                      }}
                    >
                      {mostrarAno ? row.ano : "\u00A0"}
                    </span>
                  </div>
                )
              })}
            </div>
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
