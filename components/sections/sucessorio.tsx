"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { InputMoeda } from "@/components/ui/input-moeda"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { GrupoSelecaoUnica } from "@/components/ui/grupo-selecao"
import { KpiCard, KpiGrid } from "@/components/ui/kpi-card"
import { ArrowLeft, ArrowRight, FileDown } from "lucide-react"
import { usePlano, type Ativo, type QuestionarioSucessorio } from "@/lib/plano-context"
import { createClient } from "@/lib/supabase"
import { getSaldoDevedorPassivo, normalizeAtivoTipo } from "@/lib/patrimonio-utils"
import { calcularInventario } from "@/lib/engine"
import { MAG_PRODUTO_META, taxaFaixaEtaria } from "@/lib/mag/produtos"
import { usePlanoReadOnly } from "@/lib/plano-readonly-context"
import {
  calcularCustoInventario,
  calcularEspolio,
  calcularImpactoReforma,
  diagnosticoSinaisAlerta,
  SINAIS_ALERTA,
  type BemEspolio,
  type FrenteAlerta,
  type TipoAtivoSucessorio,
  type ViaInventario,
} from "@/lib/sucessorio/calculos"
import { calcularEstateTax } from "@/lib/sucessorio/estate-tax-eua"
import { getRegraItcmdUf, ITCMD_POR_UF, type UfBrasil } from "@/lib/sucessorio/itcmd-uf"
import { SucessorioRoteiro } from "@/components/sections/sucessorio-roteiro"
import { DocumentosSucessorios } from "@/components/sections/documentos-sucessorios"
import { visaoSucessorio } from "@/lib/sucessorio/visao"
import {
  montarRelatorioSucessorio,
  type AbaRelatorioSucessorio,
} from "@/lib/sucessorio/relatorio"
import { baixarRelatorioSucessorio } from "@/lib/sucessorio/baixar-relatorio"
import { textoParecerFallback } from "@/lib/sucessorio/texto-parecer"
import { ComparadorHolding } from "@/components/sections/sucessorio/comparador-holding"
import { ConsultoriaSucessoria } from "@/components/sections/sucessorio/consultoria"
import { calcularComparadorHolding } from "@/lib/sucessorio/holding"
import { hidratarHolding } from "@/lib/sucessorio/tipos"

const UFS_BR = Object.keys(ITCMD_POR_UF) as UfBrasil[]

const FRENTE_LABEL: Record<FrenteAlerta, string> = {
  sucessorio: "Sucessório",
  juridico: "Jurídico",
  fiscal: "Fiscal",
  internacional: "Internacional",
}

const NIVEL_LABEL = { baixo: "Baixo", medio: "Médio", alto: "Alto" } as const

function extrairProdutosMag(json: unknown): { codigo: string; label: string }[] | null {
  if (Array.isArray(json)) {
    const rows = json
      .map((row: Record<string, unknown>) => {
        const codigo = row.codigoModeloProposta ?? row.codigo
        if (codigo == null || codigo === "") return null
        const nome = row.nome ?? row.descricao ?? String(codigo)
        return { codigo: String(codigo), label: `${codigo} — ${nome}` }
      })
      .filter(Boolean) as { codigo: string; label: string }[]
    return rows.length ? rows : null
  }
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>
    for (const key of ["modelos", "data", "resultado", "itens"]) {
      const parsed = extrairProdutosMag(o[key])
      if (parsed) return parsed
    }
  }
  return null
}

function premioPorEstimativa(capital: number, idade: number, codigoProduto: string) {
  const mult = MAG_PRODUTO_META[codigoProduto]?.mult ?? 1
  return capital * taxaFaixaEtaria(idade) * mult
}

function tipoItcmdDoAtivo(ativo: Ativo): TipoAtivoSucessorio {
  const t = normalizeAtivoTipo(ativo.tipo, ativo.descricao)
  if (t === "imobilizado") return "imovel"
  if (t === "participacao_societaria") return "quotas"
  return "dinheiro"
}

function labelTipoBem(tipo: TipoAtivoSucessorio) {
  if (tipo === "imovel") return "Imóvel"
  if (tipo === "quotas") return "Quotas"
  if (tipo === "acoes") return "Ações"
  if (tipo === "previdencia") return "Previdência"
  return "Dinheiro / bem móvel"
}

function ufSegura(uf: string | undefined): UfBrasil {
  const u = (uf || "SP").trim().toUpperCase()
  return (u in ITCMD_POR_UF ? u : "SP") as UfBrasil
}

function seedRespostas(q: QuestionarioSucessorio | undefined): boolean[] {
  const r = Array.from({ length: 20 }, () => false)
  if (!q) return r
  r[0] = q.testamento === "Não"
  r[4] = q.planejamentoSucessorioRealizado === "Não"
  r[10] = q.doacoesJaRealizadas === "Sim"
  r[11] = q.usoPGBL === "Sim, uso atualmente" || q.usoPGBL === "Uso potencial"
  r[12] = q.preocupacaoComITCMD === "Nenhuma" || q.preocupacaoComITCMD === "Baixa"
  r[14] = q.preocupacaoComInventario === "Alta"
  r[15] = q.bensNoExterior === "Sim"
  return r
}

function pct(n: number) {
  return `${(n * 100).toFixed(2).replace(".", ",")}%`
}

function RodapeSimulacao() {
  return (
    <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-4">
      Simulação com a legislação vigente; não substitui a análise do caso concreto
    </p>
  )
}

