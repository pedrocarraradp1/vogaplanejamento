"use client"

import { useMemo, useState } from "react"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { CenarioSecaoBox } from "@/components/ui/cenario-secao-box"
import { Input } from "@/components/ui/input"
import { InputMoeda } from "@/components/ui/input-moeda"
import { KpiCard, KpiGrid } from "@/components/ui/kpi-card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TabelaComparacaoCenarios } from "@/components/ui/tabela-comparacao-cenarios"
import { CHART_TOOLTIP_PROPS } from "@/lib/chart-tooltip"
import { encontrarIdadeLiberdadeFinanceira } from "@/lib/engine"
import { usePlano } from "@/lib/plano-context"
import { usePlanoReadOnly } from "@/lib/plano-readonly-context"
import {
  calcularAporteNecessarioLivre,
  cortarAoAtingirRenda,
  enriquecerAnoProjecaoLivre,
  idadeLiberdadeFinanceiraLivre,
  patrimonioNecessarioRendaReal,
  projetarCenariosLivre,
  projetarLivre,
  projetarLivreTempoRenda,
  TAXAS_CENARIOS_PROJECAO_LIVRE,
  type ModoProjecaoLivre,
  type ProjecaoLivreState,
} from "@/lib/projecao-livre"
import { buildDadosLinhaCenarios } from "@/lib/use-dados-cenarios"
import { VOGA } from "@/lib/voga-tokens"

const MODOS: { value: ModoProjecaoLivre; label: string }[] = [
  { value: "padrao", label: "Projeção Padrão" },
  { value: "tempo-renda", label: "Calcular Tempo para Renda Desejada" },
  { value: "aporte-necessario", label: "Calcular Aporte Necessário" },
]

type ResultadoLivre =
  | { modo: "padrao"; projecao: ReturnType<typeof projetarLivre> }
  | { modo: "tempo-renda"; projecao: ReturnType<typeof projetarLivreTempoRenda> }
  | { modo: "aporte-necessario"; dados: ReturnType<typeof calcularAporteNecessarioLivre> }

interface ProjecaoLivreProps {
  onNavigate: (section: string) => void
  readOnly?: boolean
}

