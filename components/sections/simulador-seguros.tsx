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
} from "recharts"
import { AlertTriangle, ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react"
import { usePlano } from "@/lib/plano-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { MAG_PRODUTO_META, nomeProdutoMag, taxaFaixaEtaria } from "@/lib/mag/produtos"
import { cn } from "@/lib/utils"

interface SimuladorSegurosProps {
  onNavigate: (section: string) => void
}

const CS_MIN = 500_000
const CS_MAX = 25_000_000

const IR_PREV_OPCOES = [
  { v: "10", pct: 0.1, label: "10%" },
  { v: "15", pct: 0.15, label: "15%" },
  { v: "20", pct: 0.2, label: "20%" },
  { v: "27.5", pct: 0.275, label: "27,5%" },
] as const

function codigoProdutoMag(tipo: "prazo" | "inteira", anosPrazo: 10 | 20 | 30): string {
  if (tipo === "inteira") return "WL10"
  return anosPrazo === 10 ? "TL10" : anosPrazo === 20 ? "TL20" : "TL30"
}

function getAnospag(codigo: string): number {
  return MAG_PRODUTO_META[codigo]?.anospag ?? 10
}

function multProduto(codigo: string): number {
  return MAG_PRODUTO_META[codigo]?.mult ?? 1
}

function premioFallback(cs: number, idade: number, codigo: string) {
  return cs * taxaFaixaEtaria(idade) * multProduto(codigo)
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
  | "dataNascimento"
  | "sexo"
  | "uf"
  | "rendaMensal"
  | "idadeAposentadoria"
  | "ativosLiquidos"
  | "passivos"
  | "rentabilidadePrev"
  | "inflacao"

const CAMPOS_SEM_IR: CampoKey[] = [
  "dataNascimento",
  "sexo",
  "uf",
  "rendaMensal",
  "idadeAposentadoria",
  "ativosLiquidos",
  "passivos",
  "rentabilidadePrev",
  "inflacao",
]

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

const LABEL_CAMPO: Record<CampoKey, string> = {
  dataNascimento: "Data de nascimento",
  sexo: "Sexo",
  uf: "UF (estado)",
  rendaMensal: "Renda mensal",
  idadeAposentadoria: "Idade na aposentadoria",
  ativosLiquidos: "Ativos líquidos",
  passivos: "Passivos",
  rentabilidadePrev: "Rentabilidade previdência (% a.a.)",
  inflacao: "Inflação (% a.a.)",
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

function campoEstaPreenchido(campo: CampoKey, val: string | number | null): boolean {
  if (val === null || val === undefined) return false
  switch (campo) {
    case "dataNascimento":
      if (typeof val !== "string" || !val.trim()) return false
      return idadeFromNascimentoStr(val) > 0
    case "sexo":
      return val === "M" || val === "F"
    case "uf": {
      const u = String(val).trim().toUpperCase()
      return (UFS_BR as readonly string[]).includes(u)
    }
    case "rendaMensal":
      return typeof val === "number" && val > 0
    case "idadeAposentadoria": {
      const n = typeof val === "number" ? val : Number(val)
      return Number.isFinite(n) && n >= 50 && n <= 80
    }
    case "ativosLiquidos":
    case "passivos": {
      const n = typeof val === "number" ? val : Number(val)
      return Number.isFinite(n) && n >= 0
    }
    case "rentabilidadePrev": {
      const n = typeof val === "number" ? val : Number(val)
      return Number.isFinite(n) && n > 0
    }
    case "inflacao": {
      const n = typeof val === "number" ? val : Number(val)
      return Number.isFinite(n) && n > 0
    }
    default:
      return false
  }
}

export function SimuladorSeguros({ onNavigate }: SimuladorSegurosProps) {
  const { state, getIdadeAtual, getPatrimonioLiquido } = usePlano()
  const { dadosPessoais, premissas, ativos, passivos } = state
  const moeda = state.moeda ?? "BRL"

  const [modoRN, setModoRN] = useState<"nominal" | "real">("nominal")
  const [patTotal, setPatTotal] = useState(0)
  const [allocPrevPct, setAllocPrevPct] = useState(40)
  const [capitalSegurado, setCapitalSegurado] = useState(3_000_000)
  const [irPrevKey, setIrPrevKey] = useState<(typeof IR_PREV_OPCOES)[number]["v"]>("15")
  const [rpPct, setRpPct] = useState(7)
  const [riPct, setRiPct] = useState(11)
  const [tipoSeguro, setTipoSeguro] = useState<"prazo" | "inteira">("prazo")
  const [anosPrazo, setAnosPrazo] = useState<10 | 20 | 30>(20)
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
    const sum = rows.reduce((s, p) => s + (Number(p.valor) || 0), 0)
    return { sum, temLinha: rows.length > 0 }
  }, [passivos])

  const variaveis = useMemo((): Record<CampoKey, string | number | null> => {
    const rb = Number(premissas.rendimentoBruto)
    const rl = Number(premissas.rendimento)
    const rentPrev = rb > 0 ? rb : rl > 0 ? rl : null
    const infG = Number(premissas.inflacao)
    const ia = Number(premissas.idadeApos)
    return {
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

  const faltando = useMemo(
    () => CAMPOS_SEM_IR.filter((c) => !campoEstaPreenchido(c, getValue(c))),
    [getValue],
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

  const codigoMag = useMemo(() => codigoProdutoMag(tipoSeguro, anosPrazo), [tipoSeguro, anosPrazo])
  const ANOSPAG = getAnospag(codigoMag)

  useEffect(() => {
    setPatTotal(getPatrimonioLiquido())
  }, [getPatrimonioLiquido, ativos, passivos])

  const patP = (patTotal * allocPrevPct) / 100
  const patI = (patTotal * (100 - allocPrevPct)) / 100

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buscarMag = useCallback(async () => {
    if (faltando.length > 0) {
      setPm0(premioFallback(capitalSegurado, Math.max(18, idadeAtualEff || 35), codigoMag))
      setFontePremio("estimativa")
      return
    }

    const dataNascimento = String(getValue("dataNascimento") ?? "").trim()
    const sexoVal = getValue("sexo")
    const rendaMensal = Number(getValue("rendaMensal")) || 0
    const ufVal = (String(getValue("uf") ?? "SP").trim() || "SP").slice(0, 2).toUpperCase()

    if (!dataNascimento || capitalSegurado <= 0) {
      const fb = premioFallback(capitalSegurado, idadeAtualEff || 35, codigoMag)
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
      const fb = premioFallback(capitalSegurado, idadeAtualEff || 35, codigoMag)
      setPm0(fb)
      setFontePremio("estimativa")
      // eslint-disable-next-line no-console
      console.log("MAG fallback / raw:", data.rawResponse ?? data)
    } catch {
      const fb = premioFallback(capitalSegurado, idadeAtualEff || 35, codigoMag)
      setPm0(fb)
      setFontePremio("estimativa")
    } finally {
      setLoadingMag(false)
    }
  }, [
    ANOSPAG,
    capitalSegurado,
    codigoMag,
    faltando,
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
          ? spA - spA * irAliq + (siA - Math.max(siA - patI, 0) * 0.15)
          : spA + siA

      const sb = patTotal * Math.pow(1 + ri, t)
      const premAcum = custoNominalPremiosAcumulado(pm0, ANOSPAG, inf, t)
      const rawBvivo = sb - Math.max(sb - patTotal, 0) * 0.15 - premAcum

      const coberto = tipoSeguro === "inteira" ? true : t < ANOSPAG
      const rawBmorte = rawBvivo + (coberto ? capitalSegurado : 0)

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
    pm0,
    ANOSPAG,
    inf,
    tipoSeguro,
    capitalSegurado,
    modoRN,
  ])

  const barrasRendimentoMensal = useMemo(() => {
    const rows: { idade: number; stackPrev: number; stackPrem: number; stackInv: number; brutoInv: number }[] = []
    for (let t = 1; t <= H; t++) {
      const idade = idadeAtualEff + t
      const spA = patP * Math.pow(1 + rp, t)
      const stackPrev = (spA * rp) / 12

      const stackPrem =
        t <= ANOSPAG ? pm0 * Math.pow(1 + inf, Math.max(0, t - 1)) : 0

      const sb = patTotal * Math.pow(1 + ri, t)
      const rendBrutoM = (sb * ri) / 12
      const stackInv = Math.max(rendBrutoM - stackPrem, 0)

      const rawBruto = stackPrem + stackInv
      rows.push({
        idade,
        stackPrev: modoRN === "real" ? stackPrev / deflator(t) : stackPrev,
        stackPrem: modoRN === "real" ? stackPrem / deflator(t) : stackPrem,
        stackInv: modoRN === "real" ? stackInv / deflator(t) : stackInv,
        brutoInv: modoRN === "real" ? rawBruto / deflator(t) : rawBruto,
      })
    }
    return rows
  }, [
    H,
    idadeAtualEff,
    patP,
    patTotal,
    rp,
    ri,
    pm0,
    ANOSPAG,
    inf,
    modoRN,
  ])

  const finais = useMemo(() => {
    const t = H
    const d = Math.pow(1 + inf, t)
    const spAF = patP * Math.pow(1 + rp, t)
    const siAF = patI * Math.pow(1 + ri, t)
    const liqAF_nom =
      spAF - spAF * irAliq + (siAF - Math.max(siAF - patI, 0) * 0.15)

    const sbF = patTotal * Math.pow(1 + ri, t)
    const premF = custoNominalPremiosTotal(pm0, ANOSPAG, inf)
    const liqBsobrev_nom = sbF - Math.max(sbF - patTotal, 0) * 0.15 - premF
    const rendB = Math.max(0, sbF - patTotal - premF)
    const liqBmorte_nom = liqBsobrev_nom + capitalSegurado

    const toDisp = (v: number) => (modoRN === "real" ? v / d : v)

    return {
      spAF,
      siAF,
      liqAF: toDisp(liqAF_nom),
      sbF,
      liqBsobrevF: toDisp(liqBsobrev_nom),
      liqBmorteF: toDisp(liqBmorte_nom),
      rendB,
      rendBIr: toDisp(rendB * 0.15),
      csDisp: toDisp(capitalSegurado),
    }
  }, [
    H,
    patP,
    patI,
    patTotal,
    rp,
    ri,
    irAliq,
    pm0,
    ANOSPAG,
    inf,
    capitalSegurado,
    modoRN,
  ])

  const kpiPremioAno1 = pm0 + (patTotal * ri) / 12

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

  const descricaoSeguro =
    tipoSeguro === "inteira"
      ? `${nomeProdutoMag("WL10")} — cobertura vitalícia (modelo WL10).`
      : `${nomeProdutoMag(codigoMag)} — cobertura por ${anosPrazo} anos.`

  const investPct = 100 - allocPrevPct

  const inflacaoPctDisplay = useMemo(() => {
    const v = getValue("inflacao")
    return typeof v === "number" && v > 0 ? v : Number(premissas.inflacao) || 4
  }, [getValue, premissas.inflacao])

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

      {faltando.length > 0 ? (
        <Card className="border-amber-500/50 bg-amber-500/10 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium text-amber-950 dark:text-amber-100 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
              Alguns dados não estão preenchidos no plano. Complete abaixo para simular:
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {faltando.map((campo) => (
              <div key={campo} className="space-y-1.5">
                <Label className="text-xs text-amber-950/80 dark:text-amber-100/90">{LABEL_CAMPO[campo]}</Label>
                {campo === "dataNascimento" ? (
                  <Input
                    type="date"
                    value={localInputs.dataNascimento ?? ""}
                    onChange={(e) =>
                      setLocalInputs((p) => ({ ...p, dataNascimento: e.target.value }))
                    }
                    className="h-10 bg-background/80 border-amber-500/40"
                  />
                ) : null}
                {campo === "sexo" ? (
                  <Select
                    value={localSexo}
                    onValueChange={(v) => setLocalSexo(resolveSexoSelect(v))}
                  >
                    <SelectTrigger className="h-10 bg-background/80 border-amber-500/40">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                ) : null}
                {campo === "uf" ? (
                  <Select
                    value={localUf}
                    onValueChange={(v) => setLocalUf(resolveUfSelect(v))}
                  >
                    <SelectTrigger className="h-10 bg-background/80 border-amber-500/40">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border max-h-60">
                      {UFS_BR.map((uf) => (
                        <SelectItem key={uf} value={uf}>
                          {uf}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                {campo === "rendaMensal" ? (
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      R$
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      placeholder="0"
                    value={localInputs.rendaMensal ?? ""}
                    onChange={(e) =>
                      setLocalInputs((p) => ({
                        ...p,
                        rendaMensal: e.target.value,
                      }))
                    }
                      className="h-10 pl-10 bg-background/80 border-amber-500/40 tabular-nums"
                    />
                  </div>
                ) : null}
                {campo === "idadeAposentadoria" ? (
                  <Input
                    type="number"
                    min={50}
                    max={80}
                    step={1}
                    placeholder="65"
                    value={localInputs.idadeAposentadoria ?? ""}
                    onChange={(e) =>
                      setLocalInputs((p) => ({
                        ...p,
                        idadeAposentadoria: e.target.value,
                      }))
                    }
                    className="h-10 bg-background/80 border-amber-500/40 tabular-nums"
                  />
                ) : null}
                {campo === "ativosLiquidos" ? (
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      R$
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="0"
                      value={localInputs.ativosLiquidos ?? ""}
                      onChange={(e) =>
                        setLocalInputs((p) => ({
                          ...p,
                          ativosLiquidos: e.target.value,
                        }))
                      }
                      className="h-10 pl-10 bg-background/80 border-amber-500/40 tabular-nums"
                    />
                  </div>
                ) : null}
                {campo === "passivos" ? (
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      R$
                    </span>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="0"
                      value={localInputs.passivos ?? ""}
                      onChange={(e) =>
                        setLocalInputs((p) => ({
                          ...p,
                          passivos: e.target.value,
                        }))
                      }
                      className="h-10 pl-10 bg-background/80 border-amber-500/40 tabular-nums"
                    />
                  </div>
                ) : null}
                {campo === "rentabilidadePrev" ? (
                  <div className="relative">
                    <Input
                      type="number"
                      min={0.5}
                      max={30}
                      step={0.5}
                      placeholder="7"
                      value={localInputs.rentabilidadePrev ?? ""}
                      onChange={(e) =>
                        setLocalInputs((p) => ({
                          ...p,
                          rentabilidadePrev: e.target.value,
                        }))
                      }
                      className="h-10 pr-14 bg-background/80 border-amber-500/40 tabular-nums"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      % a.a.
                    </span>
                  </div>
                ) : null}
                {campo === "inflacao" ? (
                  <div className="relative">
                    <Input
                      type="number"
                      min={0.1}
                      max={25}
                      step={0.1}
                      placeholder="4"
                      value={localInputs.inflacao ?? ""}
                      onChange={(e) =>
                        setLocalInputs((p) => ({
                          ...p,
                          inflacao: e.target.value,
                        }))
                      }
                      className="h-10 pr-14 bg-background/80 border-amber-500/40 tabular-nums"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      % a.a.
                    </span>
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

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
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                IR previdência no resgate
              </Label>
              <Select
                value={irPrevKey ?? "15"}
                onValueChange={(v) => setIrPrevKey((v || "15") as (typeof IR_PREV_OPCOES)[number]["v"])}
              >
                <SelectTrigger className="h-11 bg-[#0D1220] border-white/10">
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
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{rpPctResolved}% a.a.</span>
            </div>
            <Slider value={[rpPct]} onValueChange={(v) => setRpPct(v[0] ?? 7)} min={4} max={15} step={0.5} />
          </CardContent>
        </Card>
        <Card className="bg-[#131929] border-emerald-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-400">Investimento % a.a. líquida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{riPct}% a.a.</span>
            </div>
            <Slider value={[riPct]} onValueChange={(v) => setRiPct(v[0] ?? 11)} min={4} max={18} step={0.5} />
          </CardContent>
        </Card>
      </div>

      {/* SEÇÃO 3 */}
      <Card className="bg-[#131929] border-white/10">
        <CardHeader className="pb-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base font-medium text-foreground">Tipo de seguro</CardTitle>
          <ToggleGroup
            type="single"
            value={tipoSeguro}
            onValueChange={(v) => v && setTipoSeguro(v as "prazo" | "inteira")}
            className="rounded-lg border border-white/10 bg-[#0D1220] p-1"
          >
            <ToggleGroupItem value="prazo" className="data-[state=on]:bg-[#1E5CE6] data-[state=on]:text-white px-3 py-1.5 text-xs">
              Vida por Prazo
            </ToggleGroupItem>
            <ToggleGroupItem value="inteira" className="data-[state=on]:bg-[#1E5CE6] data-[state=on]:text-white px-3 py-1.5 text-xs">
              Vida Inteira
            </ToggleGroupItem>
          </ToggleGroup>
        </CardHeader>
        <CardContent className="space-y-4">
          {tipoSeguro === "prazo" && (
            <div className="flex flex-wrap gap-2">
              {([10, 20, 30] as const).map((a) => (
                <Button
                  key={a}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setAnosPrazo(a)}
                  className={cn(
                    "border-white/10 bg-[#0D1220]",
                    anosPrazo === a && "border-[#1E5CE6] bg-[#1E5CE6]/15 ring-1 ring-[#1E5CE6]/40",
                  )}
                >
                  {a} anos
                </Button>
              ))}
            </div>
          )}
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

      {/* SEÇÃO 7 */}
      <Card className="bg-[#131929] border-white/10">
        <CardHeader>
          <CardTitle className="text-base font-medium text-foreground">Rendimento mensal bruto</CardTitle>
          <p className="text-xs text-muted-foreground font-normal">Barras empilhadas por idade (a partir do 2º ano do horizonte).</p>
        </CardHeader>
        <CardContent className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barrasRendimentoMensal} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="idade" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} width={52} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#131929",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                }}
                formatter={(value: number | string, _n, p) => {
                  if (p?.dataKey === "brutoInv") return [fmtMoney(Number(value), moeda), "Invest. bruto (laranja+verde)"]
                  return [fmtMoney(Number(value), moeda), String(p?.name ?? "")]
                }}
              />
              <Legend />
              <Bar dataKey="stackPrev" name="Prev (rp/12)" stackId="s" fill="#1E5CE6" />
              <Bar dataKey="stackPrem" name="Prêmio" stackId="s" fill="#f59e0b" />
              <Bar dataKey="stackInv" name="Rend. livre inv." stackId="s" fill="#22C787" />
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
              {tipoSeguro === "prazo" ? (
                <Badge variant="secondary" className="text-[10px] bg-zinc-700/80">
                  Encerra ano {ANOSPAG}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] bg-zinc-700/80">
                  CS vitalício
                </Badge>
              )}
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
