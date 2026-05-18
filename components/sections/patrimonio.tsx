"use client"

import { useState, useCallback, useMemo, type ReactNode } from "react"
import { Input } from "@/components/ui/input"
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
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Label,
  LabelList,
  ResponsiveContainer,
} from "recharts"
import { ArrowLeft, ArrowRight, Pencil } from "lucide-react"
import { usePlano, type Ativo, type Passivo } from "@/lib/plano-context"

interface PatrimonioProps {
  onNavigate: (section: string) => void
}

const DESCRICOES_ATIVOS_POR_TIPO: Record<string, string[]> = {
  "Líquido": [
    "Ativos Nacionais",
    "Ativos Internacionais",
    "Previdência Privada (PGBL/VGBL)",
    "Outros",
  ],
  Imobilizado: [
    "Casa / Apartamento Residencial",
    "Imóvel para Investimento",
    "Terreno",
    "Veículo / Carro",
    "Outros",
  ],
  "Participação Societária": [
    "Sociedade Empresarial (Quotas)",
    "Holding Familiar",
    "Outros",
  ],
}

const CATEGORIAS_PASSIVO = [
  "Financiamento Imóvel",
  "Financiamento Veículo",
  "Empréstimo Pessoal",
  "Outros",
] as const

const CATEGORIAS_LIQUIDO = DESCRICOES_ATIVOS_POR_TIPO["Líquido"]
const CATEGORIAS_IMOBILIZADO = DESCRICOES_ATIVOS_POR_TIPO["Imobilizado"]

const TOOLTIP_STYLE = {
  backgroundColor: "#131929",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
} as const

/** Azul escuro (maior) → azul claro (menor), por posição no ranking. */
function blueShadeByRank(index: number, total: number): string {
  if (total <= 1) return "#1E5CE6"
  const t = 1 - index / (total - 1)
  const r = Math.round(140 + (30 - 140) * t)
  const g = Math.round(180 + (92 - 180) * t)
  const b = Math.round(255 + (230 - 255) * t)
  return `rgb(${r},${g},${b})`
}

function matchesAtivoCategoria(ativo: Ativo, tipo: string, categoria: string): boolean {
  if ((ativo.tipo ?? "").trim() !== tipo) return false
  const desc = (ativo.descricao ?? "").trim()
  const cats = DESCRICOES_ATIVOS_POR_TIPO[tipo] ?? []
  if (categoria === "Outros") {
    return desc === "Outros" || (desc !== "" && !cats.slice(0, -1).includes(desc))
  }
  return desc === categoria
}

function matchesPassivoCategoria(passivo: Passivo, categoria: string): boolean {
  const tipo = (passivo.tipo ?? "").trim()
  if (categoria === "Outros") {
    return tipo === "Outros" || (tipo !== "" && !CATEGORIAS_PASSIVO.slice(0, -1).includes(tipo as (typeof CATEGORIAS_PASSIVO)[number]))
  }
  return tipo === categoria
}

type DonutSlice = { name: string; value: number; fill: string }
type BarraLiquido = { name: string; value: number; fill: string; pctLiquido: number }

