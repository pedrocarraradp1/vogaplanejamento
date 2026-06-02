"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts"
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react"
import { usePlano } from "@/lib/plano-context"
import { getSaldoDevedorPassivo } from "@/lib/patrimonio-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MAG_PRODUTOS, taxaFaixaEtaria } from "@/lib/mag/produtos"
import { cn } from "@/lib/utils"

interface SimuladorSegurosProps {
  onNavigate: (section: string) => void
}

const CS_MIN = 0
const CS_MAX = 20_000_000

const IR_PREV_OPCOES = [
  { v: "10", pct: 0.1, label: "10%" },
  { v: "15", pct: 0.15, label: "15%" },
  { v: "20", pct: 0.2, label: "20%" },
  { v: "27.5", pct: 0.275, label: "27,5%" },
] as const

const IR_INV_OPCOES = [
  { v: "15", pct: 0.15, label: "15% (longo prazo > 2 anos)" },
  { v: "15cp", pct: 0.15, label: "15% (curto prazo)" },
  { v: "20", pct: 0.2, label: "20%" },
  { v: "22.5", pct: 0.225, label: "22,5%" },
] as const

function premioFallback(cs: number, idade: number, mult: number) {
  return cs * taxaFaixaEtaria(idade) * mult
}

function custoNominalPremiosAcumulado(pm: number, anosPag: number, inf: number, ateAno: number): number {
  if (pm <= 0 || inf < 0) return 0
  const n = Math.max(0, Math.min(ateAno, anosPag))
  let s = 0
  for (let k = 0; k < n; k++) {
    s += pm * 12 * Math.pow(1 + inf, k)
  }
  return s
}

function custoNominalPremiosTotal(pm: number, anosPag: number, inf: number): number {
  return custoNominalPremiosAcumulado(pm, anosPag, inf, anosPag)
}

function anosVigenciaProjecao(idadeAtual: number): number[] {
  const anos = new Set<number>()
  for (let a = 1; a <= 10; a++) anos.add(a)
  for (const a of [15, 20, 30, 40, 50]) anos.add(a)
  return [...anos]
    .filter((ano) => idadeAtual + ano - 1 <= 100)
    .sort((a, b) => a - b)
}

function contribuicoesAcumuladasReal(ano: number, pm: number, anosPag: number): number {
  return pm * 12 * Math.min(ano, anosPag)
}

function contribuicoesAcumuladasNominal(ano: number, pm: number, anosPag: number, inf: number): number {
  const n = Math.min(ano, anosPag)
  let s = 0
  for (let k = 0; k < n; k++) s += pm * 12 * Math.pow(1 + inf, k)
  return s
}

function fmtMoney(v: number, moeda: "BRL" | "USD") {
  return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: moeda === "USD" ? "USD" : "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v)
}

function fmtShort(v: number, moeda: "BRL" | "USD") {
  if (v >= 1e6) return `${moeda === "USD" ? "US$" : "R$"} ${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${moeda === "USD" ? "US$" : "R$"} ${(v / 1e3).toFixed(0)}k`
  return fmtMoney(v, moeda)
}

type CampoKey =
  | "cpf"
  | "dataNascimento"
  | "sexo"
  | "uf"
  | "rendaMensal"
  | "idadeAposentadoria"
  | "ativosLiquidos"
  | "passivos"
  | "rentabilidadePrev"
  | "inflacao"


const UFS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ",
  "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const

type SexoSelect = "M" | "F"

function resolveSexoSelect(sexo: string | undefined | null): SexoSelect {
  return sexo === "M" || sexo === "F" ? sexo : "M"
}

function resolveUfSelect(uf: string | undefined | null): string {
  const u = (uf ?? "").trim().toUpperCase()
  return (UFS_BR as readonly string[]).includes(u) ? u : "SP"
}


function idadeFromNascimentoStr(nasc: string): number {
  const t = nasc?.trim()
  if (!t) return 0
  const src = t.length === 10 && !t.includes("T") ? `${t}T12:00:00` : t
  const d = new Date(src)
  if (Number.isNaN(d.getTime())) return 0
  const hoje = new Date()
  let idade = hoje.getFullYear() - d.getFullYear()
  const m = hoje.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) idade--
  return Math.max(0, idade)
}


