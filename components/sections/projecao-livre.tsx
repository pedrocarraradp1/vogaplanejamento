"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ChevronDown, Copy, RotateCcw } from "lucide-react"
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { CenarioSecaoBox } from "@/components/ui/cenario-secao-box"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { InputMoeda } from "@/components/ui/input-moeda"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { TabelaComparacaoCenarios } from "@/components/ui/tabela-comparacao-cenarios"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CHART_TOOLTIP_PROPS } from "@/lib/chart-tooltip"
import { encontrarIdadeLiberdadeFinanceira } from "@/lib/engine"
import { usePlano } from "@/lib/plano-context"
import { usePlanoReadOnly } from "@/lib/plano-readonly-context"
import {
  calcularAporteNecessarioLivre,
  cortarAoAtingirRenda,
  defaultProjecaoLivre,
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
import { cn } from "@/lib/utils"

const DEBOUNCE_MS = 120
const ANIM_MS = 300
const COUNT_MS = 320

const SALDO_MAX = 20_000_000
const SALDO_STEP = 50_000
const SALDO_POWER = 2.4
const SALDO_SLIDER_MAX = 1000
const APORTE_MAX = 100_000
const RENDA_MAX = 200_000
const IDADE_MIN = 18
const IDADE_MAX = 90
const PRAZO_MIN = 5
const PRAZO_MAX = 60

const MODOS: { value: ModoProjecaoLivre; label: string }[] = [
  { value: "padrao", label: "Padrão" },
  { value: "tempo-renda", label: "Tempo para renda" },
  { value: "aporte-necessario", label: "Aporte necessário" },
]

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

  const [formDebounced, setFormDebounced] = useState(form)
  const [entradaAberta, setEntradaAberta] = useState(
    () => form.novaEntradaValor > 0 || form.novaEntradaIdade > 0,
  )

  useEffect(() => {
    const timer = window.setTimeout(() => setFormDebounced(form), DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [form])

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
  }

  const resultado = useMemo(() => {
    if (formDebounced.modo === "padrao") {
      return { modo: "padrao" as const, projecao: projetarLivre(formDebounced) }
    }
    if (formDebounced.modo === "tempo-renda") {
      return {
        modo: "tempo-renda" as const,
        projecao: cortarAoAtingirRenda(
          projetarLivreTempoRenda(formDebounced),
          formDebounced.rendaMensalDesejada,
        ),
      }
    }
    return {
      modo: "aporte-necessario" as const,
      dados: calcularAporteNecessarioLivre(formDebounced),
    }
  }, [formDebounced])

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

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,1fr)_minmax(0,2fr)] gap-6 items-start">
        <aside className="form-card space-y-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-var(--header-height)-48px)] lg:overflow-y-auto">
          <Tabs
            value={form.modo}
            onValueChange={(v) => patch({ modo: v as ModoProjecaoLivre })}
          >
            <TabsList className="grid h-auto w-full grid-cols-3 p-1">
              {MODOS.map((m) => (
                <TabsTrigger
                  key={m.value}
                  value={m.value}
                  disabled={bloqueado}
                  className="h-auto whitespace-normal px-1.5 py-1.5 text-center text-[11px] leading-tight sm:text-xs"
                >
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <SliderMoeda
            label="Saldo inicial"
            value={form.saldoInicial}
            moeda={moeda}
            format={formatarMoedaCompleta}
            disabled={bloqueado}
            sliderMax={SALDO_SLIDER_MAX}
            sliderValue={saldoParaSlider(form.saldoInicial)}
            onSliderChange={(pos) => patch({ saldoInicial: sliderParaSaldo(pos) })}
            onCommit={(saldoInicial) =>
              patch({ saldoInicial: clamp(saldoInicial, 0, SALDO_MAX) })
            }
          />

          {form.modo === "aporte-necessario" ? (
            <SliderNumero
              label="Tempo desejado"
              value={form.tempoDesejado}
              min={PRAZO_MIN}
              max={PRAZO_MAX}
              step={1}
              format={(v) => `${Math.round(v)} anos`}
              disabled={bloqueado}
              onChange={(tempoDesejado) => {
                const tempo = clamp(Math.round(tempoDesejado), PRAZO_MIN, PRAZO_MAX)
                const idadeApos = clamp(form.idadeAtual + tempo, IDADE_MIN + 1, IDADE_MAX)
                patch({ tempoDesejado: tempo, idadeApos })
              }}
            />
          ) : (
            <SliderMoeda
              label="Aporte mensal"
              value={form.aporteMensal}
              moeda={moeda}
              format={formatarMoedaCompleta}
              disabled={bloqueado}
              min={0}
              max={APORTE_MAX}
              step={500}
              onChange={(aporteMensal) =>
                patch({ aporteMensal: clamp(aporteMensal, 0, APORTE_MAX) })
              }
            />
          )}

          <SliderNumero
            label="Taxa de rendimento"
            value={form.taxaRendimento}
            min={0}
            max={20}
            step={0.25}
            format={(v) => `${fmtPct(v)}% a.a.`}
            parse={parseDecimal}
            disabled={bloqueado}
            onChange={(taxaRendimento) =>
              patch({ taxaRendimento: snap(clamp(taxaRendimento, 0, 20), 0.25) })
            }
          />

          <SliderNumero
            label="Inflação"
            value={form.inflacao}
            min={0}
            max={12}
            step={0.25}
            format={(v) => `${fmtPct(v)}% a.a.`}
            parse={parseDecimal}
            disabled={bloqueado}
            onChange={(inflacao) => patch({ inflacao: snap(clamp(inflacao, 0, 12), 0.25) })}
          />

          <IdadesRangeSlider
            idadeAtual={form.idadeAtual}
            idadeApos={form.idadeApos}
            disabled={bloqueado}
            onChange={(idadeAtual, idadeApos) => {
              const next: Partial<ProjecaoLivreState> = { idadeAtual, idadeApos }
              if (form.modo === "aporte-necessario") {
                next.tempoDesejado = clamp(idadeApos - idadeAtual, PRAZO_MIN, PRAZO_MAX)
              }
              patch(next)
            }}
          />

          <SliderMoeda
            label={
              form.modo === "padrao"
                ? "Renda mensal desejada na aposentadoria"
                : "Renda mensal desejada (real)"
            }
            value={form.rendaMensalDesejada}
            moeda={moeda}
            format={formatarMoedaCompleta}
            disabled={bloqueado}
            min={0}
            max={RENDA_MAX}
            step={500}
            onChange={(rendaMensalDesejada) =>
              patch({ rendaMensalDesejada: clamp(rendaMensalDesejada, 0, RENDA_MAX) })
            }
          />

          {form.modo === "padrao" ? (
            <SliderNumero
              label="Prazo"
              value={form.prazo}
              min={PRAZO_MIN}
              max={PRAZO_MAX}
              step={1}
              format={(v) => `${Math.round(v)} anos`}
              disabled={bloqueado}
              onChange={(prazo) => patch({ prazo: clamp(Math.round(prazo), PRAZO_MIN, PRAZO_MAX) })}
            />
          ) : null}

          {form.modo === "padrao" ? (
            <Collapsible
              open={entradaAberta}
              onOpenChange={(open) => {
                setEntradaAberta(open)
                if (open && form.novaEntradaIdade <= 0) {
                  patch({ novaEntradaIdade: form.idadeAtual })
                }
              }}
            >
              <CollapsibleTrigger
                disabled={bloqueado}
                className="flex w-full items-center justify-between rounded-md py-1 text-left text-sm font-medium text-foreground hover:text-primary disabled:opacity-60"
              >
                Adicionar entrada futura
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    entradaAberta && "rotate-180",
                  )}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-3">
                <SliderMoeda
                  label="Valor da entrada"
                  value={form.novaEntradaValor}
                  moeda={moeda}
                  format={formatarMoedaCompleta}
                  disabled={bloqueado}
                  sliderMax={SALDO_SLIDER_MAX}
                  sliderValue={saldoParaSlider(form.novaEntradaValor)}
                  onSliderChange={(pos) => patch({ novaEntradaValor: sliderParaSaldo(pos) })}
                  onCommit={(novaEntradaValor) =>
                    patch({ novaEntradaValor: clamp(novaEntradaValor, 0, SALDO_MAX) })
                  }
                />
                <SliderNumero
                  label="Idade da entrada"
                  value={form.novaEntradaIdade || form.idadeAtual}
                  min={IDADE_MIN}
                  max={IDADE_MAX}
                  step={1}
                  format={(v) => `${Math.round(v)} anos`}
                  disabled={bloqueado}
                  onChange={(novaEntradaIdade) =>
                    patch({ novaEntradaIdade: clamp(Math.round(novaEntradaIdade), IDADE_MIN, IDADE_MAX) })
                  }
                />
              </CollapsibleContent>
            </Collapsible>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={bloqueado}
              onClick={() => {
                if (bloqueado) return
                setProjecaoLivre(defaultProjecaoLivre)
                setEntradaAberta(false)
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar padrões
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled>
              <Copy className="h-3.5 w-3.5" />
              Copiar para o plano
            </Button>
          </div>
        </aside>

        <section className="min-w-0 space-y-4">
          {resultado.modo === "padrao" ? (
            <ResultadoPadrao
              form={formDebounced}
              projecao={resultado.projecao}
              formatarEixo={formatarEixo}
              formatarMoedaCompleta={formatarMoedaCompleta}
            />
          ) : null}
          {resultado.modo === "tempo-renda" ? (
            <ResultadoTempoRenda
              form={formDebounced}
              projecao={resultado.projecao}
              formatarEixo={formatarEixo}
              formatarMoedaCompleta={formatarMoedaCompleta}
            />
          ) : null}
          {resultado.modo === "aporte-necessario" ? (
            <ResultadoAporteNecessario
              form={formDebounced}
              dados={resultado.dados}
              formatarEixo={formatarEixo}
              formatarMoedaCompleta={formatarMoedaCompleta}
            />
          ) : null}
        </section>
      </div>
    </div>
  )
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, n))
}

function snap(n: number, step: number) {
  if (step <= 0) return n
  return Math.round(n / step) * step
}

function fmtPct(v: number) {
  const rounded = snap(v, 0.25)
  return rounded.toFixed(2).replace(".", ",").replace(/,00$/, "").replace(/,(\d)0$/, ",$1")
}

function parseDecimal(s: string): number | null {
  const t = s.trim().replace(/%/g, "").replace(/\s/g, "").replace(",", ".")
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function saldoParaSlider(valor: number) {
  const t = clamp(valor / SALDO_MAX, 0, 1)
  return Math.round(Math.pow(t, 1 / SALDO_POWER) * SALDO_SLIDER_MAX)
}

function sliderParaSaldo(pos: number) {
  const t = clamp(pos / SALDO_SLIDER_MAX, 0, 1)
  return snap(SALDO_MAX * Math.pow(t, SALDO_POWER), SALDO_STEP)
}

function useAnimatedNumber(target: number, duration = COUNT_MS) {
  const [current, setCurrent] = useState(target)
  const currentRef = useRef(target)
  currentRef.current = current

  useEffect(() => {
    const from = currentRef.current
    if (from === target) return
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - (1 - p) ** 3
      const next = from + (target - from) * eased
      setCurrent(p >= 1 ? target : next)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return current
}

function KpiAnimado({
  label,
  value,
  format,
  hint,
  color,
}: {
  label: string
  value: number | null
  format: (n: number) => string
  hint?: string
  color?: string
}) {
  const animated = useAnimatedNumber(value ?? 0)
  return (
    <div className="kpi-card min-w-0 !mb-0 py-4 px-4">
      <p className="text-[10px] uppercase tracking-[0.06em] text-[#5F85B8] mb-1.5 leading-snug">
        {label}
      </p>
      <p
        className="text-[22px] xl:text-[26px] font-medium tabular-nums leading-tight truncate"
        style={{ color: color ?? VOGA.concreto }}
      >
        {value == null ? "—" : format(animated)}
      </p>
      {hint ? <p className="text-[10px] text-[#5F85B8] mt-1">{hint}</p> : null}
    </div>
  )
}

function ValorMoedaEditavel({
  value,
  onChange,
  format,
  moeda,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  format: (v: number) => string
  moeda: "BRL" | "USD"
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  if (editing && !disabled) {
    return (
      <InputMoeda
        autoFocus
        value={value}
        onChange={onChange}
        moeda={moeda}
        vazioQuandoZero={false}
        className="h-7 w-[8.2rem] px-2 text-right text-xs form-input"
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur()
        }}
      />
    )
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => setEditing(true)}
      className="h-7 min-w-[8.2rem] rounded-md px-2 text-right text-sm font-semibold tabular-nums text-foreground hover:bg-secondary/80 disabled:pointer-events-none"
    >
      {format(value)}
    </button>
  )
}

function ValorNumeroEditavel({
  value,
  onChange,
  format,
  parse = parseDecimal,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  format: (v: number) => string
  parse?: (s: string) => number | null
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const commit = () => {
    const parsed = parse(draft)
    if (parsed != null) onChange(parsed)
    setEditing(false)
  }

  if (editing && !disabled) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit()
          if (e.key === "Escape") setEditing(false)
        }}
        className="h-7 w-[7.2rem] px-2 text-right text-xs form-input"
      />
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        setDraft(String(value).replace(".", ","))
        setEditing(true)
      }}
      className="h-7 min-w-[7.2rem] rounded-md px-2 text-right text-sm font-semibold tabular-nums text-foreground hover:bg-secondary/80 disabled:pointer-events-none"
    >
      {format(value)}
    </button>
  )
}

