"use client"

import { useState, useCallback, useMemo, type ReactNode } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { usePlano } from "@/lib/plano-context"
import type { Ativo } from "@/lib/plano-context"
import {
  CATEGORIAS_PASSIVO,
  DESCRICOES_ATIVOS_POR_TIPO,
  SECOES_ATIVOS,
  SECAO_LIQUIDO,
  TIPOS_ATIVO_OPCOES,
  isTipoAtivoSlug,
  DEFAULT_CATEGORIA_PASSIVO,
  normalizeAtivoDescricao,
  normalizePassivo,
  normalizeAtivoTipo,
  resolveDescricaoAtivo,
  resolvePassivoCategoria,
  resolveTipoAtivoSlug,
  getSaldoDevedorPassivo,
  getParcelaMensalPassivo,
  INSTITUICOES_FINANCEIRAS,
  isInstituicaoFinanceiraListada,
  exibeInstituicaoAtivo,
  metaReservaEmergenciaMeses,
  descricaoMetaReservaEmergencia,
  nivelReservaEmergencia,
  tooltipReservaEmergencia,
  TOOLTIP_PATRIMONIO_LIQUIDO,
  TOOLTIP_ATIVOS_TOTAIS,
  TOOLTIP_PASSIVOS_TOTAIS,
  TOOLTIP_COMPROMETIMENTO_RENDA,
  TOOLTIP_INDICE_LIQUIDEZ,
  TOOLTIP_TAXA_POUPANCA,
  TOOLTIP_CUSTO_JUROS_PROJETADO,
  TOOLTIP_INDICE_ALAVANCAGEM,
  CORES_GRUPOS_ATIVO,
  COR_GRAFICO_LIQUIDOS,
  COR_GRAFICO_IMOBILIZADO,
  COR_GRAFICO_PREVIDENCIA,
  COR_GRAFICO_INVESTIMENTOS,
  SUBCATEGORIAS_LIQUIDO,
  LOCALIZACAO_ATIVO,
  CORES_SUBCATEGORIA,
  labelSubcategoriaLiquido,
  labelLocalizacaoAtivo,
  type LocalizacaoAtivo,
  type SubcategoriaLiquido,
  type SecaoAtivoConfig,
  type TipoAtivoSlug,
} from "@/lib/patrimonio-utils"
import {
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_STYLE,
  formatDonutTooltipPct,
} from "@/lib/chart-tooltip"
import { usePieVogaProps } from "@/components/charts/use-pie-voga"

interface PatrimonioProps {
  onNavigate: (section: string) => void
}

type DonutSlice = { name: string; value: number; fill: string }

type LinhaAtivo = {
  id: string
  label: string
  sublabel?: string
  valor: number
  bemDeHeranca: boolean
}

type BemDeHerancaSelect = "sim" | "nao"

type AddAtivoForm = {
  tipo: TipoAtivoSlug
  descricao: string
  valor: number
  instituicao: string
  subcategoria: SubcategoriaLiquido
  localizacao: LocalizacaoAtivo
  observacao: string
  bemDeHeranca: BemDeHerancaSelect
}

type FiltroLocalizacaoLiquido = "todos" | LocalizacaoAtivo

type AddPassivoForm = {
  categoria: string
  descricao: string
  saldoDevedor: number
  parcelaMensal: number
  taxaJurosMensal: number
  prazoRestanteMeses: number
  instituicao: string
  bemVinculado: string
}

const EMPTY_ATIVO_FORM = (): AddAtivoForm => ({
  tipo: "ativo_liquido",
  descricao: DESCRICOES_ATIVOS_POR_TIPO.ativo_liquido[0],
  valor: 0,
  instituicao: "",
  subcategoria: SUBCATEGORIAS_LIQUIDO[0].value,
  localizacao: "nacional",
  observacao: "",
  bemDeHeranca: "nao",
})

const EMPTY_PASSIVO_FORM = (): AddPassivoForm => ({
  categoria: DEFAULT_CATEGORIA_PASSIVO,
  descricao: "",
  saldoDevedor: 0,
  parcelaMensal: 0,
  taxaJurosMensal: 0,
  prazoRestanteMeses: 0,
  instituicao: "",
  bemVinculado: "",
})

type AddModalState =
  | { kind: "ativo"; tipoInicial?: TipoAtivoSlug }
  | { kind: "passivo"; editId?: string }
  | null

type SemaphoreLevel = "green" | "yellow" | "red"

const SEMAPHORE_BORDER: Record<SemaphoreLevel, string> = {
  green: "#00954F",
  yellow: "#EF9F27",
  red: "#C0392B",
}