function PatrimonioCharts({
  dataDonut,
  totalDonut,
  dataBarrasLiquido,
  alturaBarras,
  patrimonioLiquido,
  formatCurrency,
}: {
  dataDonut: DonutSlice[]
  totalDonut: number
  dataBarrasLiquido: BarraLiquido[]
  alturaBarras: number
  patrimonioLiquido: number
  formatCurrency: (value: number) => string
}) {
  const donutAtivo = dataDonut.filter((d) => d.value > 0)

  return (
    <section className="rounded-xl bg-[#131929] border border-white/10 p-5 md:p-6">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
        Visualização
      </p>
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-[40%] flex flex-col">
          <p className="text-sm font-medium text-foreground mb-3">
            Distribuição por Categoria Principal
          </p>
          {totalDonut > 0 ? (
            <>
              <div className="h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutAtivo}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={100}
                      paddingAngle={2}
                      stroke="transparent"
                    >
                      {donutAtivo.map((entry, i) => (
                        <Cell key={`${entry.name}-${i}`} fill={entry.fill} />
                      ))}
                      <Label
                        position="center"
                        content={({ viewBox }) => {
                          const cx =
                            (viewBox as { cx?: number; cy?: number } | undefined)?.cx ?? 0
                          const cy =
                            (viewBox as { cx?: number; cy?: number } | undefined)?.cy ?? 0
                          return (
                            <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={cx} dy="-0.55em" fontSize={11} fill="#9CA3AF">
                                Patrimônio Líquido
                              </tspan>
                              <tspan
                                x={cx}
                                dy="1.35em"
                                fontSize={17}
                                fontWeight={700}
                                fill="#1E5CE6"
                              >
                                {formatCurrency(patrimonioLiquido)}
                              </tspan>
                            </text>
                          )
                        }}
                      />
                    </Pie>
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      labelStyle={{ color: "#ffffff", fontWeight: 600 }}
                      itemStyle={{ color: "#ffffff" }}
                      formatter={(v: number, name: string) => {
                        const pct = totalDonut > 0 ? ((v / totalDonut) * 100).toFixed(1) : "0"
                        return [`${formatCurrency(v)} (${pct}%)`, name]
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-4 space-y-2">
                {dataDonut.map((item) => {
                  const pct =
                    totalDonut > 0 ? ((item.value / totalDonut) * 100).toFixed(1) : "0.0"
                  return (
                    <li
                      key={item.name}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-foreground flex-1 min-w-0 truncate">{item.name}</span>
                      <span className="tabular-nums text-foreground shrink-0">
                        {formatCurrency(item.value)}
                      </span>
                      <span className="tabular-nums w-12 text-right shrink-0">{pct}%</span>
                    </li>
                  )
                })}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-16">
              Preencha os valores acima para ver a distribuição.
            </p>
          )}
        </div>

        <div className="w-full lg:w-[60%] flex flex-col min-w-0">
          <p className="text-sm font-medium text-foreground mb-3">
            Subcategorias de Ativos Líquidos
          </p>
          {dataBarrasLiquido.length > 0 ? (
            <div className="w-full" style={{ height: alturaBarras }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={dataBarrasLiquido}
                  margin={{ top: 4, right: 88, left: 4, bottom: 4 }}
                >
                  <XAxis type="number" hide domain={[0, "dataMax"]} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={168}
                    tick={{ fill: "#9CA3AF", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={TOOLTIP_STYLE}
                    labelStyle={{ color: "#ffffff", fontWeight: 600 }}
                    itemStyle={{ color: "#ffffff" }}
                    formatter={(v: number, _name: string, item) => {
                      const pct =
                        (item as { payload?: { pctLiquido?: number } }).payload?.pctLiquido?.toFixed(
                          1,
                        ) ?? "0"
                      return [`${formatCurrency(v)} (${pct}% do líquido)`, "Valor"]
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {dataBarrasLiquido.map((entry, i) => (
                      <Cell key={`${entry.name}-${i}`} fill={entry.fill} />
                    ))}
                    <LabelList
                      dataKey="value"
                      position="right"
                      formatter={(v: number) => formatCurrency(Number(v))}
                      style={{ fill: "#E5E7EB", fontSize: 11, fontWeight: 600 }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-16">
              Nenhuma subcategoria de ativos líquidos com valor informado.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function PatrimonioBarRow({
  label,
  valor,
  totalSecao,
  barColor,
  formatCurrency,
  valueClassName = "text-foreground",
  onValueCommit,
  onEdit,
}: {
  label: string
  valor: number
  totalSecao: number
  barColor: string
  formatCurrency: (value: number) => string
  valueClassName?: string
  onValueCommit: (valor: number) => void
  onEdit?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState("")

  const pct =
    totalSecao > 0 ? Math.min(100, Math.round((valor / totalSecao) * 100)) : 0
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
    <div className="py-3 border-b border-white/5 last:border-0 space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-sm text-foreground flex-1 min-w-0 truncate">{label}</span>
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onEdit}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
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
              className="h-8 w-32 text-right bg-[#0D1220] border-white/10 text-foreground text-sm tabular-nums"
            />
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className={`text-sm font-semibold tabular-nums hover:opacity-80 ${valueClassName}`}
            >
              {formatCurrency(valor)}
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${barWidth}%`, backgroundColor: barColor }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums w-9 text-right shrink-0">
          {pct}%
        </span>
      </div>
    </div>
  )
}

function PatrimonioSection({
  title,
  totalLabel,
  totalValue,
  totalClassName = "text-foreground",
  children,
}: {
  title: string
  totalLabel: string
  totalValue: string
  totalClassName?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-xl bg-[#131929] border border-white/10 p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-4 border-b border-white/10">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className={`text-lg md:text-xl font-bold tabular-nums ${totalClassName}`}>
          {totalLabel}{" "}
          <span className={totalClassName}>{totalValue}</span>
        </p>
      </div>
      <div>{children}</div>
    </section>
  )
}

export function Patrimonio({ onNavigate }: PatrimonioProps) {
  const { state, setAtivos, setPassivos, getPatrimonioLiquido } = usePlano()
  const { ativos, passivos, moeda } = state

  const [ativoModalOpen, setAtivoModalOpen] = useState(false)
  const [editingAtivo, setEditingAtivo] = useState<Ativo | null>(null)
  const [ativoForm, setAtivoForm] = useState<Omit<Ativo, "id">>({
    tipo: "",
    descricao: "",
    instituicao: "",
    valor: 0,
    heranca: false,
  })

  type PassivoForm = Omit<Passivo, "id" | "modelo"> & { modelo: Passivo["modelo"] }

  const [passivoModalOpen, setPassivoModalOpen] = useState(false)
  const [editingPassivo, setEditingPassivo] = useState<Passivo | null>(null)
  const [passivoForm, setPassivoForm] = useState<PassivoForm>({
    tipo: "",
    modelo: "SAC",
    descricao: "",
    valor: 0,
    taxa: 0,
    prazo: 0,
  })

  const formatCurrency = useCallback(
    (value: number) => {
      return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
        style: "currency",
        currency: moeda === "USD" ? "USD" : "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    },
    [moeda],
  )

  const parseCurrency = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, "")
    return parseInt(cleaned, 10) || 0
  }

  const sumAtivoCategoria = useCallback(
    (tipo: string, categoria: string) =>
      ativos
        .filter((a) => matchesAtivoCategoria(a, tipo, categoria))
        .reduce((s, a) => s + (Number(a.valor) || 0), 0),
    [ativos],
  )

  const sumPassivoCategoria = useCallback(
    (categoria: string) =>
      passivos
        .filter((p) => matchesPassivoCategoria(p, categoria))
        .reduce((s, p) => s + (Number(p.valor) || 0), 0),
    [passivos],
  )

  const setAtivoCategoria = useCallback(
    (tipo: string, categoria: string, valor: number) => {
      const kept = ativos.filter((a) => !matchesAtivoCategoria(a, tipo, categoria))
      if (valor <= 0) {
        setAtivos(kept)
        return
      }
      const existing = ativos.find((a) => matchesAtivoCategoria(a, tipo, categoria))
      if (existing) {
        setAtivos(
          kept.concat({
            ...existing,
            valor,
            descricao: categoria === "Outros" && !existing.descricao ? "Outros" : existing.descricao || categoria,
          }),
        )
      } else {
        setAtivos(
          kept.concat({
            id: Date.now().toString(),
            tipo,
            descricao: categoria,
            instituicao: "",
            valor,
            heranca: false,
          }),
        )
      }
    },
    [ativos, setAtivos],
  )

  const setPassivoCategoria = useCallback(
    (categoria: string, valor: number) => {
      const kept = passivos.filter((p) => !matchesPassivoCategoria(p, categoria))
      if (valor <= 0) {
        setPassivos(kept)
        return
      }
      const existing = passivos.find((p) => matchesPassivoCategoria(p, categoria))
      if (existing) {
        setPassivos(kept.concat({ ...existing, valor, tipo: categoria }))
      } else {
        setPassivos(
          kept.concat({
            id: Date.now().toString(),
            tipo: categoria,
            modelo: "SAC",
            descricao: categoria,
            valor,
            taxa: 0,
            prazo: 0,
          }),
        )
      }
    },
    [passivos, setPassivos],
  )

  const valoresLiquido = useMemo(
    () => CATEGORIAS_LIQUIDO.map((cat) => ({ cat, valor: sumAtivoCategoria("Líquido", cat) })),
    [sumAtivoCategoria],
  )
  const valoresImobilizado = useMemo(
    () => CATEGORIAS_IMOBILIZADO.map((cat) => ({ cat, valor: sumAtivoCategoria("Imobilizado", cat) })),
    [sumAtivoCategoria],
  )
  const valoresPassivo = useMemo(
    () => CATEGORIAS_PASSIVO.map((cat) => ({ cat, valor: sumPassivoCategoria(cat) })),
    [sumPassivoCategoria],
  )

  const totalAtivosLiquidos = valoresLiquido.reduce((s, x) => s + x.valor, 0)
  const totalAtivosReais = valoresImobilizado.reduce((s, x) => s + x.valor, 0)
  const totalPassivos = valoresPassivo.reduce((s, x) => s + x.valor, 0)
  const totalAtivos = ativos.reduce((sum, a) => sum + (a.valor || 0), 0)
  const patrimonioLiquido = getPatrimonioLiquido()
  const plConsolidado = patrimonioLiquido

  const ativosLiquidos = totalAtivosLiquidos
  const imobilizado = totalAtivosReais
  const passivosTotal = totalPassivos

  const dataDonut = useMemo(
    () => [
      { name: "Ativos Líquidos", value: ativosLiquidos, fill: "#1E5CE6" },
      { name: "Imobilizado", value: imobilizado, fill: "#1D9E75" },
      { name: "Passivos", value: passivosTotal, fill: "#E24B4A" },
    ],
    [ativosLiquidos, imobilizado, passivosTotal],
  )

  const totalDonut = dataDonut.reduce((s, d) => s + d.value, 0)

  const dataBarrasLiquido = useMemo(() => {
    const sorted = valoresLiquido
      .filter((x) => x.valor > 0)
      .sort((a, b) => b.valor - a.valor)
    return sorted.map((x, i) => ({
      name: x.cat,
      value: x.valor,
      fill: blueShadeByRank(i, sorted.length),
      pctLiquido:
        totalAtivosLiquidos > 0 ? (x.valor / totalAtivosLiquidos) * 100 : 0,
    }))
  }, [valoresLiquido, totalAtivosLiquidos])

  const alturaBarras = Math.max(160, dataBarrasLiquido.length * 48)

  const openEditAtivo = (tipo: string, categoria: string) => {
    const found = ativos.find((a) => matchesAtivoCategoria(a, tipo, categoria))
    if (found) {
      setEditingAtivo(found)
      setAtivoForm({
        tipo: found.tipo,
        descricao: found.descricao,
        instituicao: found.instituicao,
        valor: found.valor,
        heranca: found.heranca === true,
      })
    } else {
      setEditingAtivo(null)
      setAtivoForm({
        tipo,
        descricao: categoria,
        instituicao: "",
        valor: sumAtivoCategoria(tipo, categoria),
        heranca: false,
      })
    }
    setAtivoModalOpen(true)
  }

  const openEditPassivo = (categoria: string) => {
    const found = passivos.find((p) => matchesPassivoCategoria(p, categoria))
    if (found) {
      setEditingPassivo(found)
      setPassivoForm({
        tipo: found.tipo,
        modelo: found.modelo,
        descricao: found.descricao,
        valor: found.valor,
        taxa: found.taxa,
        prazo: found.prazo,
      })
    } else {
      setEditingPassivo(null)
      setPassivoForm({
        tipo: categoria,
        modelo: "SAC",
        descricao: categoria,
        valor: sumPassivoCategoria(categoria),
        taxa: 0,
        prazo: 0,
      })
    }
    setPassivoModalOpen(true)
  }

  const saveAtivo = () => {
    if (editingAtivo) {
      setAtivos(ativos.map((a) => (a.id === editingAtivo.id ? { ...a, ...ativoForm } : a)))
    } else {
      setAtivos([...ativos, { id: Date.now().toString(), ...ativoForm }])
    }
    setAtivoModalOpen(false)
  }

  const savePassivo = () => {
    if (editingPassivo) {
      setPassivos(passivos.map((p) => (p.id === editingPassivo.id ? { ...p, ...passivoForm } : p)))
    } else {
      setPassivos([...passivos, { id: Date.now().toString(), ...passivoForm }])
    }
    setPassivoModalOpen(false)
  }

  const handleNext = () => onNavigate("objetivos")

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Cadastro</p>
        <h1 className="text-2xl font-semibold">
          <span className="text-primary">Patrimônio</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Levantamento completo de ativos e passivos do cliente
        </p>
      </div>

      <PatrimonioSection
        title="Ativos de Investimento"
        totalLabel="PL Consolidado"
        totalValue={formatCurrency(plConsolidado)}
        totalClassName="text-[#1E5CE6]"
      >
        {CATEGORIAS_LIQUIDO.map((cat) => {
          const valor = sumAtivoCategoria("Líquido", cat)
          return (
            <PatrimonioBarRow
              key={cat}
              label={cat}
              valor={valor}
              totalSecao={totalAtivosLiquidos}
              barColor="#1E5CE6"
              formatCurrency={formatCurrency}
              valueClassName="text-foreground"
              onValueCommit={(v) => setAtivoCategoria("Líquido", cat, v)}
              onEdit={() => openEditAtivo("Líquido", cat)}
            />
          )
        })}
      </PatrimonioSection>

      <PatrimonioSection
        title="Ativos Reais"
        totalLabel="Total"
        totalValue={formatCurrency(totalAtivosReais)}
        totalClassName="text-[#1D9E75]"
      >
        {CATEGORIAS_IMOBILIZADO.map((cat) => {
          const valor = sumAtivoCategoria("Imobilizado", cat)
          return (
            <PatrimonioBarRow
              key={cat}
              label={cat}
              valor={valor}
              totalSecao={totalAtivosReais}
              barColor="#1D9E75"
              formatCurrency={formatCurrency}
              valueClassName="text-foreground"
              onValueCommit={(v) => setAtivoCategoria("Imobilizado", cat, v)}
              onEdit={() => openEditAtivo("Imobilizado", cat)}
            />
          )
        })}
      </PatrimonioSection>

      <PatrimonioSection
        title="Passivos e Dívidas"
        totalLabel="Total"
        totalValue={formatCurrency(totalPassivos)}
        totalClassName="text-[#E24B4A]"
      >
        {CATEGORIAS_PASSIVO.map((cat) => {
          const valor = sumPassivoCategoria(cat)
          return (
            <PatrimonioBarRow
              key={cat}
              label={cat}
              valor={valor}
              totalSecao={totalPassivos}
              barColor="#E24B4A"
              formatCurrency={formatCurrency}
              valueClassName="text-[#E24B4A]"
              onValueCommit={(v) => setPassivoCategoria(cat, v)}
              onEdit={() => openEditPassivo(cat)}
            />
          )
        })}
      </PatrimonioSection>

      <PatrimonioCharts
        dataDonut={dataDonut}
        totalDonut={totalDonut}
        dataBarrasLiquido={dataBarrasLiquido}
        alturaBarras={alturaBarras}
        patrimonioLiquido={patrimonioLiquido}
        formatCurrency={formatCurrency}
      />

      <div className="rounded-xl bg-[#131929] border border-white/10 p-5 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Ativos Totais
            </p>
            <p className="text-xl font-semibold text-[#1D9E75] tabular-nums">
              {formatCurrency(totalAtivos)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Passivos</p>
            <p className="text-xl font-semibold text-[#E24B4A] tabular-nums">
              {formatCurrency(totalPassivos)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
              Patrimônio Líquido
            </p>
            <p className="text-xl font-bold text-[#1E5CE6] tabular-nums">
              {formatCurrency(patrimonioLiquido)}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => onNavigate("dados-pessoais")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={handleNext}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Próximo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      <Dialog open={ativoModalOpen} onOpenChange={setAtivoModalOpen}>
        <DialogContent className="bg-[#131929] border-white/[0.18] rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingAtivo ? "Editar Ativo" : "Adicionar Ativo"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Cadastre um novo ativo no patrimônio
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Tipo
              </label>
              <Select
                value={ativoForm.tipo}
                onValueChange={(value) => setAtivoForm({ ...ativoForm, tipo: value })}
              >
                <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-[#131929] border-white/10">
                  <SelectItem value="Líquido">Líquido</SelectItem>
                  <SelectItem value="Imobilizado">Imobilizado</SelectItem>
                  <SelectItem value="Participação Societária">Participação Societária</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Descrição
              </label>
              {(() => {
                const tipo = ativoForm.tipo?.trim() || ""
                const opcoes = DESCRICOES_ATIVOS_POR_TIPO[tipo]

                if (!tipo || tipo === "Outros" || !opcoes) {
                  return (
                    <Input
                      value={ativoForm.descricao}
                      onChange={(e) => setAtivoForm({ ...ativoForm, descricao: e.target.value })}
                      placeholder="Ex: CDB Banco X, Apartamento Y..."
                      className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
                    />
                  )
                }

                const descricaoAtual = (ativoForm.descricao ?? "").trim()
                const isOpcaoValida = opcoes.includes(descricaoAtual)
                const selectValue = isOpcaoValida ? descricaoAtual : "Outros"
                const otherValue = isOpcaoValida ? "" : descricaoAtual

                return (
                  <div className="space-y-2">
                    <Select
                      value={selectValue}
                      onValueChange={(value) => {
                        if (value === "Outros") {
                          setAtivoForm({
                            ...ativoForm,
                            descricao: isOpcaoValida ? "" : descricaoAtual,
                          })
                          return
                        }
                        setAtivoForm({ ...ativoForm, descricao: value })
                      }}
                    >
                      <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#131929] border-white/10">
                        {opcoes.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {selectValue === "Outros" && (
                      <Input
                        value={otherValue}
                        onChange={(e) => setAtivoForm({ ...ativoForm, descricao: e.target.value })}
                        placeholder="Descreva o ativo..."
                        className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
                      />
                    )}
                  </div>
                )
              })()}
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Valor (R$)
              </label>
              <Input
                value={ativoForm.valor ? formatCurrency(ativoForm.valor) : ""}
                onChange={(e) => setAtivoForm({ ...ativoForm, valor: parseCurrency(e.target.value) })}
                placeholder="0,00"
                className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Instituição / Localização
              </label>
              <Input
                value={ativoForm.instituicao}
                onChange={(e) => setAtivoForm({ ...ativoForm, instituicao: e.target.value })}
                placeholder="Ex: BTG Pactual, Brasília-DF..."
                className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Bem de Herança
              </label>
              <Select
                value={ativoForm.heranca ? "sim" : "nao"}
                onValueChange={(value) =>
                  setAtivoForm({ ...ativoForm, heranca: value === "sim" })
                }
              >
                <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#131929] border-white/10">
                  <SelectItem value="nao">Não</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setAtivoModalOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveAtivo}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {editingAtivo ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={passivoModalOpen} onOpenChange={setPassivoModalOpen}>
        <DialogContent className="bg-[#131929] border-white/[0.18] rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingPassivo ? "Editar Passivo" : "Adicionar Passivo"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Cadastre uma dívida ou financiamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Tipo
                </label>
                <Select
                  value={passivoForm.tipo}
                  onValueChange={(value) => setPassivoForm({ ...passivoForm, tipo: value })}
                >
                  <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131929] border-white/10">
                    <SelectItem value="Financiamento Imóvel">Financiamento Imóvel</SelectItem>
                    <SelectItem value="Financiamento Veículo">Financiamento Veículo</SelectItem>
                    <SelectItem value="Empréstimo Pessoal">Empréstimo Pessoal</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Modelo de Dívida
                </label>
                <Select
                  value={passivoForm.modelo}
                  onValueChange={(value) =>
                    setPassivoForm({ ...passivoForm, modelo: value as Passivo["modelo"] })
                  }
                >
                  <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131929] border-white/10">
                    <SelectItem value="SAC">SAC</SelectItem>
                    <SelectItem value="PRICE">PRICE</SelectItem>
                    <SelectItem value="AMERICANA">AMERICANA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Descrição
              </label>
              <Input
                value={passivoForm.descricao}
                onChange={(e) => setPassivoForm({ ...passivoForm, descricao: e.target.value })}
                placeholder="Ex: Financiamento Apt Centro..."
                className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Saldo Devedor (R$)
              </label>
              <Input
                value={passivoForm.valor ? formatCurrency(passivoForm.valor) : ""}
                onChange={(e) =>
                  setPassivoForm({ ...passivoForm, valor: parseCurrency(e.target.value) })
                }
                placeholder="0,00"
                className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Taxa de Juros (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={passivoForm.taxa || ""}
                  onChange={(e) =>
                    setPassivoForm({ ...passivoForm, taxa: parseFloat(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Prazo (meses)
                </label>
                <Input
                  type="number"
                  value={passivoForm.prazo || ""}
                  onChange={(e) =>
                    setPassivoForm({ ...passivoForm, prazo: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                  className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setPassivoModalOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={savePassivo}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {editingPassivo ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
