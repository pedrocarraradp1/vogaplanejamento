"use client"

import { useMemo, useRef, useState, type ComponentType } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Plus,
  X,
  ArrowLeft,
  ArrowRight,
  Pencil,
  StickyNote,
  Umbrella,
  Plane,
  GraduationCap,
  Home,
  Gift,
  AlertTriangle,
} from "lucide-react"
import { usePlano, type Objetivo } from "@/lib/plano-context"
import { GraficoCapitalPorAno } from "@/components/charts/objetivos-charts"
import { VOGA, VOGA_CHART_SCALE } from "@/lib/voga-tokens"

interface ObjetivosProps {
  onNavigate: (section: string) => void
}

const OBJETIVOS_PREDEFINIDOS = [
  "Compra de Imóvel Residencial",
  "Compra de Imóvel para Investimento",
  "Compra de Veículo",
  "Viagem Internacional",
  "Viagem Nacional",
  "Educação dos Filhos",
  "Faculdade / Pós-graduação",
  "Casamento",
  "Reforma / Decoração",
  "Abertura de Empresa / Negócio",
  "Reserva de Emergência",
  "Independência Financeira",
  "Troca de Veículo",
] as const

type CategoriaObjetivo = "aposentadoria" | "viagem" | "educacao" | "imovel" | "outros"

const VOGA_NAVY = VOGA.noite
const VOGA_GOLD = VOGA.brasilia
const VOGA_GOLD_LIGHT = VOGA.estrela
const VOGA_GOLD_DARK = VOGA.nota

const PALETA_OBJETIVOS = [
  { fill: VOGA_CHART_SCALE[0], bg: "var(--surface-1)", text: "var(--text-primary)" },
  { fill: VOGA_CHART_SCALE[1], bg: "var(--bg-page)", text: "var(--text-primary)" },
  { fill: VOGA_CHART_SCALE[2], bg: "var(--surface-2)", text: "var(--text-primary)" },
  { fill: VOGA_CHART_SCALE[3], bg: VOGA.verdeQuadrado, text: VOGA.noite },
  { fill: VOGA_CHART_SCALE[4], bg: VOGA.amareloExplanada, text: VOGA.noite },
  { fill: VOGA_CHART_SCALE[5], bg: "var(--surface-1)", text: "var(--text-primary)" },
] as const

type CorObjetivo = (typeof PALETA_OBJETIVOS)[number]

const CATEGORIA_META: Record<
  CategoriaObjetivo,
  { label: string; Icon: ComponentType<{ size?: number; strokeWidth?: number; color?: string }> }
> = {
  aposentadoria: { label: "APOSENTADORIA", Icon: Umbrella },
  viagem: { label: "VIAGEM", Icon: Plane },
  educacao: { label: "EDUCAÇÃO", Icon: GraduationCap },
  imovel: { label: "IMÓVEL", Icon: Home },
  outros: { label: "OUTROS", Icon: Gift },
}

type PrazoGrupo = "curto" | "medio" | "longo"

const PRAZO_GRUPOS: { id: PrazoGrupo; titulo: string }[] = [
  { id: "curto", titulo: "Curto prazo · até 3 anos" },
  { id: "medio", titulo: "Médio prazo · 3 a 10 anos" },
  { id: "longo", titulo: "Longo prazo · acima de 10 anos" },
]

function prazoGrupo(prazoAnos: number): PrazoGrupo {
  const p = Math.max(0, Number(prazoAnos) || 0)
  if (p <= 3) return "curto"
  if (p <= 10) return "medio"
  return "longo"
}

function resolveCategoria(descricao: string): CategoriaObjetivo {
  const d = (descricao || "").toLowerCase()
  if (
    d.includes("independência") ||
    d.includes("independencia") ||
    d.includes("aposentadoria")
  ) {
    return "aposentadoria"
  }
  if (d.includes("viagem")) return "viagem"
  if (
    d.includes("educação") ||
    d.includes("educacao") ||
    d.includes("faculdade") ||
    d.includes("pós-grad") ||
    d.includes("pos-grad")
  ) {
    return "educacao"
  }
  if (
    d.includes("imóvel") ||
    d.includes("imovel") ||
    d.includes("reforma") ||
    d.includes("decoração") ||
    d.includes("decoracao")
  ) {
    return "imovel"
  }
  return "outros"
}

