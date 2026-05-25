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
import { usePlano, type Passivo } from "@/lib/plano-context"
import {
  CATEGORIAS_PASSIVO,
  DESCRICOES_ATIVOS_POR_TIPO,
  SECOES_ATIVOS,
  TIPOS_ATIVO,
  isTipoAtivoLabel,
  matchesAtivoCategoria,
  DEFAULT_CATEGORIA_PASSIVO,
  normalizeAtivoDescricao,
  normalizePassivo,
  resolveDescricaoAtivo,
  resolvePassivoCategoria,
  resolveTipoAtivoLabel,
  getSaldoDevedorPassivo,
  sumAtivoCategoria,
  type SecaoAtivoConfig,
  type TipoAtivoLabel,
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
type LinhaAtivo = {
  id: string
  label: string
  sublabel?: string
  valor: number
  bemDeHeranca: boolean
}

type BemDeHerancaSelect = "sim" | "nao"

type AddAtivoForm = {
  tipo: TipoAtivoLabel
  descricao: string
  valor: number
  instituicao: string
  bemDeHeranca: BemDeHerancaSelect
}

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
  tipo: "Líquido",
  descricao: DESCRICOES_ATIVOS_POR_TIPO["Líquido"][0],
  valor: 0,
  instituicao: "",
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
  | { kind: "ativo"; tipoInicial?: TipoAtivoLabel }
  | { kind: "passivo" }
  | null

function PatrimonioBarRow({
  label,
  sublabel,
  valor,
  totalSecao,
  barColor,
  formatCurrency,
  valueClassName = "text-foreground",
  onValueCommit,
}: {
  label: string
  sublabel?: string
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
        <div className="flex-1 min-w-0">
          <span className="text-sm text-foreground block truncate">{label}</span>
          {sublabel ? (
            <span className="text-xs text-muted-foreground block truncate">{sublabel}</span>
          ) : null}
        </div>
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
  const [addAtivoForm, setAddAtivoForm] = useState<AddAtivoForm>(() => EMPTY_ATIVO_FORM())
  const [addPassivoForm, setAddPassivoForm] = useState<AddPassivoForm>(() => EMPTY_PASSIVO_FORM())

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
      if (form.valor <= 0 || !form.descricao.trim()) return
      const bem = form.bemDeHeranca === "sim"
      setAtivos(
        ativos.concat({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          tipo: form.tipo,
          descricao: form.descricao.trim(),
          instituicao: form.instituicao.trim(),
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

  const linhasPorSecao = useMemo(() => {
    const map = new Map<string, LinhaAtivo[]>()
    for (const secao of SECOES_ATIVOS) {
      const linhas = ativos
        .filter((a) => (a.tipo ?? "").trim() === secao.tipo && (Number(a.valor) || 0) > 0)
        .map((a) => {
          const desc = normalizeAtivoDescricao(a.descricao)
          const inst = (a.instituicao ?? "").trim()
          return {
            id: a.id,
            label: desc || "Sem descrição",
            sublabel: inst || undefined,
            valor: Number(a.valor) || 0,
            bemDeHeranca: a.heranca === true || a.bemDeHeranca === true,
          }
        })
        .sort((a, b) => b.valor - a.valor)
      map.set(secao.id, linhas)
    }
    return map
  }, [ativos])

  const linhasPassivo = useMemo(
    () =>
      passivos
        .map((p) => {
          const saldo = getSaldoDevedorPassivo(p)
          const cat = resolvePassivoCategoria(p)
          const parts = [cat, p.instituicao?.trim(), p.bemVinculado?.trim()].filter(Boolean)
          return {
            id: p.id,
            label: p.descricao?.trim() || cat,
            sublabel: parts.length > 1 ? parts.join(" · ") : cat !== p.descricao?.trim() ? cat : undefined,
            valor: saldo,
          }
        })
        .filter((l) => l.valor > 0)
        .sort((a, b) => b.valor - a.valor),
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
    const tipo = isTipoAtivoLabel(secao.tipo) ? secao.tipo : "Líquido"
    setAddAtivoForm({
      tipo,
      descricao: DESCRICOES_ATIVOS_POR_TIPO[tipo][0],
      valor: 0,
      instituicao: "",
      bemDeHeranca: "nao",
    })
    setAddModal({ kind: "ativo", tipoInicial: tipo })
  }

  const openAddPassivo = () => {
    setAddPassivoForm(EMPTY_PASSIVO_FORM())
    setAddModal({ kind: "passivo" })
  }

  const onAtivoTipoChange = (tipo: TipoAtivoLabel) => {
    setAddAtivoForm((prev) => ({
      ...prev,
      tipo,
      descricao: DESCRICOES_ATIVOS_POR_TIPO[tipo][0],
    }))
  }

  const ativoTipoSelect = resolveTipoAtivoLabel(addAtivoForm.tipo)
  const ativoDescricaoSelect = resolveDescricaoAtivo(ativoTipoSelect, addAtivoForm.descricao)
  const passivoCategoriaSelect = addPassivoForm.categoria || DEFAULT_CATEGORIA_PASSIVO

  const saveAddModal = () => {
    if (!addModal) return
    if (addModal.kind === "ativo") {
      if (!ativoDescricaoSelect || addAtivoForm.valor <= 0) return
      appendAtivo({
        ...addAtivoForm,
        tipo: ativoTipoSelect,
        descricao: ativoDescricaoSelect,
      })
      setAddAtivoForm(EMPTY_ATIVO_FORM())
    } else {
      if (!passivoCategoriaSelect || !addPassivoForm.descricao.trim()) return
      if (addPassivoForm.saldoDevedor <= 0) return
      appendPassivo({ ...addPassivoForm, categoria: passivoCategoriaSelect })
      setAddPassivoForm(EMPTY_PASSIVO_FORM())
    }
    setAddModal(null)
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
                <div key={linha.id}>
                  <PatrimonioBarRow
                    label={linha.label}
                    valor={linha.valor}
                    totalSecao={total}
                    barColor={secao.cor}
                    formatCurrency={formatCurrency}
                    valueClassName="text-foreground"
                    onValueCommit={(v) => updateAtivoValor(linha.id, v)}
                  />
                  {(linha.sublabel || linha.bemDeHeranca) && (
                    <p className="text-[11px] text-muted-foreground truncate -mt-1 pb-2 pl-0.5">
                      {[linha.sublabel, linha.bemDeHeranca ? "Bem de herança" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
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
              sublabel={linha.sublabel}
              valor={linha.valor}
              totalSecao={totalPassivos}
              barColor="#E24B4A"
              formatCurrency={formatCurrency}
              valueClassName="text-[#E24B4A]"
              onValueCommit={(v) => updatePassivoSaldo(linha.id, v)}
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
        <DialogContent
          className={`bg-[#131929] border-white/[0.18] rounded-2xl max-h-[90vh] overflow-y-auto ${
            addModal?.kind === "passivo" ? "max-w-lg" : "max-w-md"
          }`}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {addModal?.kind === "passivo" ? "Adicionar dívida" : "Adicionar Ativo"}
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
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Tipo
                </label>
                <Select
                  value={ativoTipoSelect}
                  onValueChange={(v) => onAtivoTipoChange(v as TipoAtivoLabel)}
                >
                  <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131929] border-white/10">
                    {TIPOS_ATIVO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Descrição
                </label>
                <Select
                  value={ativoDescricaoSelect}
                  onValueChange={(descricao) =>
                    setAddAtivoForm((prev) => ({ ...prev, descricao }))
                  }
                >
                  <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131929] border-white/10">
                    {DESCRICOES_ATIVOS_POR_TIPO[ativoTipoSelect].map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
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
                  value={addAtivoForm.valor ? formatCurrency(addAtivoForm.valor) : ""}
                  onChange={(e) =>
                    setAddAtivoForm({ ...addAtivoForm, valor: parseCurrency(e.target.value) })
                  }
                  placeholder="0"
                  className="bg-[#0D1220] border-white/10 text-foreground tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Instituição / Localização
                </label>
                <Input
                  value={addAtivoForm.instituicao}
                  onChange={(e) => setAddAtivoForm({ ...addAtivoForm, instituicao: e.target.value })}
                  placeholder="Ex: BTG Pactual, Brasília-DF..."
                  className="bg-[#0D1220] border-white/10 text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Bem de Herança
                </label>
                <Select
                  value={addAtivoForm.bemDeHeranca}
                  onValueChange={(v) =>
                    setAddAtivoForm((prev) => ({
                      ...prev,
                      bemDeHeranca: v === "sim" ? "sim" : "nao",
                    }))
                  }
                >
                  <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131929] border-white/10">
                    <SelectItem value="nao">Não</SelectItem>
                    <SelectItem value="sim">Sim</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se &quot;Sim&quot;, o valor entra na base de cálculo do ITCMD na aba Sucessório.
                </p>
              </div>
            </div>
          ) : addModal?.kind === "passivo" ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Categoria
                </label>
                <Select
                  value={passivoCategoriaSelect}
                  onValueChange={(value) =>
                    setAddPassivoForm((prev) => ({ ...prev, categoria: value }))
                  }
                >
                  <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131929] border-white/10">
                    {CATEGORIAS_PASSIVO.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Descrição
                </label>
                <Input
                  value={addPassivoForm.descricao}
                  onChange={(e) =>
                    setAddPassivoForm((prev) => ({ ...prev, descricao: e.target.value }))
                  }
                  placeholder="Ex: Financiamento Apto SP"
                  className="bg-[#0D1220] border-white/10 text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
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
                  className="bg-[#0D1220] border-white/10 text-foreground tabular-nums"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
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
                  className="bg-[#0D1220] border-white/10 text-foreground tabular-nums"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
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
                    className="bg-[#0D1220] border-white/10 text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
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
                    className="bg-[#0D1220] border-white/10 text-foreground"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Instituição
                </label>
                <Input
                  value={addPassivoForm.instituicao}
                  onChange={(e) =>
                    setAddPassivoForm((prev) => ({ ...prev, instituicao: e.target.value }))
                  }
                  placeholder="Ex: Caixa Econômica, Itaú"
                  className="bg-[#0D1220] border-white/10 text-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Bem vinculado
                </label>
                <Input
                  value={addPassivoForm.bemVinculado}
                  onChange={(e) =>
                    setAddPassivoForm((prev) => ({ ...prev, bemVinculado: e.target.value }))
                  }
                  placeholder="Opcional — Ex: Apartamento SP"
                  className="bg-[#0D1220] border-white/10 text-foreground"
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
                  ? addAtivoForm.valor <= 0 || !addAtivoForm.descricao
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