function SliderMoeda({
  label,
  value,
  moeda,
  format,
  disabled,
  min,
  max,
  step,
  sliderMax,
  sliderValue,
  onSliderChange,
  onChange,
  onCommit,
}: {
  label: string
  value: number
  moeda: "BRL" | "USD"
  format: (v: number) => string
  disabled?: boolean
  min?: number
  max?: number
  step?: number
  sliderMax?: number
  sliderValue?: number
  onSliderChange?: (pos: number) => void
  onChange?: (v: number) => void
  onCommit?: (v: number) => void
}) {
  const linear = sliderValue == null
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label className="field-label">{label}</Label>
        <ValorMoedaEditavel
          value={value}
          onChange={(v) => (onCommit ?? onChange)?.(v)}
          format={format}
          moeda={moeda}
          disabled={disabled}
        />
      </div>
      <Slider
        value={[linear ? clamp(value, min ?? 0, max ?? 0) : (sliderValue ?? 0)]}
        min={linear ? (min ?? 0) : 0}
        max={linear ? (max ?? 0) : (sliderMax ?? 100)}
        step={linear ? (step ?? 1) : 1}
        disabled={disabled}
        onValueChange={(values) => {
          const pos = values[0] ?? 0
          if (onSliderChange) onSliderChange(pos)
          else onChange?.(pos)
        }}
      />
    </div>
  )
}