function contarParcelas(o: Objetivo, prazoTotal: number): number {
  const prazoAnos = Math.max(0, Number(o.prazoAnos) || 0)
  if (!o.recorrente) return 1
  const freq = Math.max(1, Number(o.frequenciaAnos) || 1)
  const duracaoTipo = o.duracaoTipo ?? "total"
  const duracaoAnos = Math.max(0, Number(o.duracaoAnos) || 0)
  const anoFimExclusive =
    duracaoTipo === "total" ? prazoTotal + 1 : prazoAnos + duracaoAnos
  const fim = Math.min(prazoTotal + 1, anoFimExclusive)
  if (fim <= prazoAnos) return 0
  let count = 0
  for (let t = prazoAnos; t < fim; t += freq) count++
  return count
}

/** Valor exibido em cards e listas: total para únicos, valor por ocorrência para recorrentes. */
function valorExibicaoObjetivo(o: Objetivo, totalEstimado: number, parcelas: number): number {
  if (!o.recorrente) return Math.max(0, Number(o.valor) || 0)
  return parcelas > 0 ? totalEstimado / parcelas : 0
}

function anoAtual() {
  return new Date().getFullYear()
}

function anoInicioObjetivo(o: Objetivo) {
  return anoAtual() + Math.max(0, Number(o.prazoAnos) || 0)
}

function anoFimObjetivo(o: Objetivo, prazoTotal: number) {
  const inicioAnos = Math.max(0, Number(o.prazoAnos) || 0)
  if (!o.recorrente) return anoAtual() + inicioAnos
  const duracaoTipo = o.duracaoTipo ?? "total"
  const duracaoAnos = Math.max(0, Number(o.duracaoAnos) || 0)
  const fimAnos = duracaoTipo === "total" ? prazoTotal : inicioAnos + duracaoAnos
  return anoAtual() + Math.min(prazoTotal, Math.max(inicioAnos, fimAnos))
}

function capitalPorObjetivoPorAno(
  objetivos: Objetivo[],
  prazoTotal: number,
): Map<number, Map<string, number>> {
  const byYear = new Map<number, Map<string, number>>()

  const add = (year: number, objId: string, amount: number) => {
    if (amount <= 0) return
    if (!byYear.has(year)) byYear.set(year, new Map())
    const porObj = byYear.get(year)!
    porObj.set(objId, (porObj.get(objId) ?? 0) + amount)
  }

  for (const o of objetivos) {
    const prazoAnos = Math.max(0, Number(o.prazoAnos) || 0)
    const valor = Math.max(0, Number(o.valor) || 0)
    if (valor === 0 || prazoAnos > prazoTotal) continue

    if (!o.recorrente) {
      add(anoAtual() + prazoAnos, o.id, valor)
      continue
    }

    const freq = Math.max(1, Number(o.frequenciaAnos) || 1)
    const duracaoTipo = o.duracaoTipo ?? "total"
    const duracaoAnos = Math.max(0, Number(o.duracaoAnos) || 0)
    const anoFimExclusive =
      duracaoTipo === "total" ? prazoTotal + 1 : prazoAnos + duracaoAnos
    const fim = Math.min(prazoTotal + 1, anoFimExclusive)
    if (fim <= prazoAnos) continue

    for (let t = prazoAnos; t < fim; t += freq) {
      add(anoAtual() + t, o.id, valor)
    }
  }

  return byYear
}

function capitalPorAno(objetivos: Objetivo[], prazoTotal: number): Map<number, number> {
  const map = new Map<number, number>()
  for (const [year, porObj] of capitalPorObjetivoPorAno(objetivos, prazoTotal)) {
    let total = 0
    for (const v of porObj.values()) total += v
    if (total > 0) map.set(year, total)
  }
  return map
}