function InstituicaoFinanceiraField({
  value,
  onChange,
  label = "Instituição",
}: {
  value: string
  onChange: (value: string) => void
  label?: string
}) {
  const trimmed = value.trim()
  const isListada = isInstituicaoFinanceiraListada(trimmed)
  const selectValue = isListada ? trimmed : trimmed ? "Outros" : ""
  const outroValor = isListada ? "" : trimmed

  return (
    <div className="space-y-2">
      <label className="field-label">{label}</label>
      <Select
        value={selectValue || undefined}
        onValueChange={(v) => {
          if (v === "Outros") onChange("")
          else onChange(v)
        }}
      >
        <SelectTrigger className="form-input text-foreground">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent className="form-card">
          {INSTITUICOES_FINANCEIRAS.map((inst) => (
            <SelectItem key={inst} value={inst}>
              {inst}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectValue === "Outros" && (
        <Input
          value={outroValor}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Informe a instituição"
          className="form-input text-foreground"
        />
      )}
    </div>
  )
}

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  if (!text?.trim()) return null
  return (
    <div
      className="pdf-hide"
      style={{ position: "relative", display: "inline-flex", marginLeft: 5, verticalAlign: "middle" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span
        role="img"
        aria-label="Informação"
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#F0F2F5",
          border: "0.5px solid #D9D9D9",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "help",
          fontSize: 9,
          color: "#9A9B9B",
          flexShrink: 0,
        }}
      >
        i
      </span>
      {open && (
        <div
          style={{
            position: "absolute",
            left: 18,
            top: -4,
            background: "white",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "8px 10px",
            fontSize: 11,
            color: "#52514e",
            width: 260,
            maxWidth: "min(280px, 70vw)",
            zIndex: 50,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {text}
        </div>
      )}
    </div>
  )
}

function LabelComTooltip({ label, tooltip }: { label: string; tooltip?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 0 }}>
      {label}
      {tooltip ? <InfoTooltip text={tooltip} /> : null}
    </span>
  )
}

function DonutComLegenda({
  data,
  formatCurrency,
  footer,
}: {
  data: DonutSlice[]
  formatCurrency: (v: number) => string
  footer?: ReactNode
}) {
  const pieVoga = usePieVogaProps()
  const ativo = data.filter((d) => d.value > 0)
  const total = ativo.reduce((s, d) => s + d.value, 0)

  if (total <= 0) {
    return (
      <p style={{ fontSize: 12, color: "#9A9B9B", textAlign: "center", padding: "40px 0" }}>
        Sem dados para exibir
      </p>
    )
  }

  return (
    <div className="donut-com-legenda" style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 155, height: 155, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={ativo}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={2}
              {...pieVoga}
            >
              {ativo.map((entry, i) => (
                <Cell key={`${entry.name}-${i}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const entry = payload[0]
                const nome = String(entry.name ?? "")
                const valor = Number(entry.value) || 0
                const pct = formatDonutTooltipPct(valor, total)
                return (
                  <div style={{ ...CHART_TOOLTIP_STYLE, fontSize: 12 }}>
                    <div style={{ ...CHART_TOOLTIP_LABEL_STYLE, marginBottom: 4 }}>{nome}</div>
                    <div style={CHART_TOOLTIP_ITEM_STYLE}>
                      {formatCurrency(valor)} ({pct}%)
                    </div>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1, minWidth: 0 }}>
        {ativo.map((item) => {
          const pct = formatDonutTooltipPct(item.value, total)
          return (
            <li
              key={item.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "5px 0",
                borderBottom: "0.5px solid rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: item.fill,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 12, color: "#1a1a1a" }}>{item.name}</span>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>
                  {formatCurrency(item.value)}
                </div>
                <div style={{ fontSize: 10, color: "#9A9B9B" }}>{pct}%</div>
              </div>
            </li>
          )
        })}
      </ul>
      {footer}
    </div>
  )
}

function AtivosLiquidosComposicao({
  ativos,
  totalAtivoLiquido,
  formatCurrency,
}: {
  ativos: Ativo[]
  totalAtivoLiquido: number
  formatCurrency: (v: number) => string
}) {
  const [filtroLocalizacao, setFiltroLocalizacao] = useState<FiltroLocalizacaoLiquido>("todos")
  const [filtroInstituicao, setFiltroInstituicao] = useState<string>("todas")

  const ativosLiquidos = useMemo(
    () =>
      ativos.filter(
        (a) =>
          normalizeAtivoTipo(a.tipo, a.descricao) === "ativo_liquido" &&
          (Number(a.valor) || 0) > 0,
      ),
    [ativos],
  )

  const instituicoesUnicas = useMemo(() => {
    const set = new Set<string>()
    for (const a of ativosLiquidos) {
      const inst = (a.instituicao ?? "").trim()
      if (inst) set.add(inst)
    }
    return ["todas", ...Array.from(set).sort()]
  }, [ativosLiquidos])

  const ativosFiltrados = useMemo(() => {
    return ativosLiquidos.filter((a) => {
      const passaLoc =
        filtroLocalizacao === "todos" || (a.localizacao ?? "") === filtroLocalizacao
      const passaInst =
        filtroInstituicao === "todas" || (a.instituicao ?? "").trim() === filtroInstituicao
      return passaLoc && passaInst
    })
  }, [ativosLiquidos, filtroLocalizacao, filtroInstituicao])

  const totalFiltrado = useMemo(
    () => ativosFiltrados.reduce((s, a) => s + (Number(a.valor) || 0), 0),
    [ativosFiltrados],
  )

  const dataDonut = useMemo(() => {
    const slices: DonutSlice[] = []
    for (const sub of SUBCATEGORIAS_LIQUIDO) {
      const valor = ativosFiltrados
        .filter((a) => (a.subcategoria ?? "") === sub.value)
        .reduce((s, a) => s + (Number(a.valor) || 0), 0)
      if (valor <= 0) continue
      slices.push({
        name: sub.label,
        value: valor,
        fill: CORES_SUBCATEGORIA[sub.value] ?? "#9A9B9B",
      })
    }
    const semSub = ativosFiltrados.filter((a) => !(a.subcategoria ?? "").trim())
    if (semSub.length > 0) {
      const valor = semSub.reduce((s, a) => s + (Number(a.valor) || 0), 0)
      if (valor > 0) {
        slices.push({ name: "Sem subcategoria", value: valor, fill: "#5B8FA8" })
      }
    }
    return slices.sort((a, b) => b.value - a.value)
  }, [ativosFiltrados])

  const pctDoTotal =
    totalAtivoLiquido > 0 ? ((totalFiltrado / totalAtivoLiquido) * 100).toFixed(1) : "0.0"

  return (
    <>
      <div className="pdf-hide no-print" style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <select
          value={filtroLocalizacao}
          onChange={(e) => setFiltroLocalizacao(e.target.value as FiltroLocalizacaoLiquido)}
          style={{
            flex: 1,
            height: 30,
            background: "var(--input-bg)",
            border: "none",
            borderRadius: 4,
            padding: "0 8px",
            fontSize: 12,
            color: "#1a1a1a",
          }}
        >
          <option value="todos">Nacional + Internacional</option>
          {LOCALIZACAO_ATIVO.map((loc) => (
            <option key={loc.value} value={loc.value}>
              {loc.label}
            </option>
          ))}
        </select>
        <select
          value={filtroInstituicao}
          onChange={(e) => setFiltroInstituicao(e.target.value)}
          style={{
            flex: 1,
            height: 30,
            background: "var(--input-bg)",
            border: "none",
            borderRadius: 4,
            padding: "0 8px",
            fontSize: 12,
            color: "#1a1a1a",
          }}
        >
          {instituicoesUnicas.map((inst) => (
            <option key={inst} value={inst}>
              {inst === "todas" ? "Todas as instituições" : inst}
            </option>
          ))}
        </select>
      </div>
      <div style={{ fontSize: 11, color: "#9A9B9B", marginBottom: 8 }}>
        {ativosFiltrados.length} ativos · {formatCurrency(totalFiltrado)} · {pctDoTotal}% do total
      </div>
      <DonutComLegenda data={dataDonut} formatCurrency={formatCurrency} />
    </>
  )
}

function KpiCard({
  label,
  value,
  hint,
  valueColor = "#1A1A1A",
  tooltip,
}: {
  label: string
  value: string
  hint?: string
  valueColor?: string
  tooltip?: string
}) {
  return (
    <div style={{ background: "var(--surface)", borderRadius: 6, padding: "12px 14px" }}>
      <div
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: ".06em",
          color: "#9A9B9B",
          marginBottom: 5,
        }}
      >
        <LabelComTooltip label={label} tooltip={tooltip} />
      </div>
      <div style={{ fontSize: 18, fontWeight: 500, color: valueColor }}>{value}</div>
      {hint ? (
        <div style={{ fontSize: 10, color: "#9A9B9B", marginTop: 2 }}>{hint}</div>
      ) : null}
    </div>
  )
}

function IndicadorSaude({
  label,
  valor,
  nivel,
  progressPct,
  tooltip,
}: {
  label: string
  valor: string
  nivel: SemaphoreLevel
  progressPct: number
  tooltip?: string
}) {
  const borderColor = SEMAPHORE_BORDER[nivel]
  const pct = Math.min(100, Math.max(0, progressPct))
  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: 6,
        padding: "12px 14px",
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: "#9A9B9B", marginBottom: 5 }}>
        <LabelComTooltip label={label} tooltip={tooltip} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 500, color: "#1A1A1A", marginBottom: 8 }}>{valor}</div>
      <div style={{ height: 4, borderRadius: 2, background: "#D9D9D9", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: borderColor, borderRadius: 2 }} />
      </div>
    </div>
  )
}

function nivelComprometimento(pct: number): SemaphoreLevel {
  if (pct < 20) return "green"
  if (pct <= 30) return "yellow"
  return "red"
}

function nivelLiquidez(indice: number): SemaphoreLevel {
  if (indice > 1.5) return "green"
  if (indice >= 1) return "yellow"
  return "red"
}

function nivelPoupanca(pct: number): SemaphoreLevel {
  if (pct > 20) return "green"
  if (pct >= 10) return "yellow"
  return "red"
}

function agruparAtivosPorInstituicao(ativosLista: Ativo[]): Record<string, Ativo[]> {
  return ativosLista.reduce(
    (acc, ativo) => {
      const inst = (ativo.instituicao ?? "").trim() || "Sem instituição"
      if (!acc[inst]) acc[inst] = []
      acc[inst].push(ativo)
      return acc
    },
    {} as Record<string, Ativo[]>,
  )
}

function BalancoAtivoAccordion({
  ativosLista,
  totalSecao,
  variant,
  formatCurrency,
}: {
  ativosLista: Ativo[]
  totalSecao: number
  variant: "liquido" | "participacao"
  formatCurrency: (v: number) => string
}) {
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  const porInstituicao = useMemo(() => agruparAtivosPorInstituicao(ativosLista), [ativosLista])

  const instituicoesOrdenadas = useMemo(
    () =>
      Object.keys(porInstituicao).sort((a, b) => {
        const totalA = porInstituicao[a].reduce((s, at) => s + (Number(at.valor) || 0), 0)
        const totalB = porInstituicao[b].reduce((s, at) => s + (Number(at.valor) || 0), 0)
        return totalB - totalA
      }),
    [porInstituicao],
  )

  const toggleInstituicao = (inst: string) => {
    setExpandidas((prev) => {
      const next = new Set(prev)
      if (next.has(inst)) next.delete(inst)
      else next.add(inst)
      return next
    })
  }

  const totalInst = (inst: string) =>
    porInstituicao[inst].reduce((s, a) => s + (Number(a.valor) || 0), 0)

  const pct = (valor: number) =>
    totalSecao > 0 ? ((valor / totalSecao) * 100).toFixed(1) : "0.0"

  const labelAtivo = (ativo: Ativo) => {
    if (variant === "liquido") {
      const sub = (ativo.subcategoria ?? "").trim()
      if (sub) return labelSubcategoriaLiquido(sub)
      return normalizeAtivoDescricao(ativo.descricao) || "Sem descrição"
    }
    return normalizeAtivoDescricao(ativo.descricao) || "Sem descrição"
  }

  const labelLocalizacao = (loc: string) => {
    if (loc === "nacional") return "Nacional"
    if (loc === "internacional") return "Internacional"
    return "Outros"
  }

  return (
    <>
      {instituicoesOrdenadas.map((inst) => (
        <div key={inst}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => toggleInstituicao(inst)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                toggleInstituicao(inst)
              }
            }}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "7px 14px 7px 22px",
              borderBottom: "0.5px solid #F0F2F5",
              cursor: "pointer",
              background: expandidas.has(inst) ? "#F0F5FA" : "white",
              transition: "background .12s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <span
                style={{
                  fontSize: 10,
                  color: "#9A9B9B",
                  transform: expandidas.has(inst) ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform .15s",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              >
                ›
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#1a1a1a", fontWeight: 500 }}>{inst}</div>
                <div style={{ fontSize: 10, color: "#9A9B9B" }}>
                  {porInstituicao[inst].length}{" "}
                  {porInstituicao[inst].length === 1 ? "ativo" : "ativos"}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#1a1a1a" }}>
                {formatCurrency(totalInst(inst))}
              </div>
              <div style={{ fontSize: 10, color: "#9A9B9B" }}>
                {pct(totalInst(inst))}% dos {variant === "liquido" ? "líquidos" : "participações"}
              </div>
            </div>
          </div>

          {expandidas.has(inst) &&
            porInstituicao[inst].map((ativo) => {
              const loc = (ativo.localizacao ?? "").trim()
              const obs = (ativo.observacao ?? "").trim()
              return (
                <div
                  key={ativo.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 14px 6px 42px",
                    borderBottom: "0.5px solid #F0F2F5",
                    background: "#FAFBFC",
                    gap: 8,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "#1a1a1a" }}>{labelAtivo(ativo)}</div>
                    {(variant === "liquido" && (loc || obs)) || (variant === "participacao" && obs) ? (
                      <div
                        style={{
                          fontSize: 10,
                          color: "#9A9B9B",
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          marginTop: 2,
                        }}
                      >
                        {variant === "liquido" && loc ? (
                          <span
                            style={{
                              background: loc === "nacional" ? "#E6F0F8" : "#E8F5EE",
                              color: loc === "nacional" ? "#4B759B" : "#00954F",
                              padding: "1px 6px",
                              borderRadius: 10,
                              fontSize: 9,
                            }}
                          >
                            {labelLocalizacao(loc)}
                          </span>
                        ) : null}
                        {obs ? <span>{obs}</span> : null}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "#1a1a1a" }}>
                      {formatCurrency(Number(ativo.valor) || 0)}
                    </div>
                    <div style={{ fontSize: 10, color: "#9A9B9B" }}>
                      {pct(Number(ativo.valor) || 0)}% dos{" "}
                      {variant === "liquido" ? "líquidos" : "participações"}
                    </div>
                  </div>
                </div>
              )
            })}
        </div>
      ))}
    </>
  )
}

function AtivoListaBarRow({
  label,
  sublabel,
  valor,
  totalSecao,
  barColor,
  formatCurrency,
  valueColor = "#1A1A1A",
  onValueCommit,
  onRemove,
}: {
  label: string
  sublabel?: string
  valor: number
  totalSecao: number
  barColor: string
  formatCurrency: (value: number) => string
  valueColor?: string
  onValueCommit: (valor: number) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const pct = totalSecao > 0 ? Math.min(100, Math.round((valor / totalSecao) * 100)) : 0
  const barWidth = totalSecao > 0 ? (valor / totalSecao) * 100 : 0

  const startEdit = () => {
    setDraft(valor > 0 ? formatCurrency(valor) : "")
    setEditing(true)
  }

  const commit = (raw: string) => {
    const cleaned = raw.replace(/[^\d]/g, "")
    onValueCommit(parseInt(cleaned, 10) || 0)
    setEditing(false)
  }

  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, color: "#1A1A1A", display: "block" }}>{label}</span>
          {sublabel ? (
            <span style={{ fontSize: 11, color: "#9A9B9B", display: "block", marginTop: 2 }}>
              {sublabel}
            </span>
          ) : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              className="no-print pdf-hide"
              onClick={startEdit}
              aria-label="Editar valor"
              title="Editar"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#9A9B9B",
                padding: 4,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className="no-print pdf-hide"
              onClick={onRemove}
              aria-label="Remover ativo"
              title="Remover ativo"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#C0392B",
                padding: 4,
                display: "flex",
                alignItems: "center",
                opacity: 0.7,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.7"
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
          {editing ? (
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => commit(draft)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit(draft)
                if (e.key === "Escape") setEditing(false)
              }}
              className="form-input text-right tabular-nums"
              style={{ width: 120, height: 32 }}
            />
          ) : (
            <button
              type="button"
              onClick={startEdit}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 600,
                color: valueColor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatCurrency(valor)}
            </button>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            background: "#D9D9D9",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${barWidth}%`,
              background: barColor,
              borderRadius: 3,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <span style={{ fontSize: 11, color: "#9A9B9B", width: 32, textAlign: "right", flexShrink: 0 }}>
          {pct}%
        </span>
      </div>
    </div>
  )
}

function PassivoRowActions({
  onEdit,
  onRemove,
}: {
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <div className="no-print pdf-hide" style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
      <button
        type="button"
        onClick={onEdit}
        aria-label="Editar passivo"
        title="Editar"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#9A9B9B",
          padding: 4,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remover passivo"
        title="Remover passivo"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#C0392B",
          padding: 4,
          display: "flex",
          alignItems: "center",
          opacity: 0.7,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.7"
        }}
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}

export function Patrimonio({ onNavigate }: PatrimonioProps) {
  const { state, setAtivos, setPassivos, getIdadeAtual } = usePlano()
  const { ativos, passivos, patrimonio, moeda, dadosPessoais } = state

  const [addModal, setAddModal] = useState<AddModalState>(null)
  const [addAtivoForm, setAddAtivoForm] = useState<AddAtivoForm>(() => EMPTY_ATIVO_FORM())
  const [addPassivoForm, setAddPassivoForm] = useState<AddPassivoForm>(() => EMPTY_PASSIVO_FORM())
  const [exportandoPdf, setExportandoPdf] = useState(false)

  const formatCurrency = useCallback(
    (value: number) =>
      new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
        style: "currency",
        currency: moeda === "USD" ? "USD" : "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value),
    [moeda],
  )

  const parseCurrency = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, "")
    return parseInt(cleaned, 10) || 0
  }

  const appendAtivo = useCallback(
    (form: AddAtivoForm) => {
      const isLiquido = form.tipo === "ativo_liquido"
      const isImobilizado = form.tipo === "imobilizado"
      if (form.valor <= 0) return
      if (!isLiquido && !form.descricao.trim()) return
      const bem = form.bemDeHeranca === "sim"
      const instituicao =
        isLiquido || exibeInstituicaoAtivo(form.tipo, form.descricao) ? form.instituicao.trim() : ""
      const observacao =
        (isLiquido || isImobilizado) && form.observacao.trim() ? form.observacao.trim() : undefined
      setAtivos(
        ativos.concat({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tipo: form.tipo,
          descricao: isLiquido
            ? labelSubcategoriaLiquido(form.subcategoria)
            : form.descricao.trim(),
          instituicao,
          subcategoria: isLiquido ? form.subcategoria : undefined,
          localizacao: isLiquido ? form.localizacao : undefined,
          observacao,
          valor: form.valor,
          heranca: bem,
          bemDeHeranca: bem,
        }),
      )
    },
    [ativos, setAtivos],
  )

  const updateAtivoValor = useCallback(
    (id: string, valor: number) => {
      if (valor <= 0) {
        setAtivos(ativos.filter((a) => a.id !== id))
        return
      }
      setAtivos(ativos.map((a) => (a.id === id ? { ...a, valor } : a)))
    },
    [ativos, setAtivos],
  )

  const removerAtivo = useCallback(
    (id: string) => {
      if (!window.confirm("Remover este ativo?")) return
      setAtivos(ativos.filter((a) => a.id !== id))
    },
    [ativos, setAtivos],
  )

  const appendPassivo = useCallback(
    (form: AddPassivoForm) => {
      const novo = normalizePassivo({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        categoria: form.categoria,
        descricao: form.descricao.trim() || form.categoria,
        saldoDevedor: form.saldoDevedor,
        parcelaMensal: form.parcelaMensal,
        taxaJurosMensal: form.taxaJurosMensal,
        prazoRestanteMeses: form.prazoRestanteMeses,
        instituicao: form.instituicao,
        bemVinculado: form.bemVinculado,
      })
      setPassivos([...passivos, novo])
    },
    [passivos, setPassivos],
  )

  const updatePassivoSaldo = useCallback(
    (id: string, saldoDevedor: number) => {
      if (saldoDevedor <= 0) {
        setPassivos(passivos.filter((p) => p.id !== id))
        return
      }
      setPassivos(
        passivos.map((p) =>
          p.id === id
            ? normalizePassivo({ ...p, saldoDevedor, valor: saldoDevedor })
            : p,
        ),
      )
    },
    [passivos, setPassivos],
  )

  const removerPassivo = useCallback(
    (id: string) => {
      if (!window.confirm("Remover este passivo?")) return
      setPassivos(passivos.filter((p) => p.id !== id))
    },
    [passivos, setPassivos],
  )

  const abrirModalEditarPassivo = useCallback((passivo: (typeof passivos)[number]) => {
    setAddPassivoForm({
      categoria: resolvePassivoCategoria(passivo),
      descricao: passivo.descricao?.trim() || resolvePassivoCategoria(passivo),
      saldoDevedor: getSaldoDevedorPassivo(passivo),
      parcelaMensal: getParcelaMensalPassivo(passivo),
      taxaJurosMensal: Number(passivo.taxaJurosMensal) || 0,
      prazoRestanteMeses: Number(passivo.prazoRestanteMeses) || 0,
      instituicao: passivo.instituicao ?? "",
      bemVinculado: passivo.bemVinculado ?? "",
    })
    setAddModal({ kind: "passivo", editId: passivo.id })
  }, [])

  const linhasPorSecao = useMemo(() => {
    const map = new Map<string, LinhaAtivo[]>()
    for (const secao of SECOES_ATIVOS) {
      const linhas = ativos
        .filter(
          (a) =>
            normalizeAtivoTipo(a.tipo, a.descricao) === secao.tipo &&
            (Number(a.valor) || 0) > 0,
        )
        .map((a) => {
          const desc = normalizeAtivoDescricao(a.descricao)
          const inst = (a.instituicao ?? "").trim()
          const isLiquido = normalizeAtivoTipo(a.tipo, a.descricao) === "ativo_liquido"
          const label =
            isLiquido && (a.subcategoria ?? "").trim()
              ? labelSubcategoriaLiquido(a.subcategoria!)
              : desc || "Sem descrição"
          const sublabelParts = [
            isLiquido && (a.localizacao ?? "").trim()
              ? labelLocalizacaoAtivo(a.localizacao!)
              : null,
            inst || null,
            isLiquido && (a.observacao ?? "").trim() ? a.observacao!.trim() : null,
          ].filter(Boolean)
          return {
            id: a.id,
            label,
            sublabel: sublabelParts.length > 0 ? sublabelParts.join(" · ") : undefined,
            valor: Number(a.valor) || 0,
            bemDeHeranca: a.heranca === true || a.bemDeHeranca === true,
          }
        })
        .sort((a, b) => b.valor - a.valor)
      map.set(secao.id, linhas)
    }
    return map
  }, [ativos])

  const ativosLiquidos = patrimonio.ativosLiquidos
  const totalPrevidencia = patrimonio.previdencia
  const imobilizado = patrimonio.imobilizado
  const participacoes = patrimonio.participacoes
  const totalPassivos = patrimonio.passivos

  const patrimonioTotal = ativosLiquidos + totalPrevidencia + imobilizado + participacoes
  const patrimonioLiquidoResumo = patrimonioTotal - totalPassivos
  const idadeAtual = getIdadeAtual()

  const dataDonutGrupos = useMemo(
    () =>
      [
        { name: "Imobilizado", value: imobilizado, fill: CORES_GRUPOS_ATIVO.imobilizado },
        { name: "Previdência", value: totalPrevidencia, fill: CORES_GRUPOS_ATIVO.previdencia },
        { name: "Ativos Líquidos", value: ativosLiquidos, fill: CORES_GRUPOS_ATIVO.ativo_liquido },
        {
          name: "Participações Societárias",
          value: participacoes,
          fill: CORES_GRUPOS_ATIVO.participacao_societaria,
        },
      ].filter((g) => g.value > 0),
    [imobilizado, totalPrevidencia, ativosLiquidos, participacoes],
  )

  const barrasGrupos = dataDonutGrupos

  const passivosDetalhe = useMemo(
    () =>
      passivos
        .map((p) => {
          const saldo = getSaldoDevedorPassivo(p)
          if (saldo <= 0) return null
          const parcela = getParcelaMensalPassivo(p)
          const taxa = Number(p.taxaJurosMensal) || 0
          const prazo = Number(p.prazoRestanteMeses) || 0
          const inst = (p.instituicao ?? "").trim()
          const subtitulo = [
            inst || null,
            taxa > 0 ? `${taxa.toFixed(2)}% a.m.` : null,
            prazo > 0 ? `${prazo} meses restantes` : null,
          ]
            .filter(Boolean)
            .join(" · ")
          return { passivo: p, saldo, parcela, subtitulo }
        })
        .filter((x): x is NonNullable<typeof x> => x != null)
        .sort((a, b) => b.saldo - a.saldo),
    [passivos],
  )

  const somaParcelasMensais = useMemo(
    () => passivos.reduce((s, p) => s + getParcelaMensalPassivo(p), 0),
    [passivos],
  )

  const custoJurosProjetado = useMemo(
    () =>
      passivos.reduce((s, p) => {
        const saldo = getSaldoDevedorPassivo(p)
        const parcela = getParcelaMensalPassivo(p)
        const prazo = Number(p.prazoRestanteMeses) || 0
        const totalPago = parcela * prazo
        return s + Math.max(0, totalPago - saldo)
      }, 0),
    [passivos],
  )

  const rendaMensal = dadosPessoais.renda || 0
  const despesaMensal = dadosPessoais.despesa || 0
  const quantidadeFilhos = dadosPessoais.filhos?.length ?? 0
  const metaReservaEmergencia = metaReservaEmergenciaMeses(dadosPessoais.profissao ?? "", quantidadeFilhos)
  const hintReservaEmergencia = descricaoMetaReservaEmergencia(dadosPessoais.profissao ?? "", quantidadeFilhos)
  const tooltipReserva = tooltipReservaEmergencia(dadosPessoais.profissao ?? "", quantidadeFilhos)
  const capacidadePoupanca = Math.max(0, rendaMensal - despesaMensal)
  const reservaEmergenciaMeses = despesaMensal > 0 ? ativosLiquidos / despesaMensal : 0
  const comprometimentoRendaPct = rendaMensal > 0 ? (somaParcelasMensais / rendaMensal) * 100 : 0
  const indiceLiquidez = totalPassivos > 0 ? ativosLiquidos / totalPassivos : 0
  const taxaPoupancaPct = rendaMensal > 0 ? (capacidadePoupanca / rendaMensal) * 100 : 0
  const indiceAlavancagem = patrimonioTotal > 0 ? (totalPassivos / patrimonioTotal) * 100 : 0

  const gruposBalancoAtivo = useMemo(() => {
    const mapItem = (a: (typeof ativos)[number]) => {
      const desc = normalizeAtivoDescricao(a.descricao)
      const inst = (a.instituicao ?? "").trim()
      const obs = (a.observacao ?? "").trim()
      const tipo = normalizeAtivoTipo(a.tipo, a.descricao)
      const herancaNote = a.heranca || a.bemDeHeranca ? "Bem de herança" : null
      const infoTooltip =
        tipo === "imobilizado" ? obs : [inst, herancaNote].filter(Boolean).join(" · ")
      return {
        id: a.id,
        nome: desc || "Sem descrição",
        subtitulo: inst || undefined,
        infoTooltip,
        valor: Number(a.valor) || 0,
      }
    }
    const filtroSimples = (tipo: TipoAtivoSlug) =>
      ativos
        .filter(
          (a) =>
            normalizeAtivoTipo(a.tipo, a.descricao) === tipo && (Number(a.valor) || 0) > 0,
        )
        .map(mapItem)
        .sort((a, b) => b.valor - a.valor)

    const ativosLiquidosLista = ativos.filter(
      (a) =>
        normalizeAtivoTipo(a.tipo, a.descricao) === "ativo_liquido" && (Number(a.valor) || 0) > 0,
    )
    const participacoesLista = ativos.filter(
      (a) =>
        normalizeAtivoTipo(a.tipo, a.descricao) === "participacao_societaria" &&
        (Number(a.valor) || 0) > 0,
    )

    return [
      {
        tipo: "accordion" as const,
        titulo: "Ativos Líquidos",
        cor: COR_GRAFICO_LIQUIDOS,
        subtotal: ativosLiquidos,
        ativos: ativosLiquidosLista,
        accordionVariant: "liquido" as const,
      },
      {
        tipo: "accordion" as const,
        titulo: "Participações Societárias",
        cor: COR_GRAFICO_INVESTIMENTOS,
        subtotal: participacoes,
        ativos: participacoesLista,
        accordionVariant: "participacao" as const,
      },
      {
        tipo: "simple" as const,
        titulo: "Previdência",
        cor: COR_GRAFICO_PREVIDENCIA,
        itens: filtroSimples("previdencia"),
        subtotal: totalPrevidencia,
      },
      {
        tipo: "simple" as const,
        titulo: "Imobilizado",
        cor: COR_GRAFICO_IMOBILIZADO,
        itens: filtroSimples("imobilizado"),
        subtotal: imobilizado,
      },
    ]
  }, [ativos, ativosLiquidos, participacoes, totalPrevidencia, imobilizado])

  const openAddAtivo = (secao: SecaoAtivoConfig) => {
    const tipo = isTipoAtivoSlug(secao.tipo) ? secao.tipo : "ativo_liquido"
    setAddAtivoForm({
      ...EMPTY_ATIVO_FORM(),
      tipo,
      descricao: DESCRICOES_ATIVOS_POR_TIPO[tipo][0],
    })
    setAddModal({ kind: "ativo", tipoInicial: tipo })
  }

  const openAddPassivo = () => {
    setAddPassivoForm(EMPTY_PASSIVO_FORM())
    setAddModal({ kind: "passivo" })
  }

  const exportarPDF = async () => {
    if (exportandoPdf) return
    setExportandoPdf(true)
    try {
      const { default: html2canvas } = await import("html2canvas")

      const toHide = document.querySelectorAll(".no-print, .pdf-hide")
      toHide.forEach((el) => {
        ;(el as HTMLElement).style.visibility = "hidden"
      })
      await new Promise((r) => setTimeout(r, 200))

      const captureSection = async (id: string): Promise<string | null> => {
        const el = document.getElementById(id)
        if (!el) return null
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollX: 0,
          scrollY: 0,
          width: el.scrollWidth,
          height: el.scrollHeight,
        })
        return canvas.toDataURL("image/png", 1.0)
      }

      const [slide1, slide2, slide3] = await Promise.all([
        captureSection("pdf-slide-1"),
        captureSection("pdf-slide-2"),
        captureSection("pdf-slide-3"),
      ])

      toHide.forEach((el) => {
        ;(el as HTMLElement).style.visibility = "visible"
      })

      const nomCliente = dadosPessoais?.nome || "Cliente"

      const response = await fetch("/api/relatorios/balanco", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slide1,
          slide2,
          slide3,
          nomeCliente: nomCliente,
        }),
      })

      if (!response.ok) {
        const errText = await response.text().catch(() => "")
        throw new Error(errText || `HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Balanco_${nomCliente.replace(/\s+/g, "_")}_${new Date().getFullYear()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error("Erro ao exportar PDF:", err)
      window.alert("Não foi possível gerar o PDF. Tente novamente.")
    } finally {
      setExportandoPdf(false)
    }
  }

  const abrirModalAtivo = () => openAddAtivo(SECAO_LIQUIDO)
  const abrirModalPassivo = openAddPassivo
  const voltarSecao = () => onNavigate("dados-pessoais")
  const proximaSecao = () => onNavigate("objetivos")

  const totalSecao = (secao: SecaoAtivoConfig) => {
    if (secao.id === "liquidos") return ativosLiquidos
    if (secao.id === "previdencia") return totalPrevidencia
    if (secao.id === "imobilizado") return imobilizado
    return participacoes
  }

  const totalCorSecao = (secao: SecaoAtivoConfig) => secao.cor

  const onAtivoTipoChange = (tipo: TipoAtivoSlug) => {
    const descricao = DESCRICOES_ATIVOS_POR_TIPO[tipo][0]
    setAddAtivoForm((prev) => ({
      ...prev,
      tipo,
      descricao,
      instituicao: tipo === "ativo_liquido" || exibeInstituicaoAtivo(tipo, descricao) ? prev.instituicao : "",
      subcategoria: tipo === "ativo_liquido" ? SUBCATEGORIAS_LIQUIDO[0].value : prev.subcategoria,
      localizacao: tipo === "ativo_liquido" ? "nacional" : prev.localizacao,
      observacao:
        tipo === "ativo_liquido" || tipo === "imobilizado" ? prev.observacao : "",
    }))
  }

  const ativoTipoSelect = resolveTipoAtivoSlug(addAtivoForm.tipo, addAtivoForm.descricao)
  const ativoDescricaoSelect = resolveDescricaoAtivo(ativoTipoSelect, addAtivoForm.descricao)
  const isFormAtivoLiquido = ativoTipoSelect === "ativo_liquido"
  const isFormImobilizado = ativoTipoSelect === "imobilizado"
  const mostrarInstituicaoAtivo =
    !isFormAtivoLiquido && exibeInstituicaoAtivo(ativoTipoSelect, ativoDescricaoSelect)
  const passivoCategoriaSelect = addPassivoForm.categoria || DEFAULT_CATEGORIA_PASSIVO

  const saveAddModal = () => {
    if (!addModal) return
    if (addModal.kind === "ativo") {
      if (addAtivoForm.valor <= 0) return
      if (!isFormAtivoLiquido && !ativoDescricaoSelect) return
      appendAtivo({
        ...addAtivoForm,
        tipo: ativoTipoSelect,
        descricao: isFormAtivoLiquido
          ? labelSubcategoriaLiquido(addAtivoForm.subcategoria)
          : ativoDescricaoSelect,
      })
      setAddAtivoForm(EMPTY_ATIVO_FORM())
    } else {
      if (!passivoCategoriaSelect || !addPassivoForm.descricao.trim()) return
      if (addPassivoForm.saldoDevedor <= 0) return
      if (addModal.editId) {
        setPassivos(
          passivos.map((p) =>
            p.id === addModal.editId
              ? normalizePassivo({
                  ...p,
                  categoria: passivoCategoriaSelect,
                  descricao: addPassivoForm.descricao.trim() || passivoCategoriaSelect,
                  saldoDevedor: addPassivoForm.saldoDevedor,
                  parcelaMensal: addPassivoForm.parcelaMensal,
                  taxaJurosMensal: addPassivoForm.taxaJurosMensal,
                  prazoRestanteMeses: addPassivoForm.prazoRestanteMeses,
                  instituicao: addPassivoForm.instituicao,
                  bemVinculado: addPassivoForm.bemVinculado,
                })
              : p,
          ),
        )
      } else {
        appendPassivo({ ...addPassivoForm, categoria: passivoCategoriaSelect })
      }
      setAddPassivoForm(EMPTY_PASSIVO_FORM())
    }
    setAddModal(null)
  }

  return (
    <div id="balanco-patrimonial-content" style={{ background: "#ffffff" }}>
      {/* 1. Cabeçalho (somente tela) */}
      <div className="pdf-hide">
      <p style={{ fontSize: 11, color: "var(--accent)", marginBottom: 8 }}>Cadastro</p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 400, color: "#1a1a1a", margin: 0 }}>
            Balanço <span style={{ color: "var(--accent)" }}>Patrimonial</span>
          </h1>
          <p style={{ fontSize: 12, color: "#9A9B9B", marginTop: 3 }}>
            {dadosPessoais.nome || "Cliente"} · {idadeAtual} anos · Atualizado hoje
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="no-print"
            onClick={abrirModalPassivo}
            style={{
              background: "none",
              border: "1px solid #C0392B",
              borderRadius: 5,
              padding: "6px 13px",
              fontSize: 12,
              color: "#C0392B",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            + Adicionar passivo
          </button>
          <button
            type="button"
            className="no-print"
            onClick={abrirModalAtivo}
            style={{
              background: "var(--accent)",
              border: "none",
              borderRadius: 5,
              padding: "6px 13px",
              fontSize: 12,
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            + Adicionar ativo
          </button>
          <button
            type="button"
            className="no-print"
            onClick={exportarPDF}
            disabled={exportandoPdf}
            style={{
              background: "#012137",
              border: "none",
              borderRadius: 6,
              padding: "6px 13px",
              fontSize: 12,
              color: "white",
              cursor: exportandoPdf ? "wait" : "pointer",
              opacity: exportandoPdf ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <svg width="13" height="14" viewBox="0 0 13 14" fill="none" aria-hidden>
              <rect x="1" y="1" width="11" height="12" rx="2" stroke="white" strokeWidth="1.2" />
              <path d="M4 5h5M4 7h5M4 9h3" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M9 11l1.5 1.5L12 11" stroke="#EF9F27" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {exportandoPdf ? "Gerando PDF…" : "Exportar PDF"}
          </button>
        </div>
      </div>
      </div>

      <div id="pdf-slide-1">
      {/* 2. KPIs */}
      <div className="pdf-section">
      <div
        className="pdf-grid-kpis"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <KpiCard
          label="Patrimônio líquido"
          value={formatCurrency(patrimonioLiquidoResumo)}
          hint="Ativos − Passivos"
          valueColor="#00954F"
          tooltip={TOOLTIP_PATRIMONIO_LIQUIDO}
        />
        <KpiCard
          label="Ativos totais"
          value={formatCurrency(patrimonioTotal)}
          tooltip={TOOLTIP_ATIVOS_TOTAIS}
        />
        <KpiCard
          label="Passivos totais"
          value={formatCurrency(totalPassivos)}
          valueColor="#C0392B"
          tooltip={TOOLTIP_PASSIVOS_TOTAIS}
        />
        <KpiCard
          label="Reserva emergência"
          value={
            despesaMensal > 0
              ? `${reservaEmergenciaMeses.toFixed(1)} meses`
              : "—"
          }
          hint={hintReservaEmergencia}
          tooltip={tooltipReserva}
        />
      </div>
      </div>

      {/* 3. Gráficos donuts */}
      <div className="pdf-section">
      <div
        className="pdf-grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div className="pdf-section-card" style={{ background: "var(--surface)", borderRadius: 8, padding: 16 }}>
          <p style={{ fontSize: 13, color: "#1A1A1A", marginBottom: 12, fontWeight: 500 }}>
            Composição total de ativos
          </p>
          <DonutComLegenda data={dataDonutGrupos} formatCurrency={formatCurrency} />
        </div>
        <div className="pdf-section-card" style={{ background: "var(--surface)", borderRadius: 8, padding: 16 }}>
          <p style={{ fontSize: 13, color: "#1A1A1A", marginBottom: 12, fontWeight: 500 }}>
            Composição dos ativos líquidos
          </p>
          <AtivosLiquidosComposicao
            ativos={ativos}
            totalAtivoLiquido={ativosLiquidos}
            formatCurrency={formatCurrency}
          />
          <p style={{ fontSize: 11, color: "#9A9B9B", marginTop: 12 }}>
            <LabelComTooltip label="Reserva de emergência" tooltip={tooltipReserva} />
            {": "}
            <strong style={{ color: "#1A1A1A" }}>
              {despesaMensal > 0 ? `${reservaEmergenciaMeses.toFixed(1)} meses` : "—"}
            </strong>
          </p>
        </div>
      </div>
      </div>

      {/* 4. Barras + Passivos */}
      <div className="pdf-section">
      <div
        className="pdf-grid-2"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div className="pdf-section-card" style={{ background: "var(--surface)", borderRadius: 8, padding: 16 }}>
          <p style={{ fontSize: 13, color: "#1A1A1A", marginBottom: 12, fontWeight: 500 }}>
            Ativos por grupo
          </p>
          {barrasGrupos.filter((g) => g.value > 0).length === 0 ? (
            <p style={{ fontSize: 12, color: "#9A9B9B", textAlign: "center", padding: "24px 0" }}>
              Nenhum ativo cadastrado
            </p>
          ) : (
            barrasGrupos
              .filter((g) => g.value > 0)
              .map((grupo) => {
                const pct = patrimonioTotal > 0 ? (grupo.value / patrimonioTotal) * 100 : 0
                const barWidth = patrimonioTotal > 0 ? (grupo.value / patrimonioTotal) * 100 : 0
                return (
                  <div key={grupo.name} style={{ marginBottom: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: 12,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: "#1A1A1A" }}>{grupo.name}</span>
                      <span style={{ color: "#52514e" }}>
                        {formatCurrency(grupo.value)}{" "}
                        <span style={{ color: "#9A9B9B" }}>({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: "#D9D9D9", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${barWidth}%`,
                          background: grupo.fill,
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                )
              })
          )}
        </div>

        <div className="pdf-section-card" style={{ background: "var(--surface)", borderRadius: 8, padding: 16 }}>
          <p style={{ fontSize: 13, color: "#1A1A1A", marginBottom: 12, fontWeight: 500 }}>
            Passivos e dívidas
          </p>
          {passivosDetalhe.length === 0 ? (
            <p style={{ fontSize: 12, color: "#9A9B9B", textAlign: "center", padding: "24px 0" }}>
              Nenhum passivo cadastrado
            </p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {passivosDetalhe.map(({ passivo, saldo, parcela, subtitulo }) => (
                <li
                  key={passivo.id}
                  style={{
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: "#1A1A1A", margin: 0 }}>
                      {passivo.descricao?.trim() || resolvePassivoCategoria(passivo)}
                    </p>
                    {subtitulo ? (
                      <p style={{ fontSize: 10, color: "#9A9B9B", margin: "2px 0 0" }}>{subtitulo}</p>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: "#C0392B", margin: 0 }}>
                        {formatCurrency(saldo)}
                      </p>
                      {parcela > 0 ? (
                        <p style={{ fontSize: 10, color: "#9A9B9B", margin: "2px 0 0" }}>
                          {formatCurrency(parcela)}/mês
                        </p>
                      ) : null}
                    </div>
                    <PassivoRowActions
                      onEdit={() => abrirModalEditarPassivo(passivo)}
                      onRemove={() => removerPassivo(passivo.id)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="no-print"
            onClick={abrirModalPassivo}
            style={{
              marginTop: 12,
              background: "none",
              border: "1px dashed #C0392B",
              borderRadius: 4,
              padding: "6px 12px",
              fontSize: 12,
              color: "#C0392B",
              cursor: "pointer",
              width: "100%",
            }}
          >
            + Adicionar passivo
          </button>
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: "1px solid var(--border)",
              fontSize: 11,
              color: "#52514e",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span>
              <LabelComTooltip
                label="Custo total de juros projetado"
                tooltip={TOOLTIP_CUSTO_JUROS_PROJETADO}
              />
              {": "}
              <strong>{formatCurrency(custoJurosProjetado)}</strong>
            </span>
            <span>
              <LabelComTooltip
                label="Índice de alavancagem"
                tooltip={TOOLTIP_INDICE_ALAVANCAGEM}
              />
              {": "}
              <strong>{indiceAlavancagem.toFixed(1)}%</strong>
            </span>
          </div>
        </div>
      </div>
      </div>
      </div>

      <div id="pdf-slide-2">
      {/* 5. Indicadores de saúde */}
      <div className="pdf-section">
      <div
        className="pdf-grid-indicadores"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <IndicadorSaude
          label="Reserva emergência"
          valor={despesaMensal > 0 ? `${reservaEmergenciaMeses.toFixed(1)} meses` : "—"}
          nivel={nivelReservaEmergencia(reservaEmergenciaMeses, metaReservaEmergencia)}
          progressPct={Math.min(100, (reservaEmergenciaMeses / metaReservaEmergencia) * 100)}
          tooltip={tooltipReserva}
        />
        <IndicadorSaude
          label="Comprometimento renda"
          valor={`${comprometimentoRendaPct.toFixed(1)}%`}
          nivel={nivelComprometimento(comprometimentoRendaPct)}
          progressPct={Math.min(100, comprometimentoRendaPct)}
          tooltip={TOOLTIP_COMPROMETIMENTO_RENDA}
        />
        <IndicadorSaude
          label="Índice liquidez"
          valor={totalPassivos > 0 ? indiceLiquidez.toFixed(2) : "—"}
          nivel={nivelLiquidez(indiceLiquidez)}
          progressPct={Math.min(100, indiceLiquidez * 40)}
          tooltip={TOOLTIP_INDICE_LIQUIDEZ}
        />
        <IndicadorSaude
          label="Taxa poupança"
          valor={`${taxaPoupancaPct.toFixed(1)}%`}
          nivel={nivelPoupanca(taxaPoupancaPct)}
          progressPct={Math.min(100, taxaPoupancaPct)}
          tooltip={TOOLTIP_TAXA_POUPANCA}
        />
      </div>
      </div>

      {/* 6. Balanço em linhas */}
      <div className="pdf-section pdf-section-card" style={{ background: "var(--surface)", borderRadius: 8, padding: 16, marginBottom: 16 }}>
        <div className="pdf-grid-balanco" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* Coluna Ativo */}
          <div>
            <div
              style={{
                background: "#4B759B",
                color: "white",
                padding: "8px 12px",
                borderRadius: "6px 6px 0 0",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              ATIVO
            </div>
            <div style={{ background: "white", borderRadius: "0 0 6px 6px", overflow: "hidden" }}>
              {gruposBalancoAtivo.map((grupo) => (
                <div key={grupo.titulo}>
                  <div
                    style={{
                      background: "#F0F2F5",
                      padding: "8px 12px",
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#52514e",
                    }}
                  >
                    <span>{grupo.titulo}</span>
                    <span>{formatCurrency(grupo.subtotal)}</span>
                  </div>
                  {grupo.tipo === "accordion" ? (
                    grupo.ativos.length === 0 ? (
                      <p style={{ fontSize: 11, color: "#9A9B9B", padding: "8px 12px", margin: 0 }}>
                        Nenhum item
                      </p>
                    ) : (
                      <BalancoAtivoAccordion
                        ativosLista={grupo.ativos}
                        totalSecao={grupo.subtotal}
                        variant={grupo.accordionVariant}
                        formatCurrency={formatCurrency}
                      />
                    )
                  ) : grupo.itens.length === 0 ? (
                    <p style={{ fontSize: 11, color: "#9A9B9B", padding: "8px 12px", margin: 0 }}>
                      Nenhum item
                    </p>
                  ) : (
                    grupo.itens.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: "8px 12px",
                          borderBottom: "1px solid var(--border)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 8,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <span style={{ fontSize: 12, color: "#1A1A1A" }}>{item.nome}</span>
                            <InfoTooltip text={item.infoTooltip} />
                          </div>
                          {item.subtitulo ? (
                            <p style={{ fontSize: 10, color: "#9A9B9B", margin: "2px 0 0" }}>
                              {item.subtitulo}
                            </p>
                          ) : null}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#1A1A1A", flexShrink: 0 }}>
                          {formatCurrency(item.valor)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ))}
              <div
                style={{
                  padding: "10px 12px",
                  borderTop: "2px solid #4B759B",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#1A1A1A",
                }}
              >
                <span>Total Ativo</span>
                <span>{formatCurrency(patrimonioTotal)}</span>
              </div>
            </div>
          </div>

          {/* Coluna Passivo + PL */}
          <div>
            <div
              style={{
                background: "#C0392B",
                color: "white",
                padding: "8px 12px",
                borderRadius: "6px 6px 0 0",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              PASSIVO
            </div>
            <div style={{ background: "white", borderRadius: "0 0 6px 6px", overflow: "hidden" }}>
              {passivosDetalhe.length === 0 ? (
                <p style={{ fontSize: 11, color: "#9A9B9B", padding: "8px 12px", margin: 0 }}>
                  Nenhum passivo cadastrado
                </p>
              ) : (
                passivosDetalhe.map(({ passivo, saldo, parcela, subtitulo }) => (
                  <div
                    key={passivo.id}
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: "#1A1A1A", margin: 0 }}>
                        {passivo.descricao?.trim() || resolvePassivoCategoria(passivo)}
                      </p>
                      {subtitulo ? (
                        <p style={{ fontSize: 10, color: "#9A9B9B", margin: "2px 0 0" }}>{subtitulo}</p>
                      ) : null}
                      {parcela > 0 ? (
                        <p style={{ fontSize: 10, color: "#C0392B", margin: "2px 0 0" }}>
                          {formatCurrency(parcela)}/mês
                        </p>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: "#C0392B" }}>
                        {formatCurrency(saldo)}
                      </span>
                      <PassivoRowActions
                        onEdit={() => abrirModalEditarPassivo(passivo)}
                        onRemove={() => removerPassivo(passivo.id)}
                      />
                    </div>
                  </div>
                ))
              )}
              <div
                style={{
                  padding: "10px 12px",
                  borderTop: "2px solid #C0392B",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#C0392B",
                }}
              >
                <span>Total Passivo</span>
                <span>{formatCurrency(totalPassivos)}</span>
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                background: "#00954F",
                color: "white",
                borderRadius: 6,
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 500 }}>Patrimônio Líquido</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>
                {formatCurrency(patrimonioLiquidoResumo)}
              </span>
            </div>

            <p style={{ fontSize: 11, color: "#9A9B9B", marginTop: 10, textAlign: "center" }}>
              Ativo = Passivo + PL{" "}
              <span style={{ color: "#00954F" }}>
                {Math.abs(patrimonioTotal - totalPassivos - patrimonioLiquidoResumo) < 1 ? "✓" : "—"}
              </span>
            </p>
          </div>
        </div>
      </div>
      </div>

      <div id="pdf-slide-3">
      {/* 7. Lista de ativos por seção */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
        {SECOES_ATIVOS.map((secao) => {
          const linhas = linhasPorSecao.get(secao.id) ?? []
          const total = totalSecao(secao)
          const totalCor = totalCorSecao(secao)

          return (
            <div
              key={secao.id}
              className="pdf-section pdf-section-card"
              style={{
                background: "var(--surface)",
                borderRadius: 8,
                padding: "20px 24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: linhas.length > 0 ? 4 : 0,
                  paddingBottom: 12,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1A1A1A", margin: 0 }}>
                  {secao.title}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn-add-dashed no-print"
                    onClick={() => openAddAtivo(secao)}
                  >
                    <Plus size={14} />
                    Adicionar
                  </button>
                  <span style={{ fontSize: 13, fontWeight: 600, color: totalCor, fontVariantNumeric: "tabular-nums" }}>
                    {secao.totalLabel} {formatCurrency(total)}
                  </span>
                </div>
              </div>

              {linhas.length === 0 ? (
                <p
                  style={{
                    fontSize: 13,
                    color: "#9A9B9B",
                    textAlign: "center",
                    padding: "28px 0",
                    margin: 0,
                  }}
                >
                  Nenhum ativo cadastrado
                </p>
              ) : (
                <div>
                  {linhas.map((linha) => (
                    <div key={linha.id}>
                      <AtivoListaBarRow
                        label={linha.label}
                        sublabel={
                          [linha.sublabel, linha.bemDeHeranca ? "Bem de herança" : null]
                            .filter(Boolean)
                            .join(" · ") || undefined
                        }
                        valor={linha.valor}
                        totalSecao={total}
                        barColor={secao.cor}
                        formatCurrency={formatCurrency}
                        valueColor="#1A1A1A"
                        onValueCommit={(v) => updateAtivoValor(linha.id, v)}
                        onRemove={() => removerAtivo(linha.id)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>

      <Dialog open={addModal != null} onOpenChange={(open) => !open && setAddModal(null)}>
        <DialogContent
          className={`form-card rounded-2xl max-h-[90vh] overflow-y-auto ${
            addModal?.kind === "passivo" ? "max-w-lg" : "max-w-md"
          }`}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {addModal?.kind === "passivo"
                ? addModal.editId
                  ? "Editar dívida"
                  : "Adicionar dívida"
                : "Adicionar Ativo"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {addModal?.kind === "passivo"
                ? "Informe os dados do financiamento ou dívida"
                : "Preencha os dados do bem patrimonial"}
            </DialogDescription>
          </DialogHeader>
          {addModal?.kind === "ativo" ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <label className="field-label">Tipo</label>
                <Select
                  value={ativoTipoSelect}
                  onValueChange={(v) => onAtivoTipoChange(v as TipoAtivoSlug)}
                >
                  <SelectTrigger className="form-card text-foreground">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="form-card">
                    {TIPOS_ATIVO_OPCOES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isFormAtivoLiquido ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="field-label">Subcategoria</label>
                      <Select
                        value={addAtivoForm.subcategoria}
                        onValueChange={(subcategoria) =>
                          setAddAtivoForm((prev) => ({
                            ...prev,
                            subcategoria: subcategoria as SubcategoriaLiquido,
                          }))
                        }
                      >
                        <SelectTrigger className="form-card text-foreground">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="form-card">
                          {SUBCATEGORIAS_LIQUIDO.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="field-label">Localização</label>
                      <Select
                        value={addAtivoForm.localizacao}
                        onValueChange={(localizacao) =>
                          setAddAtivoForm((prev) => ({
                            ...prev,
                            localizacao: localizacao as LocalizacaoAtivo,
                          }))
                        }
                      >
                        <SelectTrigger className="form-card text-foreground">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent className="form-card">
                          {LOCALIZACAO_ATIVO.map((loc) => (
                            <SelectItem key={loc.value} value={loc.value}>
                              {loc.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="field-label">Instituição</label>
                      <Input
                        value={addAtivoForm.instituicao}
                        onChange={(e) =>
                          setAddAtivoForm({ ...addAtivoForm, instituicao: e.target.value })
                        }
                        placeholder="Ex.: XP, BTG, Itaú..."
                        className="form-card text-foreground"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="field-label">Valor (R$)</label>
                      <Input
                        value={addAtivoForm.valor ? formatCurrency(addAtivoForm.valor) : ""}
                        onChange={(e) =>
                          setAddAtivoForm({ ...addAtivoForm, valor: parseCurrency(e.target.value) })
                        }
                        placeholder="0"
                        className="form-card text-foreground tabular-nums"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="field-label">Descrição / observação</label>
                    <Textarea
                      value={addAtivoForm.observacao}
                      onChange={(e) =>
                        setAddAtivoForm({ ...addAtivoForm, observacao: e.target.value })
                      }
                      placeholder="Detalhes opcionais sobre o ativo"
                      className="form-card text-foreground min-h-[72px]"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="field-label">Descrição</label>
                    <Select
                      value={ativoDescricaoSelect}
                      onValueChange={(descricao) =>
                        setAddAtivoForm((prev) => ({
                          ...prev,
                          descricao,
                          instituicao: exibeInstituicaoAtivo(prev.tipo, descricao)
                            ? prev.instituicao
                            : "",
                        }))
                      }
                    >
                      <SelectTrigger className="form-card text-foreground">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="form-card">
                        {DESCRICOES_ATIVOS_POR_TIPO[ativoTipoSelect].map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="field-label">Valor (R$)</label>
                    <Input
                      value={addAtivoForm.valor ? formatCurrency(addAtivoForm.valor) : ""}
                      onChange={(e) =>
                        setAddAtivoForm({ ...addAtivoForm, valor: parseCurrency(e.target.value) })
                      }
                      placeholder="0"
                      className="form-card text-foreground tabular-nums"
                    />
                  </div>
                  {mostrarInstituicaoAtivo ? (
                    <InstituicaoFinanceiraField
                      label="Instituição"
                      value={addAtivoForm.instituicao}
                      onChange={(instituicao) => setAddAtivoForm({ ...addAtivoForm, instituicao })}
                    />
                  ) : null}
                </>
              )}
              <div className="space-y-2">
                <label className="field-label">Bem de Herança</label>
                <Select
                  value={addAtivoForm.bemDeHeranca}
                  onValueChange={(v) =>
                    setAddAtivoForm((prev) => ({
                      ...prev,
                      bemDeHeranca: v === "sim" ? "sim" : "nao",
                    }))
                  }
                >
                  <SelectTrigger className="form-card text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="form-card">
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se &quot;Sim&quot;, o valor entra na base de cálculo do ITCMD na aba Sucessório.
                </p>
              </div>
              {isFormImobilizado ? (
                <div className="space-y-2">
                  <label className="field-label">Observação (opcional)</label>
                  <Textarea
                    value={addAtivoForm.observacao}
                    onChange={(e) =>
                      setAddAtivoForm({ ...addAtivoForm, observacao: e.target.value })
                    }
                    placeholder="Ex: Apartamento 120m² — Rua das Flores 123, São Paulo. Matrícula 45.678."
                    className="form-card text-foreground min-h-[72px] resize-y"
                    rows={3}
                  />
                </div>
              ) : null}
            </div>
          ) : addModal?.kind === "passivo" ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="field-label">
                  Categoria
                </label>
                <Select
                  value={passivoCategoriaSelect}
                  onValueChange={(value) =>
                    setAddPassivoForm((prev) => ({ ...prev, categoria: value }))
                  }
                >
                  <SelectTrigger className="form-card text-foreground">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="form-card">
                    {CATEGORIAS_PASSIVO.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="field-label">
                  Descrição
                </label>
                <Input
                  value={addPassivoForm.descricao}
                  onChange={(e) =>
                    setAddPassivoForm((prev) => ({ ...prev, descricao: e.target.value }))
                  }
                  placeholder="Ex: Financiamento Apto SP"
                  className="form-card text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="field-label">
                  Saldo devedor (R$)
                </label>
                <Input
                  value={addPassivoForm.saldoDevedor ? formatCurrency(addPassivoForm.saldoDevedor) : ""}
                  onChange={(e) =>
                    setAddPassivoForm((prev) => ({
                      ...prev,
                      saldoDevedor: parseCurrency(e.target.value),
                    }))
                  }
                  placeholder="0"
                  className="form-card text-foreground tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <label className="field-label">
                  Parcela mensal (R$)
                </label>
                <Input
                  value={addPassivoForm.parcelaMensal ? formatCurrency(addPassivoForm.parcelaMensal) : ""}
                  onChange={(e) =>
                    setAddPassivoForm((prev) => ({
                      ...prev,
                      parcelaMensal: parseCurrency(e.target.value),
                    }))
                  }
                  placeholder="0"
                  className="form-card text-foreground tabular-nums"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="field-label">
                    Taxa de juros (% a.m.)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min={0}
                    value={addPassivoForm.taxaJurosMensal || ""}
                    onChange={(e) =>
                      setAddPassivoForm((prev) => ({
                        ...prev,
                        taxaJurosMensal: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="0"
                    className="form-card text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="field-label">
                    Prazo restante (meses)
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={addPassivoForm.prazoRestanteMeses || ""}
                    onChange={(e) =>
                      setAddPassivoForm((prev) => ({
                        ...prev,
                        prazoRestanteMeses: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    placeholder="0"
                    className="form-card text-foreground"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="field-label">
                  Bem vinculado
                </label>
                <Input
                  value={addPassivoForm.bemVinculado}
                  onChange={(e) =>
                    setAddPassivoForm((prev) => ({ ...prev, bemVinculado: e.target.value }))
                  }
                  placeholder="Opcional — Ex: Apartamento SP"
                  className="form-card text-foreground"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setAddModal(null)}>
              Cancelar
            </Button>
            <Button
              onClick={saveAddModal}
              disabled={
                addModal?.kind === "ativo"
                  ? addAtivoForm.valor <= 0 ||
                    (!isFormAtivoLiquido && !addAtivoForm.descricao)
                  : addModal?.kind === "passivo"
                    ? !passivoCategoriaSelect ||
                      !addPassivoForm.descricao.trim() ||
                      addPassivoForm.saldoDevedor <= 0
                    : true
              }
              className="bg-primary text-primary-foreground"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. Navegação */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 20,
          paddingTop: 16,
          borderTop: "1px solid #E8EAEB",
        }}
      >
        <button
          type="button"
          onClick={voltarSecao}
          style={{ background: "none", border: "none", color: "#9A9B9B", fontSize: 12, cursor: "pointer" }}
        >
          ‹ Voltar
        </button>
        <button
          type="button"
          onClick={proximaSecao}
          style={{
            background: "var(--accent)",
            border: "none",
            borderRadius: 5,
            padding: "7px 18px",
            fontSize: 12,
            color: "white",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Próximo ›
        </button>
      </div>
    </div>
  )
}