function SliderNumero({
  label,
  value,
  min,
  max,
  step,
  format,
  parse,
  disabled,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (v: number) => string
  parse?: (s: string) => number | null
  disabled?: boolean
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label className="field-label">{label}</Label>
        <ValorNumeroEditavel
          value={value}
          onChange={onChange}
          format={format}
          parse={parse}
          disabled={disabled}
        />
      </div>
      <Slider
        value={[clamp(value, min, max)]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(values) => onChange(values[0] ?? value)}
      />
    </div>
  )
}

function IdadesRangeSlider({
  idadeAtual,
  idadeApos,
  disabled,
  onChange,
}: {
  idadeAtual: number
  idadeApos: number
  disabled?: boolean
  onChange: (idadeAtual: number, idadeApos: number) => void
}) {
  const lo = clamp(Math.round(idadeAtual) || IDADE_MIN, IDADE_MIN, IDADE_MAX - 1)
  const hi = clamp(Math.round(idadeApos) || lo + 1, lo + 1, IDADE_MAX)

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label className="field-label">Idade atual → aposentadoria</Label>
        <div className="flex items-center gap-1">
          <ValorNumeroEditavel
            value={idadeAtual}
            format={(v) => `${Math.round(v)}`}
            disabled={disabled}
            onChange={(v) => {
              const atual = clamp(Math.round(v), IDADE_MIN, IDADE_MAX - 1)
              onChange(atual, Math.max(atual + 1, hi))
            }}
          />
          <span className="text-muted-foreground text-sm">–</span>
          <ValorNumeroEditavel
            value={idadeApos}
            format={(v) => `${Math.round(v)} anos`}
            disabled={disabled}
            onChange={(v) => {
              const apos = clamp(Math.round(v), IDADE_MIN + 1, IDADE_MAX)
              onChange(Math.min(lo, apos - 1), apos)
            }}
          />
        </div>
      </div>
      <Slider
        value={[lo, hi]}
        min={IDADE_MIN}
        max={IDADE_MAX}
        step={1}
        minStepsBetweenThumbs={1}
        disabled={disabled}
        onValueChange={(values) => {
          const a = Math.round(values[0] ?? lo)
          const b = Math.round(values[1] ?? hi)
          onChange(Math.min(a, b), Math.max(a, b))
        }}
      />
    </div>
  )
}