function formatRecorrencia(o: Objetivo): string {
  if (!o.recorrente) return "Única"
  const freq = Math.max(1, Number(o.frequenciaAnos) || 1)
  return `A cada ${freq} ${freq === 1 ? "ano" : "anos"}`
}

function formatDataObjetivo(o: Objetivo, prazoTotal: number): string {
  const inicio = anoInicioObjetivo(o)
  if (!o.recorrente) return String(inicio)
  const fim = anoFimObjetivo(o, prazoTotal)
  return `${inicio} – ${fim}`
}

function CardRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 14px",
        borderBottom: "0.5px solid rgba(0,0,0,0.08)",
      }}
    >
      <span style={{ fontSize: 13, color: "#5F85B8" }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#393939",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  )
}

export function Objetivos({ onNavigate }: ObjetivosProps) {
  const { state, setObjetivos } = usePlano()
  const { objetivos, premissas } = state
  const moeda = state.moeda ?? "BRL"
  const prazoTotal = Math.max(0, Number(premissas.prazo) || 0)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingObjetivo, setEditingObjetivo] = useState<Objetivo | null>(null)
  const [form, setForm] = useState<Omit<Objetivo, "id">>({
    descricao: "",
    prazoAnos: 0,
    valor: 0,
    recorrente: false,
    frequenciaAnos: 0,
    duracaoTipo: "total",
    duracaoAnos: 0,
    observacoes: "",
  })

  const formatCurrency = (value: number) => {
    if (!value) return ""
    return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: moeda === "USD" ? "USD" : "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const parseCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    return parseInt(numbers, 10) || 0
  }

  const openAddObjetivo = () => {
    setEditingObjetivo(null)
    setForm({
      descricao: "",
      prazoAnos: 0,
      valor: 0,
      recorrente: false,
      frequenciaAnos: 0,
      duracaoTipo: "total",
      duracaoAnos: 0,
      observacoes: "",
    })
    setModalOpen(true)
  }

  const openEditObjetivo = (objetivo: Objetivo) => {
    setEditingObjetivo(objetivo)
    setForm({
      descricao: objetivo.descricao,
      prazoAnos: objetivo.prazoAnos,
      valor: objetivo.valor,
      recorrente: objetivo.recorrente,
      frequenciaAnos: objetivo.frequenciaAnos,
      duracaoTipo: objetivo.duracaoTipo ?? "total",
      duracaoAnos: objetivo.duracaoTipo === "personalizado" ? (objetivo.duracaoAnos || 1) : 0,
      observacoes: objetivo.observacoes ?? "",
    })
    setModalOpen(true)
  }

  const saveObjetivo = () => {
    if (editingObjetivo) {
      setObjetivos(
        objetivos.map((o) =>
          o.id === editingObjetivo.id ? { ...o, ...form } : o
        )
      )
    } else {
      setObjetivos([
        ...objetivos,
        { id: Date.now().toString(), ...form },
      ])
    }
    setModalOpen(false)
  }

  const removeObjetivo = (id: string) => {
    setObjetivos(objetivos.filter((o) => o.id !== id))
  }

  const handleRecorrenteChange = (value: string) => {
    const isRecorrente = value === "sim"
    setForm({
      ...form,
      recorrente: isRecorrente,
      frequenciaAnos: isRecorrente ? form.frequenciaAnos || 1 : 0,
      duracaoTipo: isRecorrente ? (form.duracaoTipo ?? "total") : "total",
      duracaoAnos: isRecorrente
        ? (form.duracaoTipo === "personalizado" ? (form.duracaoAnos || 1) : 0)
        : 0,
    })
  }

  const totalEstimadoObjetivo = (o: Objetivo) => {
    const prazoAnos = Math.max(0, Number(o.prazoAnos) || 0)
    const valor = Math.max(0, Number(o.valor) || 0)
    if (valor === 0) return 0

    // Se começa depois do fim da simulação, não impacta
    if (prazoAnos > prazoTotal) return 0

    if (!o.recorrente) return valor

    const freq = Math.max(0, Number(o.frequenciaAnos) || 0)
    if (freq === 0) return 0

    const duracaoTipo = o.duracaoTipo ?? "total"
    const duracaoAnos = Math.max(0, Number(o.duracaoAnos) || 0)
    const anoFimExclusive =
      duracaoTipo === "total"
        ? prazoTotal + 1
        : prazoAnos + duracaoAnos

    const fim = Math.min(prazoTotal + 1, anoFimExclusive)
    if (fim <= prazoAnos) return 0

    let count = 0
    for (let t = prazoAnos; t < fim; t += freq) count++
    return count * valor
  }

  const objetivosEnriquecidos = useMemo(
    () =>
      objetivos.map((o) => ({
        objetivo: o,
        categoria: resolveCategoria(o.descricao),
        anoInicio: anoInicioObjetivo(o),
        anoFim: anoFimObjetivo(o, prazoTotal),
        parcelas: contarParcelas(o, prazoTotal),
        grupo: prazoGrupo(o.prazoAnos),
        total: totalEstimadoObjetivo(o),
      })),
    [objetivos, prazoTotal],
  )

  const capitalMap = useMemo(
    () => capitalPorAno(objetivos, prazoTotal),
    [objetivos, prazoTotal],
  )

  const capitalPorObjetivoMap = useMemo(
    () => capitalPorObjetivoPorAno(objetivos, prazoTotal),
    [objetivos, prazoTotal],
  )

  const corIndexPorIdRef = useRef<Map<string, number>>(new Map())

  const coresPorObjetivoId = useMemo(() => {
    const indexMap = corIndexPorIdRef.current
    let maxIndex = Math.max(-1, ...indexMap.values())
    const idsAtivos = new Set(objetivos.map((o) => o.id))

    for (const id of [...indexMap.keys()]) {
      if (!idsAtivos.has(id)) indexMap.delete(id)
    }

    for (const o of objetivos) {
      if (!indexMap.has(o.id)) {
        maxIndex += 1
        indexMap.set(o.id, maxIndex)
      }
    }

    const result = new Map<string, CorObjetivo>()
    for (const o of objetivos) {
      const idx = indexMap.get(o.id) ?? 0
      result.set(o.id, PALETA_OBJETIVOS[idx % PALETA_OBJETIVOS.length])
    }
    return result
  }, [objetivos])

  const anoCorrente = anoAtual()
  const anoPlanoFim = useMemo(() => {
    const fimObjetivos = objetivosEnriquecidos.reduce(
      (max, item) => Math.max(max, item.anoFim),
      anoCorrente,
    )
    return Math.max(anoCorrente, fimObjetivos, anoCorrente + prazoTotal)
  }, [objetivosEnriquecidos, prazoTotal, anoCorrente])

  const [periodoInicio, setPeriodoInicio] = useState(anoCorrente)
  const [periodoFim, setPeriodoFim] = useState(() => anoCorrente + prazoTotal)

  const anosVisiveis = useMemo(() => {
    const inicio = Math.min(periodoInicio, periodoFim)
    const fim = Math.max(periodoInicio, periodoFim)
    const anos: number[] = []
    for (let y = inicio; y <= fim; y++) anos.push(y)
    return anos
  }, [periodoInicio, periodoFim])

  const maxCapitalPeriodo = useMemo(() => {
    let max = 0
    for (const y of anosVisiveis) {
      max = Math.max(max, capitalMap.get(y) ?? 0)
    }
    return max
  }, [anosVisiveis, capitalMap])

  const totalPeriodo = useMemo(
    () => anosVisiveis.reduce((s, y) => s + (capitalMap.get(y) ?? 0), 0),
    [anosVisiveis, capitalMap],
  )

  const rotuloStep = Math.max(1, Math.ceil(anosVisiveis.length / 12))

  const aplicarPresetPeriodo = (anos: number | "todos") => {
    const inicio = anoCorrente
    const fim =
      anos === "todos" ? anoPlanoFim : Math.min(inicio + anos - 1, anoPlanoFim)
    setPeriodoInicio(inicio)
    setPeriodoFim(fim)
  }

  const handlePeriodoInicioChange = (raw: string) => {
    const v = parseInt(raw, 10)
    if (Number.isNaN(v)) return
    const inicio = Math.max(anoCorrente, Math.min(v, periodoFim))
    setPeriodoInicio(inicio)
  }

  const handlePeriodoFimChange = (raw: string) => {
    const v = parseInt(raw, 10)
    if (Number.isNaN(v)) return
    const fim = Math.min(anoPlanoFim, Math.max(v, periodoInicio))
    setPeriodoFim(fim)
  }

  const formatCurrencyAlways = (value: number) =>
    new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: moeda === "USD" ? "USD" : "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  const alertasConcentracao = useMemo(() => {
    const avisos: { anos: number[]; nomes: string[] }[] = []
    const porAnoInicio = new Map<number, Objetivo[]>()

    for (const o of objetivos) {
      const y = anoInicioObjetivo(o)
      if (!porAnoInicio.has(y)) porAnoInicio.set(y, [])
      porAnoInicio.get(y)!.push(o)
    }

    for (const [ano, lista] of porAnoInicio) {
      if (lista.length >= 2) {
        avisos.push({
          anos: [ano],
          nomes: lista.map((o) => (o.descricao || "Objetivo").trim()),
        })
      }
    }

    const anosOrdenados = [...porAnoInicio.keys()].sort((a, b) => a - b)
    for (let i = 0; i < anosOrdenados.length - 1; i++) {
      const a = anosOrdenados[i]
      const b = anosOrdenados[i + 1]
      if (b - a > 1) continue
      if (avisos.some((x) => x.anos.length === 1 && x.anos[0] === a)) continue
      const uniao = [...(porAnoInicio.get(a) ?? []), ...(porAnoInicio.get(b) ?? [])]
      const unicos = [...new Map(uniao.map((o) => [o.id, o])).values()]
      if (unicos.length >= 2) {
        avisos.push({
          anos: [a, b],
          nomes: unicos.map((o) => (o.descricao || "Objetivo").trim()),
        })
      }
    }

    return avisos
  }, [objetivos])

  const renderCardRows = (objetivo: Objetivo) => {
    const total = totalEstimadoObjetivo(objetivo)
    const parcelas = contarParcelas(objetivo, prazoTotal)
    const valorExibicao = valorExibicaoObjetivo(objetivo, total, parcelas)

    return (
      <>
        <CardRow label="Data / período" value={formatDataObjetivo(objetivo, prazoTotal)} />
        <CardRow label="Recorrência" value={formatRecorrencia(objetivo)} />
        <CardRow
          label={objetivo.recorrente ? "Valor por ocorrência" : "Valor total"}
          value={formatCurrency(valorExibicao) || "—"}
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground mb-1">Cadastro</p>
        <h1 className="page-title text-[24px] text-foreground">
          Objetivos <span className="text-primary">Financeiros</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Metas de vida e grandes despesas planejadas pelo cliente
        </p>
      </div>

      {/* Card Metas e Objetivos */}
      <Card className="form-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Metas e Objetivos
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={openAddObjetivo}
            className="border border-dashed border-muted-foreground/50 text-muted-foreground hover:text-foreground hover:border-foreground"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Objetivo
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {objetivos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum objetivo cadastrado. Clique em &quot;+ Adicionar Objetivo&quot; para começar.
            </p>
          ) : (
            <>
              {/* 1. Gráfico necessidade de capital por ano */}
              <div
                style={{
                  background: "#F5F5F5",
                  borderRadius: 12,
                  padding: "20px 16px 16px",
                }}
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider m-0 mb-4">
                  Necessidade de capital por ano
                </p>

                {/* Seletor de período */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
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
                      onChange={(e) => handlePeriodoInicioChange(e.target.value)}
                      className="h-8 w-[88px] text-sm bg-white"
                    />
                    <label style={{ fontSize: 12, color: "#5F85B8" }}>até</label>
                    <Input
                      type="number"
                      min={periodoInicio}
                      max={anoPlanoFim}
                      value={periodoFim}
                      onChange={(e) => handlePeriodoFimChange(e.target.value)}
                      className="h-8 w-[88px] text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Legenda por objetivo */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px 16px",
                    marginBottom: 14,
                  }}
                >
                  {objetivos.map((o) => {
                    const cor = coresPorObjetivoId.get(o.id) ?? PALETA_OBJETIVOS[0]
                    const nome = (o.descricao || "Objetivo").trim()
                    return (
                      <div
                        key={o.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          minWidth: 0,
                          maxWidth: "100%",
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            background: cor.fill,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11,
                            color: "#393939",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {nome}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <GraficoCapitalPorAno
                      anosVisiveis={anosVisiveis}
                      capitalMap={capitalMap}
                      capitalPorObjetivoMap={capitalPorObjetivoMap}
                      objetivos={objetivos}
                      coresPorObjetivoId={coresPorObjetivoId}
                      maxCapitalPeriodo={maxCapitalPeriodo}
                      rotuloStep={rotuloStep}
                      formatCurrency={formatCurrencyAlways}
                    />
                  </div>
                  <div
                    style={{
                      flexShrink: 0,
                      textAlign: "right",
                      paddingLeft: 8,
                      borderLeft: "1px solid rgba(0,0,0,0.08)",
                      minWidth: 120,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color: "#5F85B8",
                        lineHeight: 1.3,
                      }}
                    >
                      Total do período
                    </p>
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 18,
                        fontWeight: 700,
                        color: "#393939",
                        fontVariantNumeric: "tabular-nums",
                        lineHeight: 1.2,
                      }}
                    >
                      {formatCurrencyAlways(totalPeriodo)}
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 10, color: "#9CA3AF" }}>
                      {Math.min(periodoInicio, periodoFim)}–{Math.max(periodoInicio, periodoFim)}
                    </p>
                  </div>
                </div>
              </div>

              {/* 2. Alerta de concentração */}
              {alertasConcentracao.length > 0 ? (
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    padding: "14px 16px",
                    borderRadius: 10,
                    background: "#FEF3C7",
                    border: "1px solid #173C6E",
                  }}
                >
                  <AlertTriangle
                    size={20}
                    color="#B45309"
                    style={{ flexShrink: 0, marginTop: 2 }}
                  />
                  <div style={{ fontSize: 13, color: "#78350F", lineHeight: 1.45 }}>
                    <p style={{ margin: "0 0 6px", fontWeight: 600 }}>
                      Concentração de objetivos no mesmo período
                    </p>
                    {alertasConcentracao.map((aviso, idx) => (
                      <p key={idx} style={{ margin: idx === alertasConcentracao.length - 1 ? 0 : "0 0 4px" }}>
                        Em{" "}
                        {aviso.anos.length === 1
                          ? aviso.anos[0]
                          : `${aviso.anos[0]} e ${aviso.anos[1]}`}
                        : {aviso.nomes.join(", ")}. Considere reavaliar prazos ou antecipar
                        aportes para distribuir melhor a necessidade de capital.
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

              {/* 3. Grid de cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                {objetivosEnriquecidos.map(({ objetivo, categoria, parcelas }) => {
                  const meta = CATEGORIA_META[categoria]
                  const Icon = meta.Icon
                  const nomeExibicao = (objetivo.descricao || "Sem descrição").trim()

                  return (
                    <div
                      key={objetivo.id}
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                      }}
                    >
                      <div
                        style={{
                          background: VOGA_NAVY,
                          padding: "12px 14px",
                          borderRadius: "12px 12px 0 0",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <Icon size={18} color={VOGA_GOLD} strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
                          <p
                            style={{
                              margin: 0,
                              color: "#fff",
                              fontSize: 12,
                              fontWeight: 600,
                              letterSpacing: "0.06em",
                              lineHeight: 1.3,
                            }}
                          >
                            {meta.label}
                          </p>
                          {objetivo.recorrente && parcelas > 0 ? (
                            <span
                              style={{
                                display: "inline-block",
                                marginTop: 6,
                                fontSize: 10,
                                fontWeight: 600,
                                color: VOGA_GOLD,
                                background: VOGA_GOLD_LIGHT,
                                borderRadius: 999,
                                padding: "3px 8px",
                                letterSpacing: "0.02em",
                              }}
                            >
                              recorrente · {parcelas}x
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div style={{ background: "#F5F5F5", borderRadius: "0 0 12px 12px" }}>
                        <div
                          style={{
                            padding: "12px 14px",
                            borderBottom: "0.5px solid rgba(0,0,0,0.08)",
                          }}
                        >
                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              fontWeight: 600,
                              color: "#393939",
                              lineHeight: 1.35,
                            }}
                          >
                            {nomeExibicao}
                          </p>
                        </div>
                        {renderCardRows(objetivo)}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 10px 10px",
                            borderTop: "0.5px solid rgba(0,0,0,0.06)",
                          }}
                        >
                          <div style={{ display: "flex", gap: 4 }}>
                            {!!(objetivo.observacoes ?? "").trim() && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5"
                                    aria-label="Ver observações"
                                  >
                                    <StickyNote className="w-4 h-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={8} className="max-w-[320px] whitespace-pre-wrap">
                                  {(objetivo.observacoes ?? "").trim()}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditObjetivo(objetivo)}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeObjetivo(objetivo.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* 4. Lista vertical por prazo */}
              <div
                style={{
                  background: "#F5F5F5",
                  borderRadius: 12,
                  padding: "20px 16px",
                }}
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider m-0 mb-4">
                  Objetivos por prazo
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {PRAZO_GRUPOS.map((grupo) => {
                    const itens = objetivosEnriquecidos
                      .filter((item) => item.grupo === grupo.id)
                      .sort((a, b) => a.objetivo.prazoAnos - b.objetivo.prazoAnos)

                    if (itens.length === 0) return null

                    return (
                      <div key={grupo.id}>
                        <p
                          style={{
                            margin: "0 0 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#5F85B8",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {grupo.titulo}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          {itens.map((item, idx) => {
                            const Icon = CATEGORIA_META[item.categoria].Icon
                            const o = item.objetivo
                            const subtitulo = `${formatDataObjetivo(o, prazoTotal)} (${formatRecorrencia(o)})`

                            return (
                              <div
                                key={o.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                  padding: "12px 4px",
                                  borderBottom:
                                    idx < itens.length - 1
                                      ? "0.5px solid rgba(0,0,0,0.08)"
                                      : "none",
                                }}
                              >
                                <div
                                  style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 8,
                                    background: VOGA_GOLD_LIGHT,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <Icon size={16} color={VOGA_GOLD_DARK} strokeWidth={2} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: "#393939",
                                    }}
                                  >
                                    {(o.descricao || "Objetivo").trim()}
                                  </p>
                                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#5F85B8" }}>
                                    {subtitulo}
                                  </p>
                                </div>
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "#393939",
                                    flexShrink: 0,
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  {formatCurrency(valorExibicaoObjetivo(o, item.total, item.parcelas))}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Botões de navegação */}
      <div className="nav-footer">
        <Button
          variant="ghost"
          className="btn-back"
          onClick={() => onNavigate("patrimonio")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button 
          onClick={() => onNavigate("fluxo-de-caixa")}
          className="btn-next"
        >
          Próximo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Modal Objetivo */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="form-card rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingObjetivo ? "Editar Objetivo" : "Adicionar Objetivo"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Cadastre uma meta ou grande despesa planejada
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="field-label">
                Descrição
              </label>
              {(() => {
                const descricaoAtual = (form.descricao ?? "").trim()
                const isPredefinido = (OBJETIVOS_PREDEFINIDOS as readonly string[]).includes(descricaoAtual)
                const selectValue = isPredefinido ? descricaoAtual : "Outros"
                const otherValue = isPredefinido ? "" : descricaoAtual

                return (
                  <div className="space-y-2">
                    <Select
                      value={selectValue}
                      onValueChange={(value) => {
                        if (value === "Outros") {
                          setForm({ ...form, descricao: isPredefinido ? "" : descricaoAtual })
                          return
                        }
                        setForm({ ...form, descricao: value })
                      }}
                    >
                      <SelectTrigger className="form-card text-foreground">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="form-card">
                        {OBJETIVOS_PREDEFINIDOS.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>

                    {selectValue === "Outros" && (
                      <Input
                        value={otherValue}
                        onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                        placeholder="Descreva o objetivo..."
                        className="form-card text-foreground placeholder:text-muted-foreground"
                      />
                    )}
                  </div>
                )
              })()}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="field-label">
                  Prazo (anos)
                </label>
                <Input
                  type="number"
                  value={form.prazoAnos || ""}
                  onChange={(e) => setForm({ ...form, prazoAnos: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="form-card text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="field-label">
                  Valor Estimado (R$)
                </label>
                <Input
                  value={form.valor ? formatCurrency(form.valor) : ""}
                  onChange={(e) => setForm({ ...form, valor: parseCurrency(e.target.value) })}
                  placeholder="0,00"
                  className="form-card text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="field-label">
                Recorrente?
              </label>
              <Select
                value={form.recorrente ? "sim" : "nao"}
                onValueChange={handleRecorrenteChange}
              >
                <SelectTrigger className="form-card text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="form-card">
                  <SelectItem value="nao">Não — acontece uma vez</SelectItem>
                  <SelectItem value="sim">Sim — repete periodicamente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo "Repetir a cada" com animação */}
            <div
              className={`space-y-2 transition-all duration-300 ease-in-out ${
                form.recorrente
                  ? "opacity-100 max-h-24 translate-y-0"
                  : "opacity-0 max-h-0 -translate-y-2 overflow-hidden"
              }`}
            >
              <label className="field-label">
                Repetir a cada (anos)
              </label>
              <Input
                type="number"
                value={form.frequenciaAnos || ""}
                onChange={(e) => setForm({ ...form, frequenciaAnos: parseInt(e.target.value) || 0 })}
                placeholder="1"
                className="form-card text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Campos de duração (somente recorrente) */}
            <div
              className={`space-y-4 transition-all duration-300 ease-in-out ${
                form.recorrente
                  ? "opacity-100 max-h-96 translate-y-0"
                  : "opacity-0 max-h-0 -translate-y-2 overflow-hidden"
              }`}
            >
              <div className="space-y-2">
                <label className="field-label">
                  Duração
                </label>
                <Select
                  value={form.duracaoTipo ?? "total"}
                  onValueChange={(v) => {
                    const duracaoTipo = (v === "personalizado" ? "personalizado" : "total") as "total" | "personalizado"
                    setForm((prev) => ({
                      ...prev,
                      duracaoTipo,
                      duracaoAnos: duracaoTipo === "personalizado" ? (prev.duracaoAnos || 1) : 0,
                    }))
                  }}
                >
                  <SelectTrigger className="form-card text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="form-card">
                    <SelectItem value="total">Todo o período</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div
                className={`space-y-2 transition-all duration-300 ease-in-out ${
                  form.recorrente && form.duracaoTipo === "personalizado"
                    ? "opacity-100 max-h-24 translate-y-0"
                    : "opacity-0 max-h-0 -translate-y-2 overflow-hidden"
                }`}
              >
                <label className="field-label">
                  Por quantos anos?
                </label>
                <Input
                  type="number"
                  value={form.duracaoAnos || ""}
                  onChange={(e) => setForm({ ...form, duracaoAnos: parseInt(e.target.value) || 0 })}
                  placeholder="Ex: 4"
                  className="form-card text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2 pt-2">
              <label className="field-label">
                Observações
              </label>
              <Textarea
                rows={3}
                value={form.observacoes ?? ""}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Descreva detalhes do objetivo, premissas, prioridade..."
                className="form-card text-foreground placeholder:text-muted-foreground resize-y"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveObjetivo}
              className="btn-next"
            >
              {editingObjetivo ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
