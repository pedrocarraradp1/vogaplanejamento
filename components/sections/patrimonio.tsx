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
import { ArrowLeft, ArrowRight, Pencil, Plus } from "lucide-react"
import { usePlano, type Ativo, type Passivo } from "@/lib/plano-context"
import {
  CATEGORIAS_PASSIVO,
  SECOES_ATIVOS,
  matchesAtivoCategoria,
  matchesPassivoCategoria,
  sumAtivoCategoria,
  sumPassivoCategoria,
  type SecaoAtivoConfig,
} from "@/lib/patrimonio-utils"

interface PatrimonioProps {
  onNavigate: (section: string) => void
}

const TOOLTIP_STYLE = {
  backgroundColor: "#131929",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
} as const

type DonutSlice = { name: string; value: number; fill: string }
type BarraCategoria = { name: string; value: number; fill: string; pctTotal: number }
type LinhaCategoria = { id: string; label: string; valor: number }

type AddModalState =
  | { kind: "ativo"; secao: SecaoAtivoConfig }
  | { kind: "passivo" }
  | null

function PatrimonioBarRow({
  label,
  valor,
  totalSecao,
  barColor,
  formatCurrency,
  valueClassName = "text-foreground",
  onValueCommit,
}: {
  label: string
  valor: number
  totalSecao: number
  barColor: string
  formatCurrency: (value: number) => string
  valueClassName?: string
  onValueCommit: (valor: number) => void
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
    <div className="py-3 border-b border-white/5 last:border-0 space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-sm text-foreground flex-1 min-w-0 truncate">{label}</span>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={startEdit}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Editar valor"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
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
  headerAction,
  children,
}: {
  title: string
  totalLabel: string
  totalValue: string
  totalClassName?: string
  headerAction?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-xl bg-[#131929] border border-white/10 p-5 md:p-6">
      <div className="flex flex-col gap-3 mb-4 pb-4 border-b border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {headerAction}
            <p className={`text-lg md:text-xl font-bold tabular-nums ${totalClassName}`}>
              {totalLabel} {totalValue}
            </p>
          </div>
        </div>
      </div>
      <div>{children}</div>
    </section>
  )
}

function PatrimonioCharts({
  dataDonut,
  totalDonut,
  dataBarras,
  alturaBarras,
  patrimonioTotal,
  formatCurrency,
}: {
  dataDonut: DonutSlice[]
  totalDonut: number
  dataBarras: BarraCategoria[]
  alturaBarras: number
  patrimonioTotal: number
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
          <p className="text-sm font-medium text-foreground mb-3">Distribuição de Ativos</p>
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
                                Patrimônio Total
                              </tspan>
                              <tspan
                                x={cx}
                                dy="1.35em"
                                fontSize={17}
                                fontWeight={700}
                                fill="#1E5CE6"
                              >
                                {formatCurrency(patrimonioTotal)}
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
                      <span className="text-foreground flex-1 min-w-0 truncate">
                        {item.name}: {formatCurrency(item.value)} | {pct}%
                      </span>
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
          <p className="text-sm font-medium text-foreground mb-3">Subcategorias com valor</p>
          {dataBarras.length > 0 ? (
            <div className="w-full" style={{ height: alturaBarras }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={dataBarras}
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
                    formatter={(v: number) => {
                      const pct =
                        dataBarras.find((b) => b.value === v)?.pctTotal?.toFixed(1) ?? "0"
                      return [`${formatCurrency(v)} (${pct}% do total)`, "Valor"]
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {dataBarras.map((entry, i) => (
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
              Nenhuma subcategoria com valor informado.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

export function Patrimonio({ onNavigate }: PatrimonioProps) {
  const { state, setAtivos, setPassivos } = usePlano()
  const { ativos, passivos, patrimonio, moeda } = state

  const [addModal, setAddModal] = useState<AddModalState>(null)
  const [addForm, setAddForm] = useState({ categoria: "", valor: 0 })

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
            descricao:
              categoria === "Outros" && !existing.descricao ? "Outros" : existing.descricao || categoria,
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

  const linhasPorSecao = useMemo(() => {
    const map = new Map<string, LinhaCategoria[]>()
    for (const secao of SECOES_ATIVOS) {
      const linhas = secao.categorias
        .map((cat) => ({
          id: `${secao.id}-${cat}`,
          label: cat,
          valor: sumAtivoCategoria(ativos, secao.tipo, cat),
        }))
        .filter((l) => l.valor > 0)
      map.set(secao.id, linhas)
    }
    return map
  }, [ativos])

  const linhasPassivo = useMemo(
    () =>
      CATEGORIAS_PASSIVO.map((cat) => ({
        id: `passivo-${cat}`,
        label: cat,
        valor: sumPassivoCategoria(passivos, cat),
      })).filter((l) => l.valor > 0),
    [passivos],
  )

  const ativosLiquidos = patrimonio.ativosLiquidos
  const imobilizado = patrimonio.imobilizado
  const participacoes = patrimonio.participacoes
  const totalPassivos = patrimonio.passivos

  const patrimonioTotal = ativosLiquidos + imobilizado + participacoes
  const patrimonioLiquidoResumo = patrimonioTotal - totalPassivos

  const dataDonut = useMemo(
    () => [
      { name: "Ativos Líquidos", value: ativosLiquidos, fill: "#1E5CE6" },
      { name: "Imobilizado", value: imobilizado, fill: "#1D9E75" },
      { name: "Participações", value: participacoes, fill: "#7C3AED" },
    ],
    [ativosLiquidos, imobilizado, participacoes],
  )

  const totalDonut = dataDonut.reduce((s, d) => s + d.value, 0)

  const dataBarras = useMemo(() => {
    const todas: BarraCategoria[] = []
    for (const secao of SECOES_ATIVOS) {
      for (const cat of secao.categorias) {
        const valor = sumAtivoCategoria(ativos, secao.tipo, cat)
        if (valor > 0) {
          todas.push({
            name: cat,
            value: valor,
            fill: secao.cor,
            pctTotal: patrimonioTotal > 0 ? (valor / patrimonioTotal) * 100 : 0,
          })
        }
      }
    }
    return todas.sort((a, b) => b.value - a.value)
  }, [ativos, patrimonioTotal])

  const alturaBarras = Math.max(160, dataBarras.length * 48)

  const openAddAtivo = (secao: SecaoAtivoConfig) => {
    setAddForm({ categoria: secao.categorias[0] ?? "", valor: 0 })
    setAddModal({ kind: "ativo", secao })
  }

  const openAddPassivo = () => {
    setAddForm({ categoria: CATEGORIAS_PASSIVO[0], valor: 0 })
    setAddModal({ kind: "passivo" })
  }

  const saveAddModal = () => {
    if (!addModal || !addForm.categoria) return
    if (addModal.kind === "ativo") {
      setAtivoCategoria(addModal.secao.tipo, addForm.categoria, addForm.valor)
    } else {
      setPassivoCategoria(addForm.categoria, addForm.valor)
    }
    setAddModal(null)
    setAddForm({ categoria: "", valor: 0 })
  }

  const addButton = (onClick: () => void) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="border border-dashed border-muted-foreground/50 text-muted-foreground hover:text-foreground hover:border-foreground"
    >
      <Plus className="w-4 h-4 mr-1" />
      Adicionar
    </Button>
  )

  const totalSecao = (secao: SecaoAtivoConfig) => {
    if (secao.id === "liquidos") return ativosLiquidos
    if (secao.id === "imobilizado") return imobilizado
    return participacoes
  }

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

      {SECOES_ATIVOS.map((secao) => {
        const linhas = linhasPorSecao.get(secao.id) ?? []
        const total = totalSecao(secao)
        return (
          <PatrimonioSection
            key={secao.id}
            title={secao.title}
            totalLabel={secao.totalLabel}
            totalValue={formatCurrency(total)}
            totalClassName={
              secao.id === "liquidos"
                ? "text-[#1E5CE6]"
                : secao.id === "imobilizado"
                  ? "text-[#1D9E75]"
                  : "text-[#7C3AED]"
            }
            headerAction={addButton(() => openAddAtivo(secao))}
          >
            {linhas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum ativo cadastrado
              </p>
            ) : (
              linhas.map((linha) => (
                <PatrimonioBarRow
                  key={linha.id}
                  label={linha.label}
                  valor={linha.valor}
                  totalSecao={total}
                  barColor={secao.cor}
                  formatCurrency={formatCurrency}
                  valueClassName="text-foreground"
                  onValueCommit={(v) => setAtivoCategoria(secao.tipo, linha.label, v)}
                />
              ))
            )}
          </PatrimonioSection>
        )
      })}

      <PatrimonioCharts
        dataDonut={dataDonut}
        totalDonut={totalDonut}
        dataBarras={dataBarras}
        alturaBarras={alturaBarras}
        patrimonioTotal={patrimonioTotal}
        formatCurrency={formatCurrency}
      />

      <PatrimonioSection
        title="Passivos e Dívidas"
        totalLabel="Total"
        totalValue={formatCurrency(totalPassivos)}
        totalClassName="text-[#E24B4A]"
        headerAction={addButton(openAddPassivo)}
      >
        {linhasPassivo.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum passivo cadastrado</p>
        ) : (
          linhasPassivo.map((linha) => (
            <PatrimonioBarRow
              key={linha.id}
              label={linha.label}
              valor={linha.valor}
              totalSecao={totalPassivos}
              barColor="#E24B4A"
              formatCurrency={formatCurrency}
              valueClassName="text-[#E24B4A]"
              onValueCommit={(v) => setPassivoCategoria(linha.label, v)}
            />
          ))
        )}
      </PatrimonioSection>

      <div className="rounded-xl bg-[#131929] border border-white/10 p-5 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Ativos Totais</p>
            <p className="text-xl font-semibold text-[#1D9E75] tabular-nums">
              {formatCurrency(patrimonioTotal)}
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
              {formatCurrency(patrimonioLiquidoResumo)}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={addModal != null} onOpenChange={(open) => !open && setAddModal(null)}>
        <DialogContent className="bg-[#131929] border-white/[0.18] rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {addModal?.kind === "passivo" ? "Adicionar dívida" : "Adicionar ativo"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Selecione a categoria e informe o valor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Categoria
              </label>
              <Select
                value={addForm.categoria}
                onValueChange={(value) => setAddForm({ ...addForm, categoria: value })}
              >
                <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-[#131929] border-white/10">
                  {(addModal?.kind === "passivo"
                    ? [...CATEGORIAS_PASSIVO]
                    : addModal?.kind === "ativo"
                      ? [...addModal.secao.categorias]
                      : []
                  ).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Valor (R$)
              </label>
              <Input
                value={addForm.valor ? formatCurrency(addForm.valor) : ""}
                onChange={(e) => setAddForm({ ...addForm, valor: parseCurrency(e.target.value) })}
                placeholder="0"
                className="bg-[#0D1220] border-white/10 text-foreground"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setAddModal(null)}>
              Cancelar
            </Button>
            <Button onClick={saveAddModal} className="bg-primary text-primary-foreground">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => onNavigate("dados-pessoais")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={() => onNavigate("objetivos")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Próximo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