function FaixaKpis({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">{children}</div>
}

function GraficoPatrimonio({
  dados,
  idadeApos,
  idadeLF,
  formatarEixo,
  formatarMoedaCompleta,
}: {
  dados: { idade: number; saldoNominal: number; saldoReal: number; rendaMensalNominal?: number; rendaMensalRealInicio?: number }[]
  idadeApos: number
  idadeLF: number | null
  formatarEixo: (v: number) => string
  formatarMoedaCompleta: (v: number) => string
}) {
  const pontoIF = idadeLF != null ? dados.find((d) => d.idade === idadeLF) : undefined

  return (
    <CenarioSecaoBox title="Evolução do Patrimônio">
      <div className="h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
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
                      {d.rendaMensalNominal != null ? (
                        <p className="text-muted-foreground">
                          Renda mensal: {formatarMoedaCompleta(d.rendaMensalNominal)}/mês
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <p>Valor Real: {formatarMoedaCompleta(d.saldoReal)}</p>
                      {d.rendaMensalRealInicio != null ? (
                        <p className="text-muted-foreground">
                          Renda mensal: {formatarMoedaCompleta(d.rendaMensalRealInicio)}/mês
                        </p>
                      ) : null}
                    </div>
                  </div>
                )
              }}
            />
            <Legend />
            <ReferenceLine
              x={idadeApos}
              stroke={VOGA.brasilia}
              strokeDasharray="5 5"
              label={{
                value: "Aposentadoria",
                position: "insideTop",
                fill: VOGA.brasilia,
                fontSize: 11,
              }}
            />
            {pontoIF ? (
              <ReferenceDot
                x={pontoIF.idade}
                y={pontoIF.saldoNominal}
                r={6}
                fill={VOGA.brasilia}
                stroke="#fff"
                strokeWidth={2}
                label={{
                  value: "Independência",
                  position: "top",
                  fill: VOGA.noite,
                  fontSize: 11,
                }}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="saldoNominal"
              name="Valor Nominal"
              stroke={VOGA.brasilia}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive
              animationDuration={ANIM_MS}
            />
            <Line
              type="monotone"
              dataKey="saldoReal"
              name="Valor Real"
              stroke={VOGA.noite}
              strokeWidth={2.5}
              dot={false}
              isAnimationActive
              animationDuration={ANIM_MS}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CenarioSecaoBox>
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
      <FaixaKpis>
        <KpiAnimado
          label="Patrimônio na aposentadoria (nominal)"
          value={Number(anoApos?.saldoNominal) || 0}
          format={formatarMoedaCompleta}
          color={VOGA.brasilia}
        />
        <KpiAnimado
          label="Patrimônio na aposentadoria (real)"
          value={Number(anoApos?.saldoReal) || 0}
          format={formatarMoedaCompleta}
          color={VOGA.noite}
        />
        <KpiAnimado
          label="Renda mensal gerada"
          value={rendaGerada}
          format={formatarMoedaCompleta}
          hint="Poder de compra de hoje"
          color={VOGA.brasilia}
        />
        <KpiAnimado
          label="Idade de independência financeira"
          value={idadeLF}
          format={(n) => `${Math.round(n)} anos`}
        />
      </FaixaKpis>

      <GraficoPatrimonio
        dados={dados}
        idadeApos={form.idadeApos}
        idadeLF={idadeLF}
        formatarEixo={formatarEixo}
        formatarMoedaCompleta={formatarMoedaCompleta}
      />

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
              <Line type="monotone" dataKey="conservador" name="conservador" stroke="#1F6D3E" strokeWidth={2.5} dot={false} isAnimationActive animationDuration={ANIM_MS} />
              <Line type="monotone" dataKey="moderado" name="moderado" stroke={VOGA.brasilia} strokeWidth={2.5} dot={false} isAnimationActive animationDuration={ANIM_MS} />
              <Line type="monotone" dataKey="agressivo" name="arrojado" stroke="#8A7220" strokeWidth={2.5} dot={false} isAnimationActive animationDuration={ANIM_MS} />
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
  const idadeAlvo = atingiu ? Number(projecao.at(-1)?.idade) || form.idadeApos : form.idadeApos
  const idadeLF = idadeLiberdadeFinanceiraLivre(projecao, form)

  return (
    <>
      <FaixaKpis>
        <KpiAnimado
          label="Tempo para a renda desejada"
          value={anos}
          format={(n) => `${Math.round(n)} ${Math.round(n) === 1 ? "ano" : "anos"}`}
          hint={anos == null ? "Não atinge em 60 anos" : `para ${formatarMoedaCompleta(form.rendaMensalDesejada)}/mês`}
          color={VOGA.brasilia}
        />
        <KpiAnimado
          label="Patrimônio necessário"
          value={necessario}
          format={formatarMoedaCompleta}
          hint="Perpetuidade em termos reais"
        />
        <KpiAnimado
          label="Renda mensal gerada"
          value={Number(projecao.at(-1)?.rendaMensalReal) || 0}
          format={formatarMoedaCompleta}
          color={VOGA.brasilia}
        />
        <KpiAnimado
          label="Idade de independência financeira"
          value={idadeLF}
          format={(n) => `${Math.round(n)} anos`}
        />
      </FaixaKpis>
      <CenarioSecaoBox title="Patrimônio e renda gerada">
        <div className="h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={projecao} margin={{ top: 16, right: 36, left: 8, bottom: 8 }}>
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
              <ReferenceLine
                x={idadeAlvo}
                stroke={VOGA.brasilia}
                strokeDasharray="5 5"
                yAxisId="pat"
                label={{
                  value: atingiu ? "Independência" : "Aposentadoria",
                  position: "insideTop",
                  fill: VOGA.brasilia,
                  fontSize: 11,
                }}
              />
              <Bar
                yAxisId="pat"
                dataKey="saldoReal"
                name="Patrimônio real"
                fill={VOGA.brasilia}
                fillOpacity={0.35}
                radius={[2, 2, 0, 0]}
                isAnimationActive
                animationDuration={ANIM_MS}
              />
              <Line
                yAxisId="renda"
                type="monotone"
                dataKey="rendaMensalReal"
                name="Renda mensal gerada"
                stroke={VOGA.noite}
                strokeWidth={2.5}
                dot={false}
                isAnimationActive
                animationDuration={ANIM_MS}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CenarioSecaoBox>
    </>
  )
}

function ResultadoAporteNecessario({
  form,
  dados,
  formatarEixo,
  formatarMoedaCompleta,
}: {
  form: ProjecaoLivreState
  dados: ReturnType<typeof calcularAporteNecessarioLivre>
  formatarEixo: (v: number) => string
  formatarMoedaCompleta: (v: number) => string
}) {
  const serie = useMemo(
    () => enriquecerAnoProjecaoLivre(dados.projecao, form, form.saldoInicial),
    [dados.projecao, form],
  )
  const idadeApos = form.idadeAtual + Math.max(1, form.tempoDesejado)
  const idadeLF = idadeLiberdadeFinanceiraLivre(dados.projecao, {
    ...form,
    idadeApos,
  })

  return (
    <>
      <FaixaKpis>
        <KpiAnimado
          label="Aporte mensal necessário"
          value={dados.aporteMensal}
          format={formatarMoedaCompleta}
          color={VOGA.brasilia}
        />
        <KpiAnimado
          label="Patrimônio na aposentadoria (nominal)"
          value={dados.patrimonioFinalNominal}
          format={formatarMoedaCompleta}
          color={VOGA.brasilia}
        />
        <KpiAnimado
          label="Patrimônio na aposentadoria (real)"
          value={dados.patrimonioFinalReal}
          format={formatarMoedaCompleta}
          color={VOGA.noite}
        />
        <KpiAnimado
          label="Renda mensal gerada"
          value={dados.rendaMensalReal}
          format={formatarMoedaCompleta}
          hint={`Equivalente nominal: ${formatarMoedaCompleta(dados.rendaMensalNominal)}`}
        />
      </FaixaKpis>
      <GraficoPatrimonio
        dados={serie}
        idadeApos={idadeApos}
        idadeLF={idadeLF}
        formatarEixo={formatarEixo}
        formatarMoedaCompleta={formatarMoedaCompleta}
      />
    </>
  )
}