function MemoriaCalculo({
  titulo,
  linhas,
}: {
  titulo: string
  linhas: { label: string; valor: string }[]
}) {
  if (linhas.length === 0) return null
  return (
    <Accordion type="single" collapsible className="mt-3">
      <AccordionItem value="memoria" className="border-border">
        <AccordionTrigger className="text-xs text-muted-foreground py-2">
          {titulo}
        </AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {linhas.map((l) => (
              <li key={l.label} className="flex justify-between gap-4">
                <span>{l.label}</span>
                <span className="tabular-nums text-foreground">{l.valor}</span>
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

interface SucessorioProps {
  onNavigate: (section: string) => void
  readOnly?: boolean
}

export function Sucessorio({ onNavigate }: SucessorioProps) {
  const { state, setSucessao, setDadosPessoais, setAtivos, getPatrimonioTotalConsolidado, getIdadeAtual } =
    usePlano()
  const planoReadOnly = usePlanoReadOnly()
  const { sucessao, dadosPessoais, ativos, passivos } = state
  const moeda = state.moeda ?? "BRL"
  const locked = planoReadOnly

  const fmt = (v: number) =>
    new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: moeda === "USD" ? "USD" : "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v)

  const fmtUsd = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v)

  const totalPassivosInv = useMemo(
    () => passivos.reduce((s, p) => s + getSaldoDevedorPassivo(p), 0),
    [passivos],
  )

  const patrimonioTotalConsolidado = getPatrimonioTotalConsolidado()
  const plInventario = sucessao.plEditavel > 0 ? sucessao.plEditavel : patrimonioTotalConsolidado
  const regimeInventario =
    sucessao.regimeSucessao || dadosPessoais.regime || "Comunhão Parcial de Bens"

  const inventario = useMemo(
    () =>
      calcularInventario(
        plInventario,
        regimeInventario,
        sucessao.herdeiros,
        sucessao.itcmd,
        sucessao.honorarios,
        sucessao.cartoriais,
        ativos,
        totalPassivosInv,
      ),
    [
      plInventario,
      regimeInventario,
      sucessao.herdeiros,
      sucessao.itcmd,
      sucessao.honorarios,
      sucessao.cartoriais,
      ativos,
      totalPassivosInv,
    ],
  )

  const quinhaoPorHerdeiro = useMemo(
    () => Math.max(0, inventario.porHerdeiro || 0),
    [inventario.porHerdeiro],
  )

  const itcmdDFProgressivo = useMemo(() => {
    const base = quinhaoPorHerdeiro
    if (base <= 1_000_000) return 4
    if (base <= 2_000_000) return 5
    if (base <= 3_000_000) return 6
    return 8
  }, [quinhaoPorHerdeiro])

  const [itcmdModo, setItcmdModo] = useState<"DF" | "SP" | "MG" | "RJ" | "RS" | "OUTROS">(() => {
    const atual = sucessao.itcmd ?? 0
    if (atual === itcmdDFProgressivo) return "DF"
    if (atual === 4) return "SP"
    if (atual === 5) return "MG"
    if (atual === 8) return "RJ"
    if (atual === 6) return "RS"
    return "OUTROS"
  })

  useEffect(() => {
    if (locked) return
    if (itcmdModo === "DF") setSucessao({ itcmd: itcmdDFProgressivo })
  }, [itcmdModo, itcmdDFProgressivo, setSucessao, locked])

  const produtosPadrao = useMemo(
    () =>
      Object.entries(MAG_PRODUTO_META).map(([codigo, v]) => ({
        codigo,
        label: `${codigo} — ${v.nome}`,
      })),
    [],
  )

  const [opcoesProduto, setOpcoesProduto] = useState(produtosPadrao)
  const [produtoSelecionado, setProdutoSelecionado] = useState("")
  const [capitalSegurado, setCapitalSegurado] = useState<number>(500_000)
  const [premioMensal, setPremioMensal] = useState<number | null>(null)
  const [premioAnual, setPremioAnual] = useState<number | null>(null)
  const [fontePremio, setFontePremio] = useState<"mag_api" | "estimativa">("estimativa")
  const [loadingPremio, setLoadingPremio] = useState(false)

  useEffect(() => {
    fetch("/api/mag/produtos")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const lista = extrairProdutosMag(data)
        if (lista?.length) setOpcoesProduto(lista)
      })
      .catch(() => {})
  }, [])

  const buscarPremioMAG = useCallback(async () => {
    if (!produtoSelecionado || capitalSegurado <= 0) {
      setPremioMensal(null)
      setPremioAnual(null)
      setFontePremio("estimativa")
      return
    }

    const idadeRef = getIdadeAtual() || 35

    const aplicarEstimativa = () => {
      const pm = premioPorEstimativa(capitalSegurado, idadeRef, produtoSelecionado)
      setPremioMensal(pm)
      setPremioAnual(pm * 12)
      setFontePremio("estimativa")
    }

    if (!dadosPessoais.nascimento) {
      aplicarEstimativa()
      return
    }

    setLoadingPremio(true)
    try {
      const meta = MAG_PRODUTO_META[produtoSelecionado]
      const anospag = meta?.anospag ?? 10

      const res = await fetch("/api/mag/simulacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataNascimento: dadosPessoais.nascimento,
          sexoId: dadosPessoais.sexo === "M" ? 1 : 2,
          renda: dadosPessoais.renda,
          uf: dadosPessoais.uf || "SP",
          codigoModeloProposta: meta?.codigoModelo ?? produtoSelecionado,
          capitalSegurado,
          anospag,
        }),
      })

      const data = await res.json()

      if (res.ok && typeof data.premioMensal === "number" && data.premioMensal > 0) {
        setPremioMensal(data.premioMensal)
        setPremioAnual(typeof data.premioAnual === "number" ? data.premioAnual : data.premioMensal * 12)
        setFontePremio("mag_api")
        return
      }

      aplicarEstimativa()
    } catch {
      aplicarEstimativa()
    } finally {
      setLoadingPremio(false)
    }
  }, [
    produtoSelecionado,
    capitalSegurado,
    dadosPessoais.nascimento,
    dadosPessoais.sexo,
    dadosPessoais.renda,
    dadosPessoais.uf,
    getIdadeAtual,
  ])

  useEffect(() => {
    void buscarPremioMAG()
  }, [buscarPremioMAG])

  const questionario: QuestionarioSucessorio = { ...(sucessao.questionario ?? {}) }

  const updateQuestionario = (patch: Partial<QuestionarioSucessorio>) => {
    if (locked) return
    setSucessao({ questionario: { ...questionario, ...patch } })
  }

  const respostas = sucessao.diagnostico?.respostas?.length === 20
    ? sucessao.diagnostico.respostas
    : seedRespostas(questionario)

  const setResposta = (idx: number, ativo: boolean) => {
    if (locked) return
    const next = [...respostas]
    next[idx] = ativo
    setSucessao({ diagnostico: { respostas: next } })
  }

  useEffect(() => {
    if (locked) return
    if (sucessao.diagnostico?.respostas?.length === 20) return
    setSucessao({ diagnostico: { respostas: seedRespostas(sucessao.questionario) } })
  }, [locked, sucessao.diagnostico, sucessao.questionario, setSucessao])

  const diagnostico = useMemo(() => diagnosticoSinaisAlerta(respostas), [respostas])

  const simulador = sucessao.simulador ?? {}
  const soHeranca = Boolean(simulador.soHeranca)
  const via = (simulador.via ?? "extrajudicial") as ViaInventario
  const honorariosPct = simulador.honorariosPct ?? 6
  const custasPct = simulador.custasPct ?? 1.5
  const diasAteAbertura = simulador.diasAteAbertura ?? 30
  const custoPlanejarVida = simulador.custoPlanejarVida ?? 0
  const domicilioUF = ufSegura(dadosPessoais.uf)

  const patchSimulador = (patch: Partial<typeof simulador>) => {
    if (locked) return
    setSucessao({ simulador: { ...simulador, ...patch } })
  }

  const ativosBase = useMemo(() => {
    return ativos.filter((a) => {
      const valor = Number(a.valor) || 0
      if (valor <= 0) return false
      if (!soHeranca) return true
      return a.heranca === true || a.bemDeHeranca === true
    })
  }, [ativos, soHeranca])

  const bensEspolio: BemEspolio[] = useMemo(
    () =>
      ativosBase.map((a) => {
        const tipo = tipoItcmdDoAtivo(a)
        const uf = tipo === "imovel" ? ufSegura(a.uf || domicilioUF) : domicilioUF
        return { tipo, valor: Number(a.valor) || 0, uf }
      }),
    [ativosBase, domicilioUF],
  )

  const espolio = useMemo(
    () =>
      calcularEspolio({
        domicilioUF,
        modalidade: "causa_mortis",
        bens: bensEspolio,
      }),
    [domicilioUF, bensEspolio],
  )

  const custoInv = useMemo(
    () =>
      calcularCustoInventario({
        uf: domicilioUF,
        patrimonio: espolio.patrimonio,
        via,
        honorariosPct: honorariosPct / 100,
        custasPct: custasPct / 100,
        diasAteAbertura,
      }),
    [domicilioUF, espolio.patrimonio, via, honorariosPct, custasPct, diasAteAbertura],
  )

  const alocacaoReforma = useMemo(() => {
    let holding = 0
    let imoveis = 0
    let previdencia = 0
    let exterior = 0
    for (const a of ativosBase) {
      const t = normalizeAtivoTipo(a.tipo, a.descricao)
      const v = Number(a.valor) || 0
      if (t === "participacao_societaria") holding += v
      else if (t === "imobilizado") imoveis += v
      else if (t === "previdencia") previdencia += v
      else if (t === "ativo_liquido" && a.localizacao === "internacional") exterior += v
    }
    return { holding, imoveis, previdencia, exterior }
  }, [ativosBase])

  const reforma = useMemo(
    () =>
      calcularImpactoReforma({
        uf: domicilioUF,
        patrimonio: espolio.patrimonio,
        ...alocacaoReforma,
      }),
    [domicilioUF, espolio.patrimonio, alocacaoReforma],
  )

  const pontosAtencao = useMemo(() => {
    const ufs = new Set(espolio.porEstado.map((e) => e.uf))
    ufs.add(domicilioUF)
    const linhas: string[] = []
    for (const uf of ufs) {
      const regra = getRegraItcmdUf(uf)
      for (const p of regra.pontosDeAtencao) {
        linhas.push(`${uf}: ${p}`)
      }
    }
    return linhas
  }, [espolio.porEstado, domicilioUF])

  const somaLiquidosIntl = useMemo(
    () =>
      ativos
        .filter(
          (a) =>
            normalizeAtivoTipo(a.tipo, a.descricao) === "ativo_liquido" &&
            a.localizacao === "internacional",
        )
        .reduce((s, a) => s + (Number(a.valor) || 0), 0),
    [ativos],
  )

  const bensEuaUSD = simulador.bensEuaUSD ?? somaLiquidosIntl
  const cambio = simulador.cambio && simulador.cambio > 0 ? simulador.cambio : undefined
  const estate = useMemo(() => calcularEstateTax(bensEuaUSD, cambio), [bensEuaUSD, cambio])

  const economiaPlanejar = custoInv.total - custoPlanejarVida
  const barraCustoWidth = Math.min(100, (custoInv.percentualPatrimonio / 0.2) * 100)

  const setUfImovel = (id: string, uf: string) => {
    if (locked) return
    setAtivos(ativos.map((a) => (a.id === id ? { ...a, uf } : a)))
  }

  const pointer = locked ? "pointer-events-none opacity-80" : undefined
  const [assessorNome, setAssessorNome] = useState("Assessor")
  const [gerandoPdf, setGerandoPdf] = useState(false)

  useEffect(() => {
    try {
      const supabase = createClient()
      void supabase.auth.getUser().then(({ data }) => {
        const u = data.user
        const nome =
          (u?.user_metadata?.full_name as string | undefined) ||
          (u?.user_metadata?.name as string | undefined) ||
          u?.email ||
          "Assessor"
        setAssessorNome(nome)
      })
    } catch {
      /* sessão pública */
    }
  }, [])

  const visao = useMemo(
    () => visaoSucessorio({ dadosPessoais, ativos, sucessao }),
    [dadosPessoais, ativos, sucessao],
  )

  const holdingVisao = useMemo(
    () => calcularComparadorHolding(hidratarHolding(sucessao.holding)),
    [sucessao.holding],
  )

  const gerarRelatorio = async (abas: AbaRelatorioSucessorio[]) => {
    if (gerandoPdf) return
    setGerandoPdf(true)
    try {
      const payload = montarRelatorioSucessorio({
        visao,
        abas,
        cliente: dadosPessoais.nome || "Cliente",
        assessor: assessorNome,
        moeda,
        holding: holdingVisao,
        parecerConsultoria: sucessao.consultoria?.parecer,
        textoConsultoria:
          sucessao.consultoria?.textoNarrativo ||
          (sucessao.consultoria?.parecer ? textoParecerFallback(sucessao.consultoria.parecer) : ""),
      })
      await baixarRelatorioSucessorio(payload)
    } catch (err) {
      console.error(err)
      window.alert("Não foi possível gerar o PDF. Tente novamente.")
    } finally {
      setGerandoPdf(false)
    }
  }

  const BotaoPdf = ({ abas, label }: { abas: AbaRelatorioSucessorio[]; label: string }) =>
    locked ? null : (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="no-print"
        disabled={gerandoPdf}
        onClick={() => void gerarRelatorio(abas)}
      >
        <FileDown className="h-4 w-4 mr-1.5" />
        {gerandoPdf ? "Gerando…" : label}
      </Button>
    )

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Planejamento</p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="page-title text-[24px] text-foreground">
            Planejamento <span className="text-primary">Sucessório</span>
          </h1>
          <BotaoPdf
            abas={["consultoria", "diagnostico", "itcmd", "exterior", "holding", "roteiro"]}
            label="Relatório completo"
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Consultoria sucessória e fiscal, diagnóstico, ITCMD por competência e bens no exterior
        </p>
      </div>

      <Tabs defaultValue="consultoria" className="gap-4">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="consultoria">Consultoria</TabsTrigger>
          <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
          <TabsTrigger value="itcmd">ITCMD e inventário</TabsTrigger>
          <TabsTrigger value="exterior">Exterior</TabsTrigger>
          <TabsTrigger value="holding">Holding</TabsTrigger>
          {!locked && <TabsTrigger value="roteiro">Roteiro</TabsTrigger>}
          {!locked && <TabsTrigger value="documentos">Documentos</TabsTrigger>}
        </TabsList>

        <TabsContent value="consultoria">
          <ConsultoriaSucessoria
            gerandoPdf={gerandoPdf}
            onGerarPdf={() => void gerarRelatorio(["consultoria"])}
            onEditarCadastro={() => onNavigate("dados-pessoais")}
            assessorNome={assessorNome}
          />
        </TabsContent>

        <TabsContent value="diagnostico" className="space-y-6">
          <div className="flex justify-end">
            <BotaoPdf abas={["diagnostico"]} label="Gerar relatório" />
          </div>
          {!locked && (
          <Card className="form-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-foreground">
                Questionário sucessório
              </CardTitle>
            </CardHeader>
            <CardContent className={`space-y-5 ${pointer ?? ""}`}>
              <GrupoSelecaoUnica
                label="Modelo de declaração de imposto de renda"
                value={questionario.modeloDeclaracaoIR}
                options={["Completa", "Simplificada", "Não declara"]}
                onChange={(v) =>
                  updateQuestionario({
                    modeloDeclaracaoIR: v as QuestionarioSucessorio["modeloDeclaracaoIR"],
                  })
                }
              />
              <GrupoSelecaoUnica
                label="Uso atual ou potencial de PGBL"
                value={questionario.usoPGBL}
                options={["Sim, uso atualmente", "Uso potencial", "Não"]}
                onChange={(v) =>
                  updateQuestionario({ usoPGBL: v as QuestionarioSucessorio["usoPGBL"] })
                }
              />
              <GrupoSelecaoUnica
                label="Bens no exterior"
                value={questionario.bensNoExterior}
                options={["Sim", "Não"]}
                onChange={(v) =>
                  updateQuestionario({
                    bensNoExterior: v as QuestionarioSucessorio["bensNoExterior"],
                  })
                }
              />
              <GrupoSelecaoUnica
                label="Planejamento sucessório se já realizado"
                value={questionario.planejamentoSucessorioRealizado}
                options={["Sim", "Não", "Em andamento"]}
                onChange={(v) =>
                  updateQuestionario({
                    planejamentoSucessorioRealizado:
                      v as QuestionarioSucessorio["planejamentoSucessorioRealizado"],
                  })
                }
              />
              <GrupoSelecaoUnica
                label="Testamento, se houver"
                value={questionario.testamento}
                options={["Sim", "Não"]}
                onChange={(v) =>
                  updateQuestionario({ testamento: v as QuestionarioSucessorio["testamento"] })
                }
              />
              <GrupoSelecaoUnica
                label="Holding patrimonial ou familiar"
                value={questionario.holdingPatrimonialOuFamiliar}
                options={["Sim", "Não"]}
                onChange={(v) =>
                  updateQuestionario({
                    holdingPatrimonialOuFamiliar:
                      v as QuestionarioSucessorio["holdingPatrimonialOuFamiliar"],
                  })
                }
              />
              <GrupoSelecaoUnica
                label="Doações já realizadas"
                value={questionario.doacoesJaRealizadas}
                options={["Sim", "Não"]}
                onChange={(v) =>
                  updateQuestionario({
                    doacoesJaRealizadas: v as QuestionarioSucessorio["doacoesJaRealizadas"],
                  })
                }
              />
              <GrupoSelecaoUnica
                label="Usufruto, se houver"
                value={questionario.usufruto}
                options={["Sim", "Não"]}
                onChange={(v) =>
                  updateQuestionario({ usufruto: v as QuestionarioSucessorio["usufruto"] })
                }
              />
              <GrupoSelecaoUnica
                label="Preocupação com inventário"
                value={questionario.preocupacaoComInventario}
                options={["Alta", "Média", "Baixa", "Nenhuma"]}
                onChange={(v) =>
                  updateQuestionario({
                    preocupacaoComInventario:
                      v as QuestionarioSucessorio["preocupacaoComInventario"],
                  })
                }
              />
              <GrupoSelecaoUnica
                label="Preocupação com ITCMD"
                value={questionario.preocupacaoComITCMD}
                options={["Alta", "Média", "Baixa", "Nenhuma"]}
                onChange={(v) =>
                  updateQuestionario({
                    preocupacaoComITCMD: v as QuestionarioSucessorio["preocupacaoComITCMD"],
                  })
                }
              />
              <div className="space-y-2">
                <Label className="field-label">Observações (opcional)</Label>
                <Textarea
                  value={questionario.observacoesSucessorio ?? ""}
                  onChange={(e) => updateQuestionario({ observacoesSucessorio: e.target.value })}
                  placeholder="Observações adicionais sobre o planejamento sucessório"
                  rows={3}
                  className="form-card text-foreground min-h-[80px] resize-y"
                />
              </div>
            </CardContent>
          </Card>
          )}

          {!locked && (
          <Card className="form-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-foreground">
                20 sinais de alerta
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Marque Sim quando o risco estiver presente. Respostas salvas no plano.
              </p>
            </CardHeader>
            <CardContent className={`space-y-6 ${pointer ?? ""}`}>
              {(["sucessorio", "juridico", "fiscal", "internacional"] as FrenteAlerta[]).map(
                (frente) => (
                  <div key={frente} className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {FRENTE_LABEL[frente]}
                    </p>
                    {SINAIS_ALERTA.filter((s) => s.frente === frente).map((s) => (
                      <div key={s.id} className="rounded-lg border border-border p-3 space-y-2">
                        <GrupoSelecaoUnica
                          label={s.titulo}
                          value={respostas[s.id] ? "Sim" : "Não"}
                          options={["Sim", "Não"]}
                          onChange={(v) => setResposta(s.id, v === "Sim")}
                        />
                        <p className="text-xs text-muted-foreground">{s.explicacao}</p>
                        <Badge variant="secondary" className="text-[10px] uppercase">
                          {s.etiqueta}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ),
              )}
            </CardContent>
          </Card>
          )}

          <KpiGrid>
            {(["sucessorio", "juridico", "fiscal", "internacional"] as FrenteAlerta[]).map(
              (frente) => {
                const bloco = diagnostico.porFrente[frente]
                return (
                  <KpiCard
                    key={frente}
                    label={FRENTE_LABEL[frente]}
                    value={`${Math.round((bloco.pontos / 5) * 100)}%`}
                    hint={`${NIVEL_LABEL[bloco.nivel]} · ${bloco.pontos} de 5 sinais`}
                    valueColor={
                      bloco.nivel === "alto"
                        ? "#B33A3A"
                        : bloco.nivel === "medio"
                          ? "#8A7220"
                          : "#1F6D3E"
                    }
                  />
                )
              },
            )}
          </KpiGrid>

          <Card className="form-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-foreground">
                Próxima conversa
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-foreground">{diagnostico.perguntaAbertura}</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Próximo passo: </span>
                {diagnostico.proximoPasso}
              </p>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Ordem de prioridade
                </p>
                <ol className="list-decimal list-inside text-sm space-y-1">
                  {(["sucessorio", "juridico", "fiscal", "internacional"] as FrenteAlerta[])
                    .slice()
                    .sort((a, b) => {
                      if (a === diagnostico.frentePrioritaria) return -1
                      if (b === diagnostico.frentePrioritaria) return 1
                      return diagnostico.porFrente[b].pontos - diagnostico.porFrente[a].pontos
                    })
                    .map((f, i) => (
                      <li key={f}>
                        {FRENTE_LABEL[f]} — {diagnostico.porFrente[f].pontos}/5 (
                        {NIVEL_LABEL[diagnostico.porFrente[f].nivel]})
                        {i === 0 ? " · frente prioritária" : ""}
                      </li>
                    ))}
                </ol>
              </div>
              <RodapeSimulacao />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="itcmd" className="space-y-6">
          <div className="flex justify-end">
            <BotaoPdf abas={["itcmd"]} label="Gerar relatório" />
          </div>
          <Card className="form-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-foreground">
                Base do espólio
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Domicílio: <span className="font-medium text-foreground">{domicilioUF}</span>
                </p>
                <label className={`flex items-center gap-2 text-sm ${pointer ?? ""}`}>
                  <Switch
                    checked={soHeranca}
                    onCheckedChange={(v) => patchSimulador({ soHeranca: v })}
                  />
                  Só bens marcados como herança
                </label>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3">Bem</th>
                      <th className="py-2 pr-3">Tipo</th>
                      <th className="py-2 pr-3">UF</th>
                      <th className="py-2 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ativosBase.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-muted-foreground">
                          Nenhum ativo no filtro atual.
                        </td>
                      </tr>
                    ) : (
                      ativosBase.map((a) => {
                        const tipo = tipoItcmdDoAtivo(a)
                        const imovel = tipo === "imovel"
                        return (
                          <tr key={a.id} className="border-b border-border/60">
                            <td className="py-2 pr-3">{a.descricao || a.tipo}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{labelTipoBem(tipo)}</td>
                            <td className="py-2 pr-3">
                              {imovel ? (
                                <Select
                                  value={ufSegura(a.uf || domicilioUF)}
                                  onValueChange={(v) => setUfImovel(a.id, v)}
                                  disabled={locked}
                                >
                                  <SelectTrigger className="h-8 w-[88px] form-card">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {UFS_BR.map((u) => (
                                      <SelectItem key={u} value={u}>
                                        {u}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-muted-foreground">{domicilioUF}</span>
                              )}
                            </td>
                            <td className="py-2 text-right tabular-nums">{fmt(Number(a.valor) || 0)}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="form-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-foreground">
                Espólio por estado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <KpiGrid>
                <KpiCard label="ITCMD total" value={fmt(espolio.imposto)} />
                <KpiCard label="Alíquota consolidada" value={pct(espolio.aliquotaConsolidada)} />
                <KpiCard label="Líquido aos herdeiros" value={fmt(espolio.liquido)} />
                <KpiCard label="Base" value={fmt(espolio.patrimonio)} />
              </KpiGrid>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-2 pr-3">Estado</th>
                      <th className="py-2 pr-3">Bens</th>
                      <th className="py-2 pr-3 text-right">Base</th>
                      <th className="py-2 pr-3 text-right">Imposto</th>
                      <th className="py-2 text-right">Alíquota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {espolio.porEstado.map((e) => (
                      <tr key={e.uf} className="border-b border-border/60">
                        <td className="py-2 pr-3 font-medium">{e.uf}</td>
                        <td className="py-2 pr-3 text-muted-foreground">
                          {e.bens.map((b) => labelTipoBem(b.tipo)).join(", ")}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{fmt(e.base)}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{fmt(e.imposto)}</td>
                        <td className="py-2 text-right tabular-nums">{pct(e.aliquotaEfetiva)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <MemoriaCalculo
                titulo="Memória de cálculo"
                linhas={espolio.porEstado.flatMap((e) =>
                  e.detalhe.memoria.map((m, i) => ({
                    label: `${e.uf} faixa ${i + 1} (${pct(m.aliquota)})`,
                    valor: fmt(m.imposto),
                  })),
                )}
              />
              <ul className="text-xs text-muted-foreground space-y-1">
                {pontosAtencao.map((p) => (
                  <li key={p}>· {p}</li>
                ))}
              </ul>
              <RodapeSimulacao />
            </CardContent>
          </Card>

          <Card className="form-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-foreground">
                Custo total do inventário
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${pointer ?? ""}`}>
                <div className="space-y-2">
                  <Label className="field-label">Via</Label>
                  <Select
                    value={via}
                    onValueChange={(v) => patchSimulador({ via: v as ViaInventario })}
                    disabled={locked}
                  >
                    <SelectTrigger className="form-card">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="extrajudicial">Extrajudicial</SelectItem>
                      <SelectItem value="judicial">Judicial</SelectItem>
                      <SelectItem value="litigio">Litígio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="field-label">Honorários (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={honorariosPct}
                    onChange={(e) =>
                      patchSimulador({ honorariosPct: parseFloat(e.target.value) || 0 })
                    }
                    className="form-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="field-label">Custas (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={custasPct}
                    onChange={(e) =>
                      patchSimulador({ custasPct: parseFloat(e.target.value) || 0 })
                    }
                    className="form-card"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="field-label">Dias até a abertura</Label>
                  <Input
                    type="number"
                    value={diasAteAbertura}
                    onChange={(e) =>
                      patchSimulador({ diasAteAbertura: parseInt(e.target.value, 10) || 0 })
                    }
                    className="form-card"
                  />
                </div>
              </div>

              <KpiGrid>
                <KpiCard label="Custo total" value={fmt(custoInv.total)} hint={pct(custoInv.percentualPatrimonio)} />
                <KpiCard label="Líquido aos herdeiros" value={fmt(custoInv.liquidoHerdeiros)} />
                <KpiCard label="Mito dos 20%" value={fmt(custoInv.mito20.valor)} />
                <KpiCard
                  label="Diferença vs. 20%"
                  value={fmt(custoInv.mito20.diferenca)}
                  hint="economia em relação ao mito"
                />
              </KpiGrid>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {[
                      ["ITCMD", custoInv.itcmd],
                      ["Multa por atraso", custoInv.multa],
                      ["Honorários", custoInv.honorarios],
                      ["Custas", custoInv.custas],
                      ["Total", custoInv.total],
                    ].map(([label, valor]) => (
                      <tr key={String(label)} className="border-b border-border/60">
                        <td className="py-2 text-muted-foreground">{label}</td>
                        <td className="py-2 text-right tabular-nums font-medium">{fmt(Number(valor))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Comparativo com os 20%</p>
                <div className="h-3 rounded-full bg-secondary overflow-hidden relative">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, barraCustoWidth)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Custo real {pct(custoInv.percentualPatrimonio)} da base · a barra cheia seria 20%
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className={`space-y-2 ${pointer ?? ""}`}>
                  <Label className="field-label">Custo de planejar em vida</Label>
                  <InputMoeda
                    value={custoPlanejarVida}
                    onChange={(v) => patchSimulador({ custoPlanejarVida: v })}
                    moeda={moeda === "USD" ? "USD" : "BRL"}
                    className="form-card"
                  />
                </div>
                <KpiCard
                  label="Diferença (inventário − planejar)"
                  value={fmt(economiaPlanejar)}
                  hint="custo do inventário menos o custo de planejar em vida"
                  valueColor={economiaPlanejar >= 0 ? "#1F6D3E" : "#B33A3A"}
                />
              </div>
              <MemoriaCalculo
                titulo="Memória de cálculo"
                linhas={[
                  { label: "ITCMD", valor: fmt(custoInv.itcmd) },
                  { label: "Multa", valor: fmt(custoInv.multa) },
                  { label: "Honorários", valor: fmt(custoInv.honorarios) },
                  { label: "Custas", valor: fmt(custoInv.custas) },
                ]}
              />
              <ul className="text-xs text-muted-foreground space-y-1">
                {getRegraItcmdUf(domicilioUF).pontosDeAtencao.map((p) => (
                  <li key={p}>· {domicilioUF}: {p}</li>
                ))}
              </ul>
              <RodapeSimulacao />
            </CardContent>
          </Card>

          <Card className="form-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-foreground">
                Impacto da reforma (LC 227/2026)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <KpiGrid>
                <KpiCard label="Base ajustada" value={fmt(reforma.baseAjustada)} />
                <KpiCard label="ITCMD hoje" value={fmt(reforma.impostoHoje)} hint={pct(reforma.aliquotaHoje)} />
                <KpiCard
                  label="Projeção (teto 8%)"
                  value={fmt(reforma.impostoProjecao)}
                  hint={pct(reforma.aliquotaProjecao)}
                />
                <KpiCard
                  label="Aumento potencial"
                  value={fmt(reforma.aumento)}
                  hint={pct(reforma.aumentoPct)}
                  valueColor="#B33A3A"
                />
              </KpiGrid>
              <MemoriaCalculo
                titulo="Composição da base e memória"
                linhas={[
                  { label: "Patrimônio filtrado", valor: fmt(reforma.patrimonio) },
                  { label: "Holding (×1,35)", valor: fmt(alocacaoReforma.holding) },
                  { label: "Imóveis (×1,15)", valor: fmt(alocacaoReforma.imoveis) },
                  { label: "Exterior (1,00)", valor: fmt(alocacaoReforma.exterior) },
                  { label: "Previdência (fora da base)", valor: fmt(alocacaoReforma.previdencia) },
                  { label: "Base ajustada", valor: fmt(reforma.baseAjustada) },
                  { label: "ITCMD hoje", valor: fmt(reforma.impostoHoje) },
                  { label: "Projeção teto 8%", valor: fmt(reforma.impostoProjecao) },
                  ...reforma.memoriaProjecao.map((m, i) => ({
                    label: `Faixa ${i + 1} (${pct(m.aliquota)})`,
                    valor: fmt(m.imposto),
                  })),
                ]}
              />
              <ul className="text-xs text-muted-foreground space-y-1">
                {getRegraItcmdUf(domicilioUF).pontosDeAtencao.map((p) => (
                  <li key={p}>· {domicilioUF}: {p}</li>
                ))}
              </ul>
              <RodapeSimulacao />
            </CardContent>
          </Card>

          <Card className="form-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-foreground">
                Parâmetros do Inventário
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${pointer ?? ""}`}>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">ITCMD</Label>
                  <div className="space-y-2">
                    <Select
                      value={itcmdModo}
                      onValueChange={(value) => {
                        const v = value as typeof itcmdModo
                        setItcmdModo(v)
                        if (v === "DF") return setSucessao({ itcmd: itcmdDFProgressivo })
                        if (v === "SP") return setSucessao({ itcmd: 4 })
                        if (v === "MG") return setSucessao({ itcmd: 5 })
                        if (v === "RJ") return setSucessao({ itcmd: 8 })
                        if (v === "RS") return setSucessao({ itcmd: 6 })
                      }}
                    >
                      <SelectTrigger className="form-card text-foreground focus:border-primary focus:ring-1 focus:ring-primary">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="form-card">
                        <SelectItem value="DF">DF — Progressivo (4% a 8%)</SelectItem>
                        <SelectItem value="SP">SP — 4%</SelectItem>
                        <SelectItem value="MG">MG — 5%</SelectItem>
                        <SelectItem value="RJ">RJ — 8%</SelectItem>
                        <SelectItem value="RS">RS — 6%</SelectItem>
                        <SelectItem value="OUTROS">Outros — inserir alíquota</SelectItem>
                      </SelectContent>
                    </Select>
                    {itcmdModo === "OUTROS" && (
                      <Input
                        type="number"
                        value={sucessao.itcmd || ""}
                        onChange={(e) => setSucessao({ itcmd: parseFloat(e.target.value) || 0 })}
                        className="form-card text-foreground"
                        placeholder="Ex: 4"
                      />
                    )}
                    {itcmdModo === "DF" && (
                      <p className="text-xs text-muted-foreground">
                        Alíquota calculada: {itcmdDFProgressivo}% por herdeiro (quinhão de {fmt(quinhaoPorHerdeiro)})
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Honorários Advocatícios (%)</Label>
                  <Input
                    type="number"
                    value={sucessao.honorarios || ""}
                    onChange={(e) => setSucessao({ honorarios: parseFloat(e.target.value) || 0 })}
                    className="form-card text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Custos Cartoriais (%)</Label>
                  <Input
                    type="number"
                    value={sucessao.cartoriais || ""}
                    onChange={(e) => setSucessao({ cartoriais: parseFloat(e.target.value) || 0 })}
                    className="form-card text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Número de Herdeiros</Label>
                  <Input
                    type="number"
                    value={sucessao.herdeiros || ""}
                    onChange={(e) => setSucessao({ herdeiros: parseInt(e.target.value) || 0 })}
                    className="form-card text-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="form-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-medium text-foreground">
                Prévia — Inventário sucessório
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-4 text-muted-foreground">
                <span>Patrimônio Total</span>
                <span className="font-medium text-foreground tabular-nums">{fmt(plInventario)}</span>
              </div>
              <div className="flex justify-between gap-4 text-muted-foreground">
                <span>Meação (cônjuge)</span>
                <span className="font-medium text-foreground tabular-nums">{fmt(inventario.meacao)}</span>
              </div>
              <div className="flex justify-between gap-4 text-muted-foreground">
                <span>Valor da herança (estimado)</span>
                <span className="font-medium text-foreground tabular-nums">{fmt(inventario.heranca)}</span>
              </div>
              <div className="flex justify-between gap-4 text-muted-foreground">
                <span>Custo total previsto (sobre a herança)</span>
                <span className="font-medium text-foreground tabular-nums">{fmt(inventario.custoTotal)}</span>
              </div>
            </CardContent>
          </Card>

          {!locked && (
          <Card className="form-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-foreground">
                Comparador de seguro de vida (MAG)
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Cotação integrada à API MAG quando configurada; caso contrário usa estimativa por faixa etária.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${pointer ?? ""}`}>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Produto</Label>
                  <Select value={produtoSelecionado} onValueChange={setProdutoSelecionado}>
                    <SelectTrigger className="form-card text-foreground">
                      <SelectValue placeholder="Selecione o produto" />
                    </SelectTrigger>
                    <SelectContent className="form-card max-h-72">
                      {opcoesProduto.map((p) => (
                        <SelectItem key={p.codigo} value={p.codigo}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Capital segurado</Label>
                  <InputMoeda
                    value={capitalSegurado}
                    onChange={(v) => setCapitalSegurado(Math.max(0, v))}
                    moeda={moeda === "USD" ? "USD" : "BRL"}
                    className="form-card text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Sexo (simulação)</Label>
                  <Select
                    value={
                      dadosPessoais.sexo === "M" || dadosPessoais.sexo === "F"
                        ? dadosPessoais.sexo
                        : "M"
                    }
                    onValueChange={(v) => setDadosPessoais({ sexo: v as "M" | "F" })}
                  >
                    <SelectTrigger className="form-card text-foreground">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="form-card">
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">UF</Label>
                  <Select
                    value={dadosPessoais.uf || "SP"}
                    onValueChange={(v) => setDadosPessoais({ uf: v })}
                  >
                    <SelectTrigger className="form-card text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="form-card max-h-60">
                      {UFS_BR.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <span className="text-sm text-muted-foreground">Prêmio mensal estimado</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {fontePremio === "mag_api" ? (
                      <Badge
                        variant="secondary"
                        className="border-transparent bg-blue-600 text-white hover:bg-blue-600"
                      >
                        Cotação MAG
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="border-transparent bg-zinc-600 text-zinc-100 hover:bg-zinc-600"
                      >
                        Estimativa
                      </Badge>
                    )}
                    {loadingPremio && (
                      <span className="text-xs text-muted-foreground">Calculando…</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
                  <p className="page-title text-[24px] tabular-nums text-foreground">
                    {premioMensal != null ? fmt(premioMensal) : "—"}
                    <span className="text-sm font-normal text-muted-foreground"> /mês</span>
                  </p>
                  {premioAnual != null && (
                    <p className="text-sm text-muted-foreground tabular-nums">
                      ~ {fmt(premioAnual)} /ano
                    </p>
                  )}
                </div>
                {!dadosPessoais.nascimento && produtoSelecionado && (
                  <p className="text-xs text-amber-600/90">
                    Informe a data de nascimento em Dados pessoais para habilitar a cotação MAG; enquanto isso, o valor é estimativa.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          )}
        </TabsContent>

        <TabsContent value="exterior" className="space-y-6">
          <div className="flex justify-end">
            <BotaoPdf abas={["exterior"]} label="Gerar relatório" />
          </div>
          <Card className="form-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium text-foreground">
                Estate tax — EUA (não residente)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${pointer ?? ""}`}>
                <div className="space-y-2">
                  <Label className="field-label">Bens com situs nos EUA</Label>
                  <InputMoeda
                    value={bensEuaUSD}
                    onChange={(v) => patchSimulador({ bensEuaUSD: v })}
                    moeda="USD"
                    className="form-card"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pré-preenchido com a soma dos ativos líquidos de localização internacional ({fmt(somaLiquidosIntl)}).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="field-label">Câmbio USD → BRL (opcional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={simulador.cambio || ""}
                    onChange={(e) =>
                      patchSimulador({ cambio: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="Ex.: 5,20"
                    className="form-card"
                  />
                </div>
              </div>
              <KpiGrid>
                <KpiCard label="Imposto (USD)" value={fmtUsd(estate.imposto)} />
                <KpiCard label="Alíquota efetiva" value={pct(estate.aliquotaEfetiva)} />
                <KpiCard label="Líquido USD" value={fmtUsd(estate.liquidoUSD)} />
                <KpiCard
                  label="Líquido BRL"
                  value={
                    estate.liquidoBRL != null
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                          maximumFractionDigits: 0,
                        }).format(estate.liquidoBRL)
                      : "—"
                  }
                  hint={cambio ? `câmbio ${cambio}` : "informe o câmbio"}
                />
              </KpiGrid>
              <MemoriaCalculo
                titulo="Memória faixa a faixa"
                linhas={[
                  { label: "Imposto tentativo", valor: fmtUsd(estate.impostoTentativo) },
                  { label: "Crédito do não residente", valor: fmtUsd(estate.credito) },
                  ...estate.memoria.map((m, i) => ({
                    label: `Faixa ${i + 1} (${pct(m.aliquota)}) sobre ${fmtUsd(m.baseNaFaixa)}`,
                    valor: fmtUsd(m.imposto),
                  })),
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Brasil e EUA não têm tratado contra bitributação de transmissão causa mortis. O crédito unificado do não
                residente é de US$ 13.000 (isenção equivalente a US$ 60.000).
              </p>
              <RodapeSimulacao />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holding" className="space-y-6">
          <ComparadorHolding
            gerandoPdf={gerandoPdf}
            onGerarRelatorio={() => void gerarRelatorio(["holding"])}
          />
        </TabsContent>

        <TabsContent value="roteiro">
          <div className="flex justify-end mb-4">
            <BotaoPdf abas={["roteiro"]} label="Gerar relatório" />
          </div>
          <SucessorioRoteiro locked={locked} />
        </TabsContent>

        <TabsContent value="documentos">
          <DocumentosSucessorios embedded />
        </TabsContent>
      </Tabs>

      <div className="nav-footer">
        <Button
          variant="ghost"
          className="btn-back"
          onClick={() => onNavigate("simulador-seguros")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={() => onNavigate("diagnostico-financeiro")} className="btn-next">
          Próximo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
