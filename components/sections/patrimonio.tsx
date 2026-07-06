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
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { Pencil, Plus } from "lucide-react"
import { usePlano } from "@/lib/plano-context"
import { exportBalancoPatrimonialPdf } from "@/lib/balanco-pdf-export"
import {
  CATEGORIAS_PASSIVO,
  DESCRICOES_ATIVOS_POR_TIPO,
  SECOES_ATIVOS,
  SECAO_LIQUIDO,
  TIPOS_ATIVO,
  isTipoAtivoLabel,
  DEFAULT_CATEGORIA_PASSIVO,
  normalizeAtivoDescricao,
  normalizePassivo,
  resolveDescricaoAtivo,
  resolvePassivoCategoria,
  resolveTipoAtivoLabel,
  getSaldoDevedorPassivo,
  getParcelaMensalPassivo,
  sumAtivoCategoria,
  INSTITUICOES_FINANCEIRAS,
  isInstituicaoFinanceiraListada,
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
  CORES_GRAFICO_VOGA,
  COR_GRAFICO_LIQUIDOS,
  COR_GRAFICO_IMOBILIZADO,
  COR_GRAFICO_PREVIDENCIA,
  COR_GRAFICO_INVESTIMENTOS,
  type SecaoAtivoConfig,
  type TipoAtivoLabel,
} from "@/lib/patrimonio-utils"

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
              stroke="transparent"
            >
              {ativo.map((entry, i) => (
                <Cell key={`${entry.name}-${i}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1, minWidth: 0 }}>
        {data.map((item) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0.0"
          return (
            <li
              key={item.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11,
                color: "#52514e",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: item.fill,
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                {item.name}
              </span>
              <span style={{ color: "#9A9B9B", whiteSpace: "nowrap" }}>
                {pct}%
              </span>
              <span style={{ fontWeight: 500, whiteSpace: "nowrap" }}>
                {formatCurrency(item.value)}
              </span>
            </li>
          )
        })}
      </ul>
      {footer}
    </div>
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

function AtivoListaBarRow({
  label,
  sublabel,
  valor,
  totalSecao,
  barColor,
  formatCurrency,
  valueColor = "#1A1A1A",
  onValueCommit,
}: {
  label: string
  sublabel?: string
  valor: number
  totalSecao: number
  barColor: string
  formatCurrency: (value: number) => string
  valueColor?: string
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
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <button
            type="button"
            className="pdf-hide"
            onClick={startEdit}
            aria-label="Editar valor"
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

export function Patrimonio({ onNavigate }: PatrimonioProps) {
  const { state, setAtivos, setPassivos, getIdadeAtual } = usePlano()
  const { ativos, passivos, patrimonio, moeda, dadosPessoais } = state

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

  const ativosLiquidos = patrimonio.ativosLiquidos
  const imobilizado = patrimonio.imobilizado
  const participacoes = patrimonio.participacoes
  const totalPassivos = patrimonio.passivos

  const patrimonioTotal = ativosLiquidos + imobilizado + participacoes
  const patrimonioLiquidoResumo = patrimonioTotal - totalPassivos
  const idadeAtual = getIdadeAtual()

  const totalPrevidencia = useMemo(
    () => sumAtivoCategoria(ativos, "Líquido", "Previdência Privada"),
    [ativos],
  )
  const totalInvestimentosLiq = useMemo(
    () =>
      sumAtivoCategoria(ativos, "Líquido", "Ativos Nacionais") +
      sumAtivoCategoria(ativos, "Líquido", "Ativos Internacionais"),
    [ativos],
  )
  const totalLiquidosRest = Math.max(0, ativosLiquidos - totalPrevidencia - totalInvestimentosLiq)
  const totalInvestimentos = totalInvestimentosLiq + participacoes

  const dataDonutGrupos = useMemo(
    () => [
      { name: "Imobilizado", value: imobilizado, fill: COR_GRAFICO_IMOBILIZADO },
      { name: "Previdência", value: totalPrevidencia, fill: COR_GRAFICO_PREVIDENCIA },
      { name: "Investimentos", value: totalInvestimentos, fill: COR_GRAFICO_INVESTIMENTOS },
      { name: "Líquidos", value: totalLiquidosRest, fill: COR_GRAFICO_LIQUIDOS },
    ],
    [imobilizado, totalPrevidencia, totalInvestimentos, totalLiquidosRest],
  )

  const dataDonutLiquidos = useMemo(() => {
    return ativos
      .filter((a) => (a.tipo ?? "").trim() === "Líquido" && (Number(a.valor) || 0) > 0)
      .map((a, i) => {
        const desc = normalizeAtivoDescricao(a.descricao) || "Outros"
        const inst = (a.instituicao ?? "").trim()
        const name = inst ? `${desc} · ${inst}` : desc
        return {
          name,
          value: Number(a.valor) || 0,
          fill: CORES_GRAFICO_VOGA[i % CORES_GRAFICO_VOGA.length],
        }
      })
      .sort((a, b) => b.value - a.value)
  }, [ativos])

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
      const tooltip = [inst, a.heranca || a.bemDeHeranca ? "Bem de herança" : null]
        .filter(Boolean)
        .join(" · ")
      return {
        id: a.id,
        nome: desc || "Sem descrição",
        subtitulo: inst || undefined,
        tooltip,
        valor: Number(a.valor) || 0,
      }
    }
    const filtro = (tipo: string, cats?: string[]) =>
      ativos
        .filter((a) => {
          if ((a.tipo ?? "").trim() !== tipo || (Number(a.valor) || 0) <= 0) return false
          if (!cats) return true
          const desc = normalizeAtivoDescricao(a.descricao)
          return cats.includes(desc)
        })
        .map(mapItem)
        .sort((a, b) => b.valor - a.valor)

    return [
      {
        titulo: "Líquidos",
        cor: COR_GRAFICO_LIQUIDOS,
        itens: filtro("Líquido", ["Outros"]),
        subtotal: filtro("Líquido", ["Outros"]).reduce((s, i) => s + i.valor, 0),
      },
      {
        titulo: "Investimentos",
        cor: COR_GRAFICO_INVESTIMENTOS,
        itens: [
          ...filtro("Líquido", ["Ativos Nacionais", "Ativos Internacionais"]),
          ...filtro("Participação Societária"),
        ],
        subtotal: totalInvestimentos,
      },
      {
        titulo: "Previdência",
        cor: COR_GRAFICO_PREVIDENCIA,
        itens: filtro("Líquido", ["Previdência Privada"]),
        subtotal: totalPrevidencia,
      },
      {
        titulo: "Imobilizado",
        cor: COR_GRAFICO_IMOBILIZADO,
        itens: filtro("Imobilizado"),
        subtotal: imobilizado,
      },
    ]
  }, [ativos, totalInvestimentos, totalPrevidencia, imobilizado])

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

  const exportarPDF = async () => {
    const nomCliente = dadosPessoais?.nome || "Cliente"
    const dataRef = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    await exportBalancoPatrimonialPdf("balanco-patrimonial-content", {
      clientName: nomCliente,
      referenceDate: dataRef,
    })
  }

  const abrirModalAtivo = () => openAddAtivo(SECAO_LIQUIDO)
  const abrirModalPassivo = openAddPassivo
  const voltarSecao = () => onNavigate("dados-pessoais")
  const proximaSecao = () => onNavigate("objetivos")

  const totalSecao = (secao: SecaoAtivoConfig) => {
    if (secao.id === "liquidos") return ativosLiquidos
    if (secao.id === "imobilizado") return imobilizado
    return participacoes
  }

  const totalCorSecao = (secao: SecaoAtivoConfig) => secao.cor

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

  return (
    <div id="balanco-patrimonial-content">
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
            style={{
              background: "#012137",
              border: "none",
              borderRadius: 6,
              padding: "6px 13px",
              fontSize: 12,
              color: "white",
              cursor: "pointer",
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
            Exportar PDF
          </button>
        </div>
      </div>
      </div>

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
          <DonutComLegenda data={dataDonutLiquidos} formatCurrency={formatCurrency} />
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
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: "#C0392B", margin: 0 }}>
                      {formatCurrency(saldo)}
                    </p>
                    {parcela > 0 ? (
                      <p style={{ fontSize: 10, color: "#9A9B9B", margin: "2px 0 0" }}>
                        {formatCurrency(parcela)}/mês
                      </p>
                    ) : null}
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
                  {grupo.itens.length === 0 ? (
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
                            <InfoTooltip text={item.tooltip} />
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
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#C0392B", flexShrink: 0 }}>
                      {formatCurrency(saldo)}
                    </span>
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
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Dialog open={addModal != null} onOpenChange={(open) => !open && setAddModal(null)}>
        <DialogContent
          className={`form-card rounded-2xl max-h-[90vh] overflow-y-auto ${
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
                <label className="field-label">
                  Tipo
                </label>
                <Select
                  value={ativoTipoSelect}
                  onValueChange={(v) => onAtivoTipoChange(v as TipoAtivoLabel)}
                >
                  <SelectTrigger className="form-card text-foreground">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="form-card">
                    {TIPOS_ATIVO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="field-label">
                  Descrição
                </label>
                <Select
                  value={ativoDescricaoSelect}
                  onValueChange={(descricao) =>
                    setAddAtivoForm((prev) => ({ ...prev, descricao }))
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
                <label className="field-label">
                  Valor (R$)
                </label>
                <Input
                  value={addAtivoForm.valor ? formatCurrency(addAtivoForm.valor) : ""}
                  onChange={(e) =>
                    setAddAtivoForm({ ...addAtivoForm, valor: parseCurrency(e.target.value) })
                  }
                  placeholder="0"
                  className="form-card text-foreground tabular-nums"
                />
              </div>
              <InstituicaoFinanceiraField
                label="Instituição"
                value={addAtivoForm.instituicao}
                onChange={(instituicao) => setAddAtivoForm({ ...addAtivoForm, instituicao })}
              />
              <div className="space-y-2">
                <label className="field-label">
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
              <InstituicaoFinanceiraField
                value={addPassivoForm.instituicao}
                onChange={(instituicao) =>
                  setAddPassivoForm((prev) => ({ ...prev, instituicao }))
                }
              />
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
