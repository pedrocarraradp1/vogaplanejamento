"use client"

import { useMemo, useState, type ComponentType } from "react"
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
} from "lucide-react"
import { usePlano, type Objetivo } from "@/lib/plano-context"

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

const CATEGORIA_META: Record<
  CategoriaObjetivo,
  { color: string; label: string; Icon: ComponentType<{ size?: number; strokeWidth?: number }> }
> = {
  aposentadoria: { color: "#1B2A4A", label: "APOSENTADORIA", Icon: Umbrella },
  viagem: { color: "#1E5CE6", label: "VIAGEM", Icon: Plane },
  educacao: { color: "#10B981", label: "EDUCAÇÃO", Icon: GraduationCap },
  imovel: { color: "#F59E0B", label: "IMÓVEL", Icon: Home },
  outros: { color: "#E05252", label: "OUTROS", Icon: Gift },
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
      <span style={{ fontSize: 13, color: "#6B7280" }}>{label}</span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#1A1A1A",
          textAlign: "right",
        }}
      >
        {value}
      </span>
    </div>
  )
}

export function Objetivos({ onNavigate }: ObjetivosProps) {
  const { state, setObjetivos, getIdadeAtual } = usePlano()
  const { objetivos, premissas, dadosPessoais } = state
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

  const idadeAtual = getIdadeAtual()

  const timelineItems = useMemo(() => {
    return [...objetivos]
      .map((o) => ({
        objetivo: o,
        categoria: resolveCategoria(o.descricao),
        anoInicio: anoInicioObjetivo(o),
        anoFim: anoFimObjetivo(o, prazoTotal),
        parcelas: contarParcelas(o, prazoTotal),
      }))
      .sort((a, b) => a.anoInicio - b.anoInicio || a.anoFim - b.anoFim)
  }, [objetivos, prazoTotal])

  const anoMin = anoAtual()
  const anoMax = useMemo(() => {
    if (timelineItems.length === 0) return anoMin
    return Math.max(...timelineItems.map((t) => t.anoFim), anoMin)
  }, [timelineItems, anoMin])

  const yearToPct = (year: number) => {
    if (anoMax <= anoMin) return 50
    return 8 + ((year - anoMin) / (anoMax - anoMin)) * 84
  }

  const renderCardRows = (objetivo: Objetivo, categoria: CategoriaObjetivo) => {
    const inicio = anoInicioObjetivo(objetivo)
    const fim = anoFimObjetivo(objetivo, prazoTotal)
    const parcelas = contarParcelas(objetivo, prazoTotal)
    const total = totalEstimadoObjetivo(objetivo)
    const idadeAlvo = idadeAtual + Math.max(0, Number(objetivo.prazoAnos) || 0)
    const temConjuge = !!(dadosPessoais.conjuge || "").trim()

    if (categoria === "aposentadoria") {
      return (
        <>
          <CardRow
            label="Idade alvo"
            value={
              temConjuge
                ? `Titular ${idadeAlvo} · Cônjuge ${idadeAlvo}`
                : `${idadeAlvo} anos`
            }
          />
          <CardRow
            label="Renda mensal desejada"
            value={formatCurrency(premissas.retiradaMensal || objetivo.valor) || "—"}
          />
          <CardRow
            label="Patrimônio necessário"
            value={formatCurrency(total || objetivo.valor) || "—"}
          />
        </>
      )
    }

    if (categoria === "educacao") {
      if (objetivo.recorrente) {
        return (
          <>
            <CardRow label="Início · fim" value={`${inicio} · ${fim}`} />
            <CardRow label="Valor anual" value={formatCurrency(objetivo.valor) || "—"} />
            <CardRow label="Total estimado" value={formatCurrency(total) || "—"} />
          </>
        )
      }
      return (
        <>
          <CardRow label="Data alvo" value={String(inicio)} />
          <CardRow label="Recorrência" value="Única" />
          <CardRow label="Valor" value={formatCurrency(objetivo.valor) || "—"} />
        </>
      )
    }

    if (categoria === "imovel" || categoria === "viagem" || categoria === "outros") {
      return (
        <>
          <CardRow label="Data alvo" value={String(inicio)} />
          <CardRow
            label="Recorrência"
            value={objetivo.recorrente ? `A cada ${objetivo.frequenciaAnos || 1} ano(s)` : "Única"}
          />
          <CardRow label="Valor" value={formatCurrency(objetivo.valor) || "—"} />
        </>
      )
    }

    return (
      <>
        <CardRow label="Data alvo" value={String(inicio)} />
        <CardRow label="Valor" value={formatCurrency(objetivo.valor) || "—"} />
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                {objetivos.map((objetivo) => {
                  const categoria = resolveCategoria(objetivo.descricao)
                  const meta = CATEGORIA_META[categoria]
                  const Icon = meta.Icon
                  const parcelas = contarParcelas(objetivo, prazoTotal)
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
                          background: meta.color,
                          padding: "12px 14px",
                          borderRadius: "12px 12px 0 0",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                      >
                        <Icon size={18} color="#fff" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
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
                                color: "#fff",
                                background: "rgba(255,255,255,0.18)",
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
                              color: "#1A1A1A",
                              lineHeight: 1.35,
                            }}
                          >
                            {nomeExibicao}
                          </p>
                        </div>
                        {renderCardRows(objetivo, categoria)}
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

              <div
                style={{
                  background: "#F5F5F5",
                  borderRadius: 12,
                  padding: "20px 16px 24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider m-0">
                    Linha do tempo dos objetivos
                  </p>
                  <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#6B7280" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: "#9CA3AF",
                          display: "inline-block",
                        }}
                      />
                      Meta única
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 22,
                          height: 6,
                          borderRadius: 3,
                          background: "#10B981",
                          display: "inline-block",
                        }}
                      />
                      Meta recorrente
                    </span>
                  </div>
                </div>

                <div style={{ position: "relative", padding: "8px 12px 72px", minHeight: 120 }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 24,
                      right: 24,
                      top: 44,
                      height: 1,
                      background: "rgba(0,0,0,0.12)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: 24,
                      top: 38,
                      fontSize: 11,
                      color: "#9CA3AF",
                    }}
                  >
                    {anoMin}
                  </div>
                  <div
                    style={{
                      position: "absolute",
                      right: 24,
                      top: 38,
                      fontSize: 11,
                      color: "#9CA3AF",
                    }}
                  >
                    {anoMax}
                  </div>

                  {timelineItems.map((item) => {
                    const color = CATEGORIA_META[item.categoria].color
                    const nome = (item.objetivo.descricao || "Objetivo").trim()
                    const startPct = yearToPct(item.anoInicio)

                    if (!item.objetivo.recorrente) {
                      return (
                        <div
                          key={item.objetivo.id}
                          style={{
                            position: "absolute",
                            left: `${startPct}%`,
                            top: 36,
                            transform: "translateX(-50%)",
                            textAlign: "center",
                            width: 120,
                          }}
                        >
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              background: color,
                              margin: "0 auto",
                              border: "2px solid #fff",
                              boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                            }}
                          />
                          <p style={{ margin: "10px 0 2px", fontSize: 11, color: "#6B7280" }}>
                            {item.anoInicio}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#1A1A1A",
                              lineHeight: 1.3,
                            }}
                          >
                            {nome}
                          </p>
                        </div>
                      )
                    }

                    const endPct = yearToPct(item.anoFim)
                    const barLeft = Math.min(startPct, endPct)
                    const barWidth = Math.max(4, Math.abs(endPct - startPct))
                    const parcelas = item.parcelas

                    return (
                      <div
                        key={item.objetivo.id}
                        style={{
                          position: "absolute",
                          left: `${barLeft}%`,
                          top: 40,
                          width: `${barWidth}%`,
                          minWidth: 28,
                          transform: "translateY(-50%)",
                        }}
                      >
                        <div style={{ position: "relative", height: 8 }}>
                          <div
                            style={{
                              height: 6,
                              borderRadius: 3,
                              background: color,
                              width: "100%",
                            }}
                          />
                          {Array.from({ length: Math.min(parcelas, 8) }).map((_, i) => {
                            const markPct = parcelas <= 1 ? 50 : (i / (parcelas - 1)) * 100
                            return (
                              <div
                                key={i}
                                style={{
                                  position: "absolute",
                                  left: `${markPct}%`,
                                  top: -2,
                                  width: 1,
                                  height: 10,
                                  background: "rgba(255,255,255,0.85)",
                                  transform: "translateX(-50%)",
                                }}
                              />
                            )
                          })}
                        </div>
                        <div
                          style={{
                            textAlign: "center",
                            marginTop: 18,
                            width: 140,
                            marginLeft: "50%",
                            transform: "translateX(-50%)",
                          }}
                        >
                          <p style={{ margin: "0 0 2px", fontSize: 11, color: "#6B7280" }}>
                            {item.anoInicio} – {item.anoFim}
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 11,
                              fontWeight: 600,
                              color: "#1A1A1A",
                              lineHeight: 1.3,
                            }}
                          >
                            {nome} · {parcelas} parcela{parcelas === 1 ? "" : "s"} anuais
                          </p>
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