export function SimuladorSeguros({ onNavigate }: SimuladorSegurosProps) {
  const { state, getIdadeAtual, getPatrimonioLiquido } = usePlano()
  const { dadosPessoais, premissas, ativos, passivos } = state
  const moeda = state.moeda ?? "BRL"

  const [modoRN, setModoRN] = useState<"nominal" | "real">("nominal")
  const [modoProjecao, setModoProjecao] = useState<"real" | "nominal">("real")
  const [patTotal, setPatTotal] = useState(0)
  const [allocPrevPct, setAllocPrevPct] = useState(40)
  const [capitalSegurado, setCapitalSegurado] = useState(() => {
    const pat = getPatrimonioLiquido()
    if (pat > 0) {
      const rounded = Math.round(pat / 50_000) * 50_000
      return Math.min(CS_MAX, Math.max(CS_MIN, rounded))
    }
    return 500_000
  })
  const [irPrevKey, setIrPrevKey] = useState<(typeof IR_PREV_OPCOES)[number]["v"]>("15")
  const [irInvKey, setIrInvKey] = useState<(typeof IR_INV_OPCOES)[number]["v"]>("15")
  const [rpPct, setRpPct] = useState(7)
  const [riPct, setRiPct] = useState(11)
  const [produtoIdx, setProdutoIdx] = useState(0)
  const [pm0, setPm0] = useState(0)
  const [fontePremio, setFontePremio] = useState<"mag_api" | "estimativa">("estimativa")
  const [loadingMag, setLoadingMag] = useState(false)
  const [localInputs, setLocalInputs] = useState<Partial<Record<CampoKey, string>>>({})
  const [localSexo, setLocalSexo] = useState<SexoSelect>(() =>
    resolveSexoSelect(dadosPessoais.sexo),
  )
  const [localUf, setLocalUf] = useState<string>(() => resolveUfSelect(dadosPessoais.uf))

  const ativosLiquidosGlobal = useMemo(() => {
    const rows = (ativos ?? []).filter((a) => (a.tipo ?? "").trim() === "Líquido")
    const sum = rows.reduce((s, a) => s + (Number(a.valor) || 0), 0)
    return { sum, temLinha: rows.length > 0 }
  }, [ativos])

  const passivosGlobal = useMemo(() => {
    const rows = passivos ?? []
    const sum = rows.reduce((s, p) => s + getSaldoDevedorPassivo(p), 0)
    return { sum, temLinha: rows.length > 0 }
  }, [passivos])

  const variaveis = useMemo((): Record<CampoKey, string | number | null> => {
    const rb = Number(premissas.rendimentoBruto)
    const rl = Number(premissas.rendimento)
    const rentPrev = rb > 0 ? rb : rl > 0 ? rl : null
    const infG = Number(premissas.inflacao)
    const ia = Number(premissas.idadeApos)
    return {
      cpf: (dadosPessoais.cpf ?? "").replace(/\D/g, "") || null,
      dataNascimento: dadosPessoais.nascimento?.trim() || null,
      sexo: dadosPessoais.sexo === "M" || dadosPessoais.sexo === "F" ? dadosPessoais.sexo : null,
      uf: dadosPessoais.uf?.trim() ? dadosPessoais.uf.trim().toUpperCase() : null,
      rendaMensal: Number(dadosPessoais.renda) > 0 ? Number(dadosPessoais.renda) : null,
      idadeAposentadoria: ia >= 50 && ia <= 80 ? ia : null,
      ativosLiquidos: ativosLiquidosGlobal.temLinha || ativosLiquidosGlobal.sum > 0 ? ativosLiquidosGlobal.sum : null,
      passivos: passivosGlobal.temLinha ? passivosGlobal.sum : null,
      rentabilidadePrev: rentPrev,
      inflacao: infG > 0 ? infG : null,
    }
  }, [dadosPessoais, premissas, ativosLiquidosGlobal, passivosGlobal])

  const getValue = useCallback(
    (campo: CampoKey): string | number | null => {
      if (campo === "sexo") {
        const g = variaveis.sexo
        return g === "M" || g === "F" ? g : localSexo
      }
      if (campo === "uf") {
        const g = variaveis.uf
        return typeof g === "string" && g ? g : localUf
      }

      const g = variaveis[campo]
      const l = localInputs[campo]
      const useLocal = l !== undefined && l !== ""
      const raw = useLocal ? l : g
      if (raw === null || raw === undefined) return null
      if (typeof raw === "string" && !String(raw).trim()) return null

      switch (campo) {
        case "rendaMensal":
        case "idadeAposentadoria":
        case "ativosLiquidos":
        case "passivos":
        case "rentabilidadePrev":
        case "inflacao": {
          const n = typeof raw === "number" ? raw : Number(String(raw).replace(/\./g, "").replace(",", "."))
          if (!Number.isFinite(n)) return null
          return n
        }
        case "cpf":
          return String(raw).replace(/\D/g, "")
        case "uf":
          return String(raw).trim().toUpperCase()
        case "dataNascimento":
          return String(raw).trim()
        case "sexo":
          return raw === "M" || raw === "F" ? raw : null
        default:
          return null
      }
    },
    [variaveis, localInputs, localSexo, localUf],
  )


  const idadeAtualEff = useMemo(() => {
    const dn = String(getValue("dataNascimento") ?? "").trim()
    if (dn) return idadeFromNascimentoStr(dn)
    return getIdadeAtual()
  }, [getValue, getIdadeAtual])

  const idadeAposEff = useMemo(() => {
    const v = getValue("idadeAposentadoria")
    if (typeof v === "number" && v >= 50 && v <= 80) return v
    const ia = Number(premissas.idadeApos)
    if (ia >= 50 && ia <= 80) return ia
    return Math.max(idadeAtualEff + 1, 65)
  }, [getValue, premissas.idadeApos, idadeAtualEff])

  const H = useMemo(() => Math.max(1, idadeAposEff - idadeAtualEff), [idadeAposEff, idadeAtualEff])

  const inf = useMemo(() => {
    const v = getValue("inflacao")
    const pct = typeof v === "number" && v > 0 ? v : Number(premissas.inflacao) || 4
    return pct / 100
  }, [getValue, premissas.inflacao])

  const rpPctResolved = useMemo(() => {
    const v = getValue("rentabilidadePrev")
    return typeof v === "number" && v > 0 ? v : rpPct
  }, [getValue, rpPct])

  const rp = rpPctResolved / 100
  const ri = riPct / 100

  const irAliq = IR_PREV_OPCOES.find((o) => o.v === irPrevKey)?.pct ?? 0.15
  const irInvAliq = IR_INV_OPCOES.find((o) => o.v === irInvKey)?.pct ?? 0.15

  const produto = MAG_PRODUTOS[produtoIdx] ?? MAG_PRODUTOS[0]
  const codigoMag = produto.codigo
  const ANOSPAG = produto.anospag

  useEffect(() => {
    setPatTotal(getPatrimonioLiquido())
  }, [getPatrimonioLiquido, ativos, passivos])

  const patP = (patTotal * allocPrevPct) / 100
  const patI = (patTotal * (100 - allocPrevPct)) / 100

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscarMag = useCallback(async () => {
    const dataNascimento = String(getValue("dataNascimento") ?? "").trim()
    const sexoVal = getValue("sexo")
    const rendaMensal = Number(getValue("rendaMensal")) || 0
    const ufVal = (String(getValue("uf") ?? "SP").trim() || "SP").slice(0, 2).toUpperCase()

    if (!dataNascimento || capitalSegurado <= 0) {
      const fb = premioFallback(capitalSegurado, idadeAtualEff || 35, produto.mult)
      setPm0(fb)
      setFontePremio("estimativa")
      return
    }

    setLoadingMag(true)
    try {
      const res = await fetch("/api/mag/simulacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: dadosPessoais.nome || "SIMULACAO VOGA WEALTH",
          cpf: (dadosPessoais.cpf ?? "").replace(/\D/g, ""),
          dataNascimento,
          sexoId: sexoVal === "M" ? 1 : 2,
          renda: rendaMensal,
          uf: ufVal,
          codigoModeloProposta: codigoMag,
          capitalSegurado,
          anospag: ANOSPAG,
        }),
      })
      const data = (await res.json()) as {
        premioMensal?: number | null
        premioAnual?: number | null
        rawResponse?: unknown
      }
      if (typeof data.premioMensal === "number" && data.premioMensal > 0) {
        setPm0(data.premioMensal)
        setFontePremio("mag_api")
        return
      }
      const fb = premioFallback(capitalSegurado, idadeAtualEff || 35, produto.mult)
      setPm0(fb)
      setFontePremio("estimativa")
      // eslint-disable-next-line no-console
      console.log("MAG fallback / raw:", data.rawResponse ?? data)
    } catch {
      const fb = premioFallback(capitalSegurado, idadeAtualEff || 35, produto.mult)
      setPm0(fb)
      setFontePremio("estimativa")
    } finally {
      setLoadingMag(false)
    }
  }, [
    ANOSPAG,
    capitalSegurado,
    codigoMag,
    produto.mult,
    getValue,
    idadeAtualEff,
  ])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void buscarMag()
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [buscarMag])

  const custoNomTotal = useMemo(
    () => custoNominalPremiosTotal(pm0, ANOSPAG, inf),
    [pm0, ANOSPAG, inf],
  )
  const custoRealTotal = useMemo(() => custoNomTotal / Math.pow(1 + inf, H), [custoNomTotal, inf, H])

  const deflator = (t: number) => Math.pow(1 + inf, t)
  const adj = (v: number, t: number) => (modoRN === "real" ? v / deflator(t) : v)

  const linhaPatrimonioHerdeiros = useMemo(() => {
    const rows: {
      idade: number
      t: number
      cenA: number
      cenBvivo: number
      cenBmorte: number
    }[] = []

    for (let t = 0; t <= H; t++) {
      const idade = idadeAtualEff + t
      const spA = patP * Math.pow(1 + rp, t)
      const siA = patI * Math.pow(1 + ri, t)
      const rawA =
        t === H
          ? spA - spA * irAliq + (siA - Math.max(siA - patI, 0) * irInvAliq)
          : spA + siA

      const sb = patTotal * Math.pow(1 + ri, t)
      const premAcum = custoNominalPremiosAcumulado(pm0, ANOSPAG, inf, t)
      const rawBvivo = sb - Math.max(sb - patTotal, 0) * irInvAliq - premAcum

      const csCorrigido = capitalSegurado * Math.pow(1 + inf, t)
      const rawBmorte = rawBvivo + csCorrigido

      rows.push({
        idade,
        t,
        cenA: adj(rawA, t),
        cenBvivo: adj(rawBvivo, t),
        cenBmorte: adj(rawBmorte, t),
      })
    }
    return rows
  }, [
    H,
    idadeAtualEff,
    patP,
    patI,
    patTotal,
    rp,
    ri,
    irAliq,
    irInvAliq,
    pm0,
    ANOSPAG,
    inf,
    capitalSegurado,
    modoRN,
  ])

  const comparativoAnual = useMemo(() => {
    const rows: { idade: number; rendPrev: number; rendInvLiq: number }[] = []
    for (let t = 1; t <= H; t++) {
      const idade = idadeAtualEff + t
      const saldoPrev = patP * Math.pow(1 + rp, t)
      const rendPrev = saldoPrev * rp

      const saldoInv = patTotal * Math.pow(1 + ri, t)
      const rendBrutoInv = saldoInv * ri
      const irAnual = Math.max(0, saldoInv - patTotal) * irInvAliq / H
      const premioAnual = t <= ANOSPAG ? pm0 * 12 * Math.pow(1 + inf, Math.max(0, t - 1)) : 0
      const rendInvLiq = Math.max(0, rendBrutoInv - irAnual - premioAnual)

      rows.push({
        idade,
        rendPrev: modoRN === "real" ? rendPrev / deflator(t) : rendPrev,
        rendInvLiq: modoRN === "real" ? rendInvLiq / deflator(t) : rendInvLiq,
      })
    }
    return rows
  }, [H, idadeAtualEff, patP, patTotal, rp, ri, pm0, ANOSPAG, inf, modoRN, deflator, irInvAliq])

  const custoAnualSeguro = useMemo(() => {
    const rows: { ano: number; custoAnual: number; acumulado: number }[] = []
    let acum = 0
    for (let a = 1; a <= ANOSPAG; a++) {
      const custoAno = pm0 * 12 * Math.pow(1 + inf, Math.max(0, a - 1))
      acum += custoAno
      rows.push({
        ano: a,
        custoAnual: modoRN === "real" ? custoAno / deflator(a) : custoAno,
        acumulado: modoRN === "real" ? acum / deflator(a) : acum,
      })
    }
    return rows
  }, [ANOSPAG, pm0, inf, modoRN, deflator])

  const totalPagoSeguro = custoAnualSeguro.length > 0
    ? custoAnualSeguro[custoAnualSeguro.length - 1].acumulado
    : 0

  const finais = useMemo(() => {
    const t = H
    const d = Math.pow(1 + inf, t)
    const spAF = patP * Math.pow(1 + rp, t)
    const siAF = patI * Math.pow(1 + ri, t)
    const liqAF_nom =
      spAF - spAF * irAliq + (siAF - Math.max(siAF - patI, 0) * irInvAliq)

    const sbF = patTotal * Math.pow(1 + ri, t)
    const premF = custoNominalPremiosTotal(pm0, ANOSPAG, inf)
    const liqBsobrev_nom = sbF - Math.max(sbF - patTotal, 0) * irInvAliq - premF
    const rendB = Math.max(0, sbF - patTotal - premF)
    const csCorrigidoFinal = capitalSegurado * Math.pow(1 + inf, t)
    const liqBmorte_nom = liqBsobrev_nom + csCorrigidoFinal

    const toDisp = (v: number) => (modoRN === "real" ? v / d : v)

    return {
      spAF,
      siAF,
      liqAF: toDisp(liqAF_nom),
      sbF,
      liqBsobrevF: toDisp(liqBsobrev_nom),
      liqBmorteF: toDisp(liqBmorte_nom),
      rendB,
      rendBIr: toDisp(rendB * irInvAliq),
      csDisp: toDisp(csCorrigidoFinal),
    }
  }, [
    H,
    patP,
    patI,
    patTotal,
    rp,
    ri,
    irAliq,
    irInvAliq,
    pm0,
    ANOSPAG,
    inf,
    capitalSegurado,
    modoRN,
  ])

  const kpiPremioAno1 = pm0 + (patTotal * ri) / 12

  const expectativaVida = 80
  const anosAteExpectativa = Math.max(0, expectativaVida - idadeAtualEff)
  const capitalCorrigidoExpectativa = capitalSegurado * Math.pow(1 + inf, anosAteExpectativa)
  const capitalCorrigidoHorizonte = capitalSegurado * Math.pow(1 + inf, H)

  const veredicto = useMemo(() => {
    const a = finais.liqAF
    const b = finais.liqBmorteF
    const diff = a - b
    if (Math.abs(diff) < Math.max(a, b) * 0.005) {
      return "Os cenários ficam muito próximos no horizonte: revise alocação, rentabilidades e prêmio para uma leitura mais nítida."
    }
    if (diff > 0) {
      return `No último ano, o Cenário A (prev + invest) entrega cerca ${fmtMoney(diff, moeda)} a mais aos herdeiros do que o Cenário B com capital segurado (comparando liquidez A × B se falecer).`
    }
    return `No último ano, o Cenário B com seguro (se falecer) supera o Cenário A em cerca ${fmtMoney(-diff, moeda)} aos herdeiros — a proteção do capital segurado compensa a trajetória líquida.`
  }, [finais.liqAF, finais.liqBmorteF, moeda])

  const descricaoSeguro = `${produto.nome} (${produto.codigo}) — ${produto.descricao}`

  const investPct = 100 - allocPrevPct

  const inflacaoPctDisplay = useMemo(() => {
    const v = getValue("inflacao")
    return typeof v === "number" && v > 0 ? v : Number(premissas.inflacao) || 4
  }, [getValue, premissas.inflacao])

  const projecaoMagRows = useMemo(() => {
    const anos = anosVigenciaProjecao(idadeAtualEff)
    const destaques = new Set([1, 10, ANOSPAG, 15, 20, 30, 40, 50])
    return anos.map((ano) => {
      const idade = idadeAtualEff + ano - 1
      const emPagamento = ano <= ANOSPAG
      const premioMensalAno =
        modoProjecao === "real"
          ? emPagamento
            ? pm0
            : 0
          : emPagamento
            ? pm0 * Math.pow(1 + inf, ano - 1)
            : 0
      const capital =
        modoProjecao === "real"
          ? capitalSegurado
          : capitalSegurado * Math.pow(1 + inf, ano - 1)
      const contribAcum =
        modoProjecao === "real"
          ? contribuicoesAcumuladasReal(ano, pm0, ANOSPAG)
          : contribuicoesAcumuladasNominal(ano, pm0, ANOSPAG, inf)
      return {
        ano,
        idade,
        contribAcum,
        capital,
        premioMensalAno,
        destaque: destaques.has(ano),
      }
    })
  }, [idadeAtualEff, ANOSPAG, pm0, capitalSegurado, inf, modoProjecao])

  const dataNascimentoEfetiva = String(getValue("dataNascimento") ?? "").trim()

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Planejamento</p>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-[#1E5CE6]" />
            Simulador de <span className="text-[#1E5CE6]">Seguros</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Comparador completo: alocação prev/invest, MAG, KPIs e gráficos em modo nominal ou real.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Moeda dos valores
          </span>
          <ToggleGroup
            type="single"
            value={modoRN}
            onValueChange={(v) => v && setModoRN(v as "nominal" | "real")}
            className="rounded-lg border border-white/10 bg-[#131929] p-1"
          >
            <ToggleGroupItem
              value="nominal"
              className="data-[state=on]:bg-[#1E5CE6] data-[state=on]:text-white px-3 py-1.5 text-xs"
            >
              Nominal
            </ToggleGroupItem>
            <ToggleGroupItem
              value="real"
              className="data-[state=on]:bg-[#1E5CE6] data-[state=on]:text-white px-3 py-1.5 text-xs"
            >
              Real
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* SEÇÃO 1 */}
      <Card className="bg-[#131929] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-foreground">Patrimônio e alocação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Patrimônio total atual
              </Label>
              <Input
                type="number"
                value={patTotal || ""}
                onChange={(e) => setPatTotal(Math.max(0, parseFloat(e.target.value) || 0))}
                className="h-11 bg-[#0D1220] border-white/10 text-foreground tabular-nums"
              />
              <p className="text-xs text-muted-foreground">
                Base global: ativos líquidos − passivos ({fmtMoney(getPatrimonioLiquido(), moeda)}). Editável para
                cenários.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-muted-foreground">% em previdência</span>
              <span className="font-semibold text-[#1E5CE6] tabular-nums">
                {allocPrevPct}% prev / {investPct}% invest
              </span>
            </div>
            <Slider
              value={[allocPrevPct]}
              onValueChange={(v) => setAllocPrevPct(v[0] ?? 0)}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-white/10 bg-[#0D1220] p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Em previdência</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{fmtMoney(patP, moeda)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#0D1220] p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Em investimento</p>
              <p className="text-lg font-semibold tabular-nums text-foreground">{fmtMoney(patI, moeda)}</p>
            </div>
            <div className="rounded-lg border border-[#1E5CE6]/40 bg-[#1E5CE6]/10 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Capital segurado</p>
              <p className="text-lg font-semibold tabular-nums text-[#1E5CE6]">{fmtMoney(capitalSegurado, moeda)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between gap-2">
              <Label className="text-sm text-muted-foreground">Capital segurado (slider)</Label>
              <span className="text-sm font-semibold text-[#1E5CE6] tabular-nums">
                {fmtMoney(capitalSegurado, moeda)}
              </span>
            </div>
            <Slider
              value={[capitalSegurado]}
              onValueChange={(v) => setCapitalSegurado(Math.max(CS_MIN, v[0] ?? CS_MIN))}
              min={CS_MIN}
              max={CS_MAX}
              step={50_000}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <p className="text-xs uppercase tracking-wide mb-1">Inflação anual</p>
              <p className="font-medium text-foreground">{inflacaoPctDisplay}% a.a.</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide mb-1">Prazo total (anos)</p>
              <p className="font-medium text-foreground">{H} anos</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide mb-1">Idade atual</p>
              <p className="font-medium text-foreground">
                {idadeAtualEff || "—"} anos
                {dataNascimentoEfetiva ? (
                  <span className="block text-xs font-normal mt-0.5">
                    (nasc. {new Date(dataNascimentoEfetiva + "T12:00:00").toLocaleDateString("pt-BR")})
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEÇÃO 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#131929] border-[#1E5CE6]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-[#1E5CE6]">Previdência % a.a. líquida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{rpPctResolved}% a.a.</span>
              </div>
              <Slider value={[rpPct]} onValueChange={(v) => setRpPct(v[0] ?? 7)} min={4} max={15} step={0.5} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">IR no resgate</Label>
              <Select
                value={irPrevKey ?? "15"}
                onValueChange={(v) => setIrPrevKey((v || "15") as (typeof IR_PREV_OPCOES)[number]["v"])}
              >
                <SelectTrigger className="h-9 bg-[#0D1220] border-white/10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {IR_PREV_OPCOES.map((o) => (
                    <SelectItem key={o.v} value={o.v}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#131929] border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-400">Investimento % a.a. líquida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{riPct}% a.a.</span>
              </div>
              <Slider value={[riPct]} onValueChange={(v) => setRiPct(v[0] ?? 11)} min={4} max={18} step={0.5} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">IR sobre rendimento</Label>
              <Select
                value={irInvKey ?? "15"}
                onValueChange={(v) => setIrInvKey((v || "15") as (typeof IR_INV_OPCOES)[number]["v"])}
              >
                <SelectTrigger className="h-9 bg-[#0D1220] border-white/10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {IR_INV_OPCOES.map((o) => (
                    <SelectItem key={o.v} value={o.v}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 3 — Produto MAG */}
      <Card className="bg-[#131929] border-white/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-foreground">Vida Inteira Resgatável — Prazo de pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {MAG_PRODUTOS.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setProdutoIdx(i)}
                className={cn(
                  "rounded-lg border px-3 py-3 text-center transition-all",
                  "bg-[#0D1220] hover:bg-[#0D1220]/80",
                  produtoIdx === i
                    ? "border-[#1E5CE6] ring-2 ring-[#1E5CE6]/40"
                    : "border-white/10",
                )}
              >
                <p className="text-sm font-semibold text-foreground">Resgatável</p>
                <p className="text-xs text-[#1E5CE6] font-medium tabular-nums">{p.subtitulo}</p>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{descricaoSeguro}</p>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Prêmio mensal (ano 1): </span>
              <span className="font-semibold tabular-nums text-foreground">{fmtMoney(pm0, moeda)}</span>
            </div>
            {fontePremio === "mag_api" ? (
              <Badge className="border-transparent bg-[#1E5CE6] text-white hover:bg-[#1E5CE6]">Cotação MAG</Badge>
            ) : (
              <Badge variant="secondary" className="border-transparent bg-zinc-600 text-zinc-100">
                Estimativa
              </Badge>
            )}
            {loadingMag && <span className="text-xs text-muted-foreground">Atualizando…</span>}
          </div>
        </CardContent>
      </Card>

      {/* Projeção MAG ano a ano */}
      <Card className="bg-[#131929] border-white/10">
        <CardHeader className="pb-2 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base font-medium text-foreground">
              Projeção ano a ano — MAG
            </CardTitle>
            <ToggleGroup
              type="single"
              value={modoProjecao}
              onValueChange={(v) => v && setModoProjecao(v as "real" | "nominal")}
              className="rounded-lg border border-white/10 bg-[#0D1220] p-1 self-start sm:self-auto"
            >
              <ToggleGroupItem
                value="real"
                className="data-[state=on]:bg-[#1E5CE6] data-[state=on]:text-white px-3 py-1.5 text-xs"
              >
                Real
              </ToggleGroupItem>
              <ToggleGroupItem
                value="nominal"
                className="data-[state=on]:bg-[#1E5CE6] data-[state=on]:text-white px-3 py-1.5 text-xs"
              >
                Nominal
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <p className="text-xs text-muted-foreground font-normal">
            Pagamento em {ANOSPAG} anos · Prêmio ano 1: {fmtMoney(pm0, moeda)} · Capital:{" "}
            {fmtMoney(capitalSegurado, moeda)}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Ano de vigência</TableHead>
                  <TableHead className="text-muted-foreground">Idade</TableHead>
                  <TableHead className="text-right text-muted-foreground">Contribuições realizadas</TableHead>
                  <TableHead className="text-right text-muted-foreground">Capital segurado</TableHead>
                  {modoProjecao === "nominal" && (
                    <TableHead className="text-right text-muted-foreground">Prêmio mensal do ano</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {projecaoMagRows.map((row) => (
                  <TableRow
                    key={row.ano}
                    className={cn(
                      "border-white/10",
                      row.destaque && "border-l-2 border-l-[#1E5CE6] bg-[#1E5CE6]/5",
                    )}
                  >
                    <TableCell className="font-medium tabular-nums text-foreground">{row.ano}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{row.idade}</TableCell>
                    <TableCell className="text-right tabular-nums text-foreground">
                      {fmtMoney(row.contribAcum, moeda)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-400">
                      {fmtMoney(row.capital, moeda)}
                    </TableCell>
                    {modoProjecao === "nominal" && (
                      <TableCell className="text-right tabular-nums text-foreground">
                        {fmtMoney(row.premioMensalAno, moeda)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {modoProjecao === "real"
              ? "Valores em reais de hoje, sem correção monetária. Conforme projeção oficial MAG."
              : `Valores corrigidos por IPCA de ${inflacaoPctDisplay}% a.a. estimado. Meramente ilustrativo.`}
          </p>
        </CardContent>
      </Card>

      {/* SEÇÃO 4 — KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-[#131929] border-white/10">
          <CardContent className="pt-6 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Proteção dia 1 — Previdência</p>
            <p className="text-xl font-bold text-red-500 tabular-nums">{fmtMoney(0, moeda)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#131929] border-white/10">
          <CardContent className="pt-6 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Proteção dia 1 — Seguro</p>
            <p className="text-xl font-bold text-emerald-400 tabular-nums">{fmtMoney(capitalSegurado, moeda)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#131929] border-white/10">
          <CardContent className="pt-6 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Prêmio mensal ano 1</p>
            <p className="text-xs text-muted-foreground">pm + rend. inicial (est.)</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{fmtMoney(kpiPremioAno1, moeda)}</p>
          </CardContent>
        </Card>
        <Card className="bg-[#131929] border-white/10">
          <CardContent className="pt-6 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Custo total prêmios ({ANOSPAG}a)</p>
            <p className="text-xl font-semibold tabular-nums text-foreground">{fmtMoney(custoNomTotal, moeda)}</p>
            <p className="text-xs text-zinc-500 tabular-nums">Real (ref.): {fmtMoney(custoRealTotal, moeda)}</p>
            <p className="text-xs text-zinc-500">(prêmio corrigido por IPCA de {inflacaoPctDisplay}% a.a.)</p>
          </CardContent>
        </Card>
        <Card className="bg-[#131929] border-emerald-500/20">
          <CardContent className="pt-6 space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Capital segurado aos {expectativaVida} anos</p>
            <p className="text-xl font-semibold tabular-nums text-emerald-400">{fmtMoney(capitalCorrigidoExpectativa, moeda)}</p>
            <p className="text-xs text-zinc-500 tabular-nums">
              Hoje: {fmtMoney(capitalSegurado, moeda)} × (1+{inflacaoPctDisplay}%)^{anosAteExpectativa}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 5 */}
      <Card className="bg-[#131929] border-[#1E5CE6]/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-foreground">Insight</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{veredicto}</p>
        </CardContent>
      </Card>

      {/* SEÇÃO 6 */}
      <Card className="bg-[#131929] border-white/10">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">Patrimônio total aos herdeiros</CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Eixo X = idades ({idadeAtualEff} → {idadeAposEff}). Modo: {modoRN === "real" ? "real" : "nominal"}.
          </p>
        </CardHeader>
        <CardContent className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={linhaPatrimonioHerdeiros} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="idade" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                tickFormatter={(v) => fmtShort(Number(v), moeda)}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#131929",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                }}
                formatter={(value: number | string) => [fmtMoney(Number(value), moeda), ""]}
              />
              <Legend />
              <Line type="monotone" dataKey="cenA" name="Cenário A" stroke="#1E5CE6" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="cenBvivo" name="Cenário B — sobrevivência" stroke="#22C787" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line
                type="monotone"
                dataKey="cenBmorte"
                name="Cenário B — + CS"
                stroke="#22C787"
                strokeWidth={2}
                strokeDasharray="6 6"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* SEÇÃO 7A — Comparativo rentabilidade anual */}
      <Card className="bg-[#131929] border-white/10">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Comparativo: Previdência vs Investimento Livre (após IR e seguro)
          </CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Rendimento anual bruto de cada cenário, por idade.
          </p>
        </CardHeader>
        <CardContent className="h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparativoAnual} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="idade" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                width={64}
                tickFormatter={(v: number) => fmtShort(v, moeda)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0D1220",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                }}
                formatter={(value: number | string) => fmtMoney(Number(value), moeda)}
              />
              <Legend />
              <Bar dataKey="rendPrev" name="Prev" fill="#1E5CE6" radius={[3, 3, 0, 0]} />
              <Bar dataKey="rendInvLiq" name="Inv. Líquido (− IR − Seguro)" fill="#4CAF7D" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* SEÇÃO 7B — Custo anual do seguro */}
      <Card className="bg-[#131929] border-white/10">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">
            Pagamento anual do seguro — prazo de {ANOSPAG} anos
          </CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Prêmio anual pago por ano. Total ao final: {fmtMoney(totalPagoSeguro, moeda)}.
          </p>
        </CardHeader>
        <CardContent className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={custoAnualSeguro} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="ano" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                width={64}
                tickFormatter={(v: number) => fmtShort(v, moeda)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0D1220",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                }}
                formatter={(value: number | string, _n, p) => {
                  const row = p?.payload as { acumulado?: number } | undefined
                  const acum = row?.acumulado ?? 0
                  if (p?.dataKey === "custoAnual") {
                    return [`${fmtMoney(Number(value), moeda)} | Acumulado: ${fmtMoney(acum, moeda)}`, "Custo anual"]
                  }
                  return [fmtMoney(Number(value), moeda), String(p?.name ?? "")]
                }}
              />
              <ReferenceLine
                y={totalPagoSeguro}
                stroke="#F59E0B"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: `Total: ${fmtShort(totalPagoSeguro, moeda)}`,
                  position: "right",
                  fill: "#F59E0B",
                  fontSize: 11,
                }}
              />
              <Bar dataKey="custoAnual" name="Prêmio anual" fill="#F59E0B" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* SEÇÃO 8 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-[#131929] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Cenário A</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Em previdência: <span className="text-foreground font-medium">{fmtMoney(patP, moeda)}</span>
            </p>
            <p>
              Em investimento: <span className="text-foreground font-medium">{fmtMoney(patI, moeda)}</span>
            </p>
            <p>
              Saldo bruto final prev:{" "}
              <span className="text-foreground font-medium">
                {fmtMoney(finais.spAF, moeda)} <span className="text-xs">(bruto)</span>
              </span>
            </p>
            <p>
              IR no resgate:{" "}
              <span className="text-foreground font-medium">
                − {fmtMoney(finais.spAF * irAliq, moeda)} <span className="text-xs">(só no resgate)</span>
              </span>
            </p>
            <p className="pt-2 flex flex-wrap items-center gap-2">
              <span>Total líquido herdeiros</span>
              <Badge variant="outline" className="text-[10px] border-white/20">
                {modoRN === "real" ? "Real" : "Nominal"}
              </Badge>
            </p>
            <p className="text-xl font-bold text-[#1E5CE6] tabular-nums">{fmtMoney(finais.liqAF, moeda)}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#131929] border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-foreground">Cenário B</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Patrimônio no investimento:{" "}
              <span className="text-foreground font-medium">
                {fmtMoney(patTotal, moeda)} <span className="text-xs">(100%)</span>
              </span>
            </p>
            <p>
              Saldo bruto final: <span className="text-foreground font-medium">{fmtMoney(finais.sbF, moeda)}</span>
            </p>
            <p>
              IR sobre rendimentos (15%):{" "}
              <span className="text-foreground font-medium">− {fmtMoney(finais.rendBIr, moeda)}</span>
            </p>
            <p>
              (−) Prêmios {ANOSPAG} anos (nominal):{" "}
              <span className="text-foreground font-medium">− {fmtMoney(custoNomTotal, moeda)}</span>
            </p>
            <p>
              (−) Prêmios {ANOSPAG} anos (real ref.):{" "}
              <span className="text-foreground font-medium">− {fmtMoney(custoRealTotal, moeda)}</span>
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span>(+) CS se falecer</span>
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                {modoRN === "real" ? "Real" : "Nominal"}
              </Badge>
              <span className="text-emerald-400 font-semibold tabular-nums">{fmtMoney(finais.csDisp, moeda)}</span>
            </p>
            <p className="pt-1">
              Patrimônio líquido sobrevivência:{" "}
              <span className="text-foreground font-medium tabular-nums">{fmtMoney(finais.liqBsobrevF, moeda)}</span>
            </p>
            <p className="flex flex-wrap items-center gap-2 pt-1">
              <span>Total herdeiros se falecer</span>
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">
                {modoRN === "real" ? "Real" : "Nominal"}
              </Badge>
            </p>
            <p className="text-xl font-bold text-emerald-400 tabular-nums">{fmtMoney(finais.liqBmorteF, moeda)}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary" className="text-[10px] bg-zinc-700/80">
                Sem resgate (sobrevivência)
              </Badge>
              <Badge variant="secondary" className="text-[10px] bg-zinc-700/80">
                CS se falecer
              </Badge>
              <Badge variant="secondary" className="text-[10px] bg-zinc-700/80">
                Isento IR/ITCMD (simplificado)
              </Badge>
              <Badge variant="secondary" className="text-[10px] bg-zinc-700/80">
                CS vitalício · {produto.nome}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => onNavigate("protecao")}
          className="border-white/10 bg-[#131929] text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={() => onNavigate("dashboard")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          Dashboard
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