export function ProjecaoLivre({ readOnly }: ProjecaoLivreProps) {
  const { state, setProjecaoLivre } = usePlano()
  const planoReadOnly = usePlanoReadOnly()
  const bloqueado = readOnly || planoReadOnly
  const form = state.projecaoLivre
  const moeda = state.moeda === "USD" ? "USD" : "BRL"

  const [resultado, setResultado] = useState<ResultadoLivre | null>(null)

  const formatarEixo = (valor: number) => {
    const prefix = moeda === "USD" ? "US$ " : "R$ "
    if (Math.abs(valor) >= 1_000_000) return `${prefix}${(valor / 1_000_000).toFixed(1)}M`
    if (Math.abs(valor) >= 1_000) return `${prefix}${(valor / 1_000).toFixed(0)}K`
    return `${prefix}${valor.toFixed(0)}`
  }

  const formatarMoedaCompleta = (valor: number) =>
    new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: moeda,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor)

  const patch = (partial: Partial<ProjecaoLivreState>) => {
    if (bloqueado) return
    setProjecaoLivre(partial)
    setResultado(null)
  }

  const calcular = () => {
    if (form.modo === "padrao") {
      setResultado({ modo: "padrao", projecao: projetarLivre(form) })
      return
    }
    if (form.modo === "tempo-renda") {
      setResultado({
        modo: "tempo-renda",
        projecao: cortarAoAtingirRenda(projetarLivreTempoRenda(form), form.rendaMensalDesejada),
      })
      return
    }
    setResultado({ modo: "aporte-necessario", dados: calcularAporteNecessarioLivre(form) })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] text-[var(--accent)] mb-1">Planejamento Financeiro</p>
        <h1 className="text-2xl font-normal text-foreground m-0">
          Projeção <span style={{ color: "var(--accent)" }}>Livre</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Simulador rápido para reunião — isolado dos dados do plano.
        </p>
      </div>

      <CenarioSecaoBox title="Projeção de Aposentadoria">
        <div className="space-y-2 max-w-md">
          <Label className="field-label">Modo de Cálculo</Label>
          <Select
            value={form.modo}
            onValueChange={(v) => patch({ modo: v as ModoProjecaoLivre })}
            disabled={bloqueado}
          >
            <SelectTrigger className="form-card text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="form-card">
              {MODOS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <CampoMoeda
            label="Saldo inicial"
            value={form.saldoInicial}
            onChange={(saldoInicial) => patch({ saldoInicial })}
            moeda={moeda}
          />
          {form.modo !== "aporte-necessario" ? (
            <CampoMoeda
              label="Aporte mensal"
              value={form.aporteMensal}
              onChange={(aporteMensal) => patch({ aporteMensal })}
              moeda={moeda}
            />
          ) : null}
          <CampoMoeda
            label="Aporte extra anual"
            value={form.aporteExtraAnual}
            onChange={(aporteExtraAnual) => patch({ aporteExtraAnual })}
            moeda={moeda}
          />
          {form.modo === "padrao" ? (
            <CampoNumero
              label="Prazo (anos)"
              value={form.prazo}
              onChange={(prazo) => patch({ prazo })}
              disabled={bloqueado}
            />
          ) : null}
          {form.modo === "aporte-necessario" ? (
            <CampoNumero
              label="Tempo desejado (anos)"
              value={form.tempoDesejado}
              onChange={(tempoDesejado) => patch({ tempoDesejado })}
              disabled={bloqueado}
            />
          ) : null}
          <CampoNumero
            label="Taxa de rendimento anual (%)"
            value={form.taxaRendimento}
            onChange={(taxaRendimento) => patch({ taxaRendimento })}
            step="0.1"
            disabled={bloqueado}
          />
          <CampoNumero
            label="Inflação anual (%)"
            value={form.inflacao}
            onChange={(inflacao) => patch({ inflacao })}
            step="0.1"
            disabled={bloqueado}
          />
          {form.modo !== "padrao" ? (
            <CampoNumero
              label="Idade atual"
              value={form.idadeAtual}
              onChange={(idadeAtual) => patch({ idadeAtual })}
              disabled={bloqueado}
            />
          ) : null}
          {form.modo === "padrao" ? (
            <>
              <CampoNumero
                label="Idade atual"
                value={form.idadeAtual}
                onChange={(idadeAtual) => patch({ idadeAtual })}
                disabled={bloqueado}
              />
              <CampoNumero
                label="Idade de aposentadoria"
                value={form.idadeApos}
                onChange={(idadeApos) => patch({ idadeApos })}
                disabled={bloqueado}
              />
            </>
          ) : null}
          <CampoMoeda
            label={
              form.modo === "tempo-renda" || form.modo === "aporte-necessario"
                ? "Renda mensal desejada (real)"
                : "Renda mensal desejada na aposentadoria"
            }
            value={form.rendaMensalDesejada}
            onChange={(rendaMensalDesejada) => patch({ rendaMensalDesejada })}
            moeda={moeda}
          />
          {form.modo === "padrao" ? (
            <>
              <CampoMoeda
                label="Nova entrada (opcional)"
                value={form.novaEntradaValor}
                onChange={(novaEntradaValor) => patch({ novaEntradaValor })}
                moeda={moeda}
              />
              <CampoNumero
                label="Idade da nova entrada"
                value={form.novaEntradaIdade}
                onChange={(novaEntradaIdade) => patch({ novaEntradaIdade })}
                disabled={bloqueado}
              />
              <CampoNumero
                label="Ou daqui a (anos)"
                value={
                  form.novaEntradaIdade > 0
                    ? Math.max(0, form.novaEntradaIdade - form.idadeAtual)
                    : 0
                }
                onChange={(anos) =>
                  patch({ novaEntradaIdade: form.idadeAtual + Math.max(0, anos) })
                }
                disabled={bloqueado}
              />
            </>
          ) : null}
        </div>

        <Button type="button" onClick={calcular} className="bg-primary text-primary-foreground">
          Calcular Projeção
        </Button>
      </CenarioSecaoBox>

      {resultado?.modo === "padrao" ? (
        <ResultadoPadrao
          form={form}
          projecao={resultado.projecao}
          formatarEixo={formatarEixo}
          formatarMoedaCompleta={formatarMoedaCompleta}
        />
      ) : null}
      {resultado?.modo === "tempo-renda" ? (
        <ResultadoTempoRenda
          form={form}
          projecao={resultado.projecao}
          formatarEixo={formatarEixo}
          formatarMoedaCompleta={formatarMoedaCompleta}
        />
      ) : null}
      {resultado?.modo === "aporte-necessario" ? (
        <ResultadoAporteNecessario
          dados={resultado.dados}
          formatarMoedaCompleta={formatarMoedaCompleta}
        />
      ) : null}
    </div>
  )
}

function CampoMoeda({
  label,
  value,
  onChange,
  moeda,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  moeda: "BRL" | "USD"
}) {
  return (
    <div className="space-y-2">
      <Label className="field-label">{label}</Label>
      <InputMoeda
        value={value}
        onChange={onChange}
        moeda={moeda}
        className="form-card text-foreground"
      />
    </div>
  )
}

function CampoNumero({
  label,
  value,
  onChange,
  step = "1",
  disabled,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: string
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label className="field-label">{label}</Label>
      <Input
        type="number"
        step={step}
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        disabled={disabled}
        className="form-card text-foreground"
      />
    </div>
  )
}

function ResultadoPadrao({
  form,
  projecao,
  formatarEixo,
  formatarMoedaCompleta,
}: {
  form: ProjecaoLivreState
  projecao: ReturnType<typeof projetarLivre>
  formatarEixo: (v: number) => string
  formatarMoedaCompleta: (v: number) => string
}) {
  const dados = useMemo(
    () => enriquecerAnoProjecaoLivre(projecao, form, form.saldoInicial),
    [projecao, form],
  )
  const anoApos = dados.find((p) => p.idade === form.idadeApos) ?? dados[dados.length - 1]
  const rendaGerada = Number(anoApos?.rendaMensalReal) || 0
  const idadeLF = idadeLiberdadeFinanceiraLivre(projecao, form)

  const cenarios = useMemo(() => projetarCenariosLivre(form), [form])
  const linhasCenarios = useMemo(
    () => buildDadosLinhaCenarios(cenarios.conservador, cenarios.moderado, cenarios.arrojado),
    [cenarios],
  )

  const metricasCenario = (
    key: "conservador" | "moderado" | "arrojado",
    taxa: number,
    serie: typeof cenarios.conservador,
  ) => {
    const ponto = serie.find((p) => p.idade === form.idadeApos) ?? serie[serie.length - 1]
    const lf = encontrarIdadeLiberdadeFinanceira(
      serie,
      taxa,
      form.inflacao,
      form.rendaMensalDesejada,
      [],
    )
    return {
      key,
      nome: key === "arrojado" ? "Arrojado" : key === "moderado" ? "Moderado" : "Conservador",
      taxa,
      patrimonioApos: Number(ponto?.saldoNominal) || 0,
      patrimonioAposReal: Number(ponto?.saldoReal) || 0,
      rendaMensalAposReal: Number(ponto?.rendaMensalReal) || 0,
      idadeIF: lf,
    }
  }

  const colunasCenario = [
    metricasCenario("conservador", TAXAS_CENARIOS_PROJECAO_LIVRE.conservador, cenarios.conservador),
    metricasCenario("moderado", TAXAS_CENARIOS_PROJECAO_LIVRE.moderado, cenarios.moderado),
    metricasCenario("arrojado", TAXAS_CENARIOS_PROJECAO_LIVRE.arrojado, cenarios.arrojado),
  ]

  return (
    <>
      <KpiGrid>
        <KpiCard
          label="Patrimônio na aposentadoria (nominal)"
          value={formatarMoedaCompleta(Number(anoApos?.saldoNominal) || 0)}
          valueColor={VOGA.brasilia}
        />
        <KpiCard
          label="Patrimônio na aposentadoria (real)"
          value={formatarMoedaCompleta(Number(anoApos?.saldoReal) || 0)}
          valueColor={VOGA.noite}
        />
        <KpiCard
          label="Renda mensal gerada"
          value={formatarMoedaCompleta(rendaGerada)}
          hint="Poder de compra de hoje"
          valueColor={VOGA.brasilia}
        />
        <KpiCard
          label="Idade de independência financeira"
          value={idadeLF != null ? `${idadeLF} anos` : "—"}
        />
      </KpiGrid>

      <CenarioSecaoBox title="Evolução do Patrimônio">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados} margin={{ top: 10, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis
                dataKey="idade"
                tick={{ fill: "var(--text-label)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
              />
              <YAxis
                tick={{ fill: "var(--text-label)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatarEixo}
              />
              <Tooltip
                {...CHART_TOOLTIP_PROPS}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload as (typeof dados)[number] | undefined
                  if (!d) return null
                  return (
                    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-md space-y-1.5">
                      <p className="font-medium text-foreground">Idade: {label} anos</p>
                      <div>
                        <p>Valor Nominal: {formatarMoedaCompleta(d.saldoNominal)}</p>
                        <p className="text-muted-foreground">
                          Renda mensal: {formatarMoedaCompleta(d.rendaMensalNominal)}/mês
                        </p>
                      </div>
                      <div>
                        <p>Valor Real: {formatarMoedaCompleta(d.saldoReal)}</p>
                        <p className="text-muted-foreground">
                          Renda mensal: {formatarMoedaCompleta(d.rendaMensalRealInicio)}/mês
                        </p>
                      </div>
                    </div>
                  )
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="saldoNominal"
                name="Valor Nominal"
                stroke={VOGA.brasilia}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="saldoReal"
                name="Valor Real"
                stroke={VOGA.noite}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CenarioSecaoBox>

      <CenarioSecaoBox
        title="Comparação de cenários"
        description="Conservador, moderado e arrojado com as mesmas taxas da aba Cenários, aplicadas sobre estes inputs."
      >
        <TabelaComparacaoCenarios
          colunas={colunasCenario.map((c) => ({ key: c.key, nome: c.nome }))}
          linhas={[
            {
              label: "Rentabilidade",
              values: colunasCenario.map((c) => `${c.taxa}% a.a.`),
            },
            {
              label: "Patrimônio na aposentadoria (real)",
              values: colunasCenario.map((c) => formatarMoedaCompleta(c.patrimonioAposReal)),
            },
            {
              label: "Renda mensal na aposentadoria (real)",
              values: colunasCenario.map((c) => formatarMoedaCompleta(c.rendaMensalAposReal)),
            },
            {
              label: "Liberdade financeira",
              values: colunasCenario.map((c) => (c.idadeIF != null ? `${c.idadeIF} anos` : "—")),
            },
          ]}
        />
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={linhasCenarios} margin={{ top: 10, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis
                dataKey="idade"
                tick={{ fill: "var(--text-label)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
              />
              <YAxis
                tick={{ fill: "var(--text-label)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatarEixo}
              />
              <Tooltip
                {...CHART_TOOLTIP_PROPS}
                labelFormatter={(label) => `Idade: ${label} anos`}
                formatter={(value: number) => formatarMoedaCompleta(value)}
              />
              <Legend
                formatter={(value) => {
                  if (value === "conservador") return `Conservador (${TAXAS_CENARIOS_PROJECAO_LIVRE.conservador}% a.a.)`
                  if (value === "moderado") return `Moderado (${TAXAS_CENARIOS_PROJECAO_LIVRE.moderado}% a.a.)`
                  if (value === "arrojado" || value === "agressivo")
                    return `Arrojado (${TAXAS_CENARIOS_PROJECAO_LIVRE.arrojado}% a.a.)`
                  return String(value)
                }}
              />
              <Line type="monotone" dataKey="conservador" name="conservador" stroke="#1F6D3E" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="moderado" name="moderado" stroke={VOGA.brasilia} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="agressivo" name="arrojado" stroke="#8A7220" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CenarioSecaoBox>
    </>
  )
}

function ResultadoTempoRenda({
  form,
  projecao,
  formatarEixo,
  formatarMoedaCompleta,
}: {
  form: ProjecaoLivreState
  projecao: ReturnType<typeof projetarLivreTempoRenda>
  formatarEixo: (v: number) => string
  formatarMoedaCompleta: (v: number) => string
}) {
  const atingiu = (Number(projecao.at(-1)?.rendaMensalReal) || 0) >= form.rendaMensalDesejada
  const anos = atingiu ? Number(projecao.at(-1)?.t) || 0 : null
  const necessario = patrimonioNecessarioRendaReal(form)

  return (
    <>
      <KpiGrid>
        <KpiCard
          label="Tempo para a renda desejada"
          value={
            anos != null
              ? `${anos} ${anos === 1 ? "ano" : "anos"} para atingir ${formatarMoedaCompleta(form.rendaMensalDesejada)}/mês`
              : "Não atinge em 60 anos"
          }
          valueColor={VOGA.brasilia}
        />
        <KpiCard
          label="Patrimônio necessário"
          value={formatarMoedaCompleta(necessario)}
          hint="Perpetuidade em termos reais"
        />
      </KpiGrid>
      <CenarioSecaoBox title="Patrimônio e renda gerada">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={projecao} margin={{ top: 10, right: 36, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis
                dataKey="idade"
                tick={{ fill: "var(--text-label)", fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: "rgba(0,0,0,0.08)" }}
              />
              <YAxis
                yAxisId="pat"
                tick={{ fill: "var(--text-label)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatarEixo}
              />
              <YAxis
                yAxisId="renda"
                orientation="right"
                tick={{ fill: "var(--text-label)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatarEixo}
              />
              <Tooltip
                {...CHART_TOOLTIP_PROPS}
                formatter={(value: number, name: string) => [
                  formatarMoedaCompleta(value),
                  name === "rendaMensalReal" ? "Renda mensal gerada" : "Patrimônio real",
                ]}
                labelFormatter={(label) => `Idade: ${label} anos`}
              />
              <Legend />
              <Bar
                yAxisId="pat"
                dataKey="saldoReal"
                name="Patrimônio real"
                fill={VOGA.brasilia}
                fillOpacity={0.35}
                radius={[2, 2, 0, 0]}
              />
              <Line
                yAxisId="renda"
                type="monotone"
                dataKey="rendaMensalReal"
                name="Renda mensal gerada"
                stroke={VOGA.noite}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CenarioSecaoBox>
    </>
  )
}

function ResultadoAporteNecessario({
  dados,
  formatarMoedaCompleta,
}: {
  dados: ReturnType<typeof calcularAporteNecessarioLivre>
  formatarMoedaCompleta: (v: number) => string
}) {
  return (
    <CenarioSecaoBox title="Resultado">
      <div
        className="rounded-xl border p-6 text-center"
        style={{
          background: "rgba(16,102,218,0.08)",
          borderColor: "rgba(16,102,218,0.3)",
        }}
      >
        <p className="field-label">Aporte Mensal Necessário</p>
        <p className="text-3xl font-bold mt-2" style={{ color: VOGA.brasilia }}>
          {formatarMoedaCompleta(dados.aporteMensal)}
        </p>
        <p className="text-sm text-foreground mt-4">
          Montante final (real): {formatarMoedaCompleta(dados.patrimonioFinalReal)}
        </p>
        <p className="text-sm text-foreground">
          Renda mensal real: {formatarMoedaCompleta(dados.rendaMensalReal)}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Equivalente nominal: {formatarMoedaCompleta(dados.rendaMensalNominal)}
        </p>
      </div>
    </CenarioSecaoBox>
  )
}
