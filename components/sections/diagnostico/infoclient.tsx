"use client"

import { useMemo } from "react"
import { Printer, Shield, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CenarioSecaoBox } from "@/components/ui/cenario-secao-box"
import { KpiCard, KpiGrid } from "@/components/ui/kpi-card"
import { DonutComLegenda } from "@/components/charts/donut-com-legenda"
import { GraficoCapitalPorAno } from "@/components/charts/objetivos-charts"
import { usePlano, type Objetivo, type QuestionarioSucessorio } from "@/lib/plano-context"
import {
  CORES_GRUPOS_ATIVO,
  CORES_SUBCATEGORIA,
  SUBCATEGORIAS_LIQUIDO,
  calcularIndicadoresReservaEmergencia,
  formatValorMoeda,
  getSaldoDevedorPassivo,
  labelTipoAtivo,
  metaReservaEmergenciaMeses,
  normalizeAtivoTipo,
  resolveSubcategoriaLiquido,
  labelEmpresaParticipacao,
  percentualParticipacaoLabel,
} from "@/lib/patrimonio-utils"
import { getDespesas, despesaMensalAtual } from "@/lib/despesa-utils"
import { VOGA, VOGA_CHART_SCALE } from "@/lib/voga-tokens"

type PrazoGrupo = "curto" | "medio" | "longo"

const PRAZO_GRUPOS: { id: PrazoGrupo; titulo: string }[] = [
  { id: "curto", titulo: "Curto prazo · até 3 anos" },
  { id: "medio", titulo: "Médio prazo · 3 a 10 anos" },
  { id: "longo", titulo: "Longo prazo · acima de 10 anos" },
]

const PALETA_OBJETIVOS = [
  { fill: VOGA_CHART_SCALE[0], text: "var(--text-primary)" },
  { fill: VOGA_CHART_SCALE[1], text: "var(--text-primary)" },
  { fill: VOGA_CHART_SCALE[2], text: "var(--text-primary)" },
  { fill: VOGA_CHART_SCALE[3], text: VOGA.noite },
  { fill: VOGA_CHART_SCALE[4], text: VOGA.noite },
  { fill: VOGA_CHART_SCALE[5], text: "var(--text-primary)" },
] as const

function prazoGrupo(prazoAnos: number): PrazoGrupo {
  const p = Math.max(0, Number(prazoAnos) || 0)
  if (p <= 3) return "curto"
  if (p <= 10) return "medio"
  return "longo"
}

function anoAtual() {
  return new Date().getFullYear()
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
    const valor = Math.max(0, Number(o.valor) || 0)
    const prazoAnos = Math.max(0, Number(o.prazoAnos) || 0)
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

function CampoLeitura({ label, value }: { label: string; value?: string | number | null }) {
  const vazio = value == null || value === ""
  const texto = vazio ? "—" : typeof value === "number" ? String(value) : String(value)
  return (
    <div className="space-y-1 min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#5F85B8]">
        {label}
      </p>
      <p
        className={`text-sm font-semibold whitespace-pre-wrap break-words ${
          vazio ? "text-gray-400 font-normal" : "text-foreground"
        }`}
      >
        {texto}
      </p>
    </div>
  )
}

function BadgeResposta({ value }: { value?: string }) {
  if (!value) return <span className="text-sm text-gray-400">—</span>
  const v = value.toLowerCase()
  let cls = "bg-muted text-muted-foreground"
  if (v === "sim" || v.startsWith("sim,")) {
    cls = "bg-[#DFF0D1] text-[#1F6D3E]"
  } else if (v === "não" || v === "nao" || v === "não declara") {
    cls = "bg-muted text-muted-foreground"
  } else if (v.includes("andamento") || v.includes("potencial") || v === "média" || v === "media") {
    cls = "bg-[#FBF3CC] text-[#7A5C00]"
  } else if (v === "alta") {
    cls = "bg-[#F5E0E0] text-[#7A2828]"
  } else if (v === "baixa" || v === "nenhuma") {
    cls = "bg-muted text-muted-foreground"
  }
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {value}
    </span>
  )
}

const QUESTIONARIO_CAMPOS: { key: keyof QuestionarioSucessorio; label: string; badge?: boolean }[] = [
  { key: "modeloDeclaracaoIR", label: "Modelo de declaração de IR", badge: true },
  { key: "usoPGBL", label: "Uso atual ou potencial de PGBL", badge: true },
  { key: "bensNoExterior", label: "Bens no exterior", badge: true },
  { key: "planejamentoSucessorioRealizado", label: "Planejamento sucessório", badge: true },
  { key: "testamento", label: "Testamento", badge: true },
  { key: "holdingPatrimonialOuFamiliar", label: "Holding patrimonial ou familiar", badge: true },
  { key: "doacoesJaRealizadas", label: "Doações já realizadas", badge: true },
  { key: "usufruto", label: "Usufruto", badge: true },
  { key: "preocupacaoComInventario", label: "Preocupação com inventário", badge: true },
  { key: "preocupacaoComITCMD", label: "Preocupação com ITCMD", badge: true },
]

export function InfoClient() {
  const { state } = usePlano()
  const { dadosPessoais, ativos, passivos, objetivos, premissas, sucessao, patrimonio } = state
  const seguros = state.seguros ?? []
  const moeda = state.moeda ?? "BRL"
  const questionario = sucessao.questionario ?? {}

  const fmt = (v: number) => formatValorMoeda(v, moeda === "USD" ? "USD" : "BRL", 0)

  const despesas = useMemo(() => getDespesas(dadosPessoais), [dadosPessoais])
  const despesaMensal = useMemo(() => despesaMensalAtual(despesas), [despesas])

  const ativosLiquidos = patrimonio.ativosLiquidos
  const totalPrevidencia = patrimonio.previdencia
  const imobilizado = patrimonio.imobilizado
  const participacoes = patrimonio.participacoes
  const totalPassivos = patrimonio.passivos
  const patrimonioTotal = ativosLiquidos + totalPrevidencia + imobilizado + participacoes
  const patrimonioLiquido = patrimonioTotal - totalPassivos

  const quantidadeFilhos = dadosPessoais.filhos?.length ?? 0
  const metaReserva = metaReservaEmergenciaMeses(dadosPessoais.profissao ?? "", quantidadeFilhos)
  const { reservaEmergenciaMeses } = useMemo(
    () => calcularIndicadoresReservaEmergencia(ativos, despesaMensal, metaReserva),
    [ativos, despesaMensal, metaReserva],
  )

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

  const dataDonutClasses = useMemo(() => {
    const liquidos = ativos.filter(
      (a) =>
        normalizeAtivoTipo(a.tipo, a.descricao) === "ativo_liquido" &&
        (Number(a.valor) || 0) > 0,
    )
    const slices = []
    for (const sub of SUBCATEGORIAS_LIQUIDO) {
      const valor = liquidos
        .filter((a) => resolveSubcategoriaLiquido(a) === sub.value)
        .reduce((s, a) => s + (Number(a.valor) || 0), 0)
      if (valor <= 0) continue
      slices.push({
        name: sub.label,
        value: valor,
        fill: CORES_SUBCATEGORIA[sub.value] ?? "#5F85B8",
      })
    }
    return slices.sort((a, b) => b.value - a.value)
  }, [ativos])

  const corTipoAtivo = (tipo: string, descricao?: string) => {
    const slug = normalizeAtivoTipo(tipo, descricao)
    return CORES_GRUPOS_ATIVO[slug] ?? "#5F85B8"
  }

  const objetivosPorPrazo = useMemo(() => {
    const map: Record<PrazoGrupo, Objetivo[]> = { curto: [], medio: [], longo: [] }
    for (const o of objetivos) map[prazoGrupo(o.prazoAnos)].push(o)
    return map
  }, [objetivos])

  const prazoTotal = Math.max(0, Number(premissas.prazo) || 0)
  const capitalMap = useMemo(
    () => capitalPorAno(objetivos, prazoTotal),
    [objetivos, prazoTotal],
  )
  const capitalPorObjetivoMap = useMemo(
    () => capitalPorObjetivoPorAno(objetivos, prazoTotal),
    [objetivos, prazoTotal],
  )
  const coresPorObjetivoId = useMemo(() => {
    const result = new Map<string, { fill: string; text: string }>()
    objetivos.forEach((o, i) => {
      result.set(o.id, PALETA_OBJETIVOS[i % PALETA_OBJETIVOS.length])
    })
    return result
  }, [objetivos])

  const anosComCapital = useMemo(
    () => [...capitalMap.keys()].sort((a, b) => a - b),
    [capitalMap],
  )
  const anoInicio = anosComCapital[0] ?? anoAtual()
  const anoFim = anosComCapital[anosComCapital.length - 1] ?? anoInicio
  const anosVisiveis = useMemo(() => {
    const list: number[] = []
    for (let y = anoInicio; y <= Math.max(anoFim, anoInicio); y++) list.push(y)
    return list.length ? list : [anoAtual()]
  }, [anoInicio, anoFim])
  const maxCapitalPeriodo = useMemo(() => {
    let max = 0
    for (const v of capitalMap.values()) if (v > max) max = v
    return max
  }, [capitalMap])
  const rotuloStep = anosVisiveis.length > 12 ? 2 : 1

  const estadoCivilLabel: Record<string, string> = {
    casado: "Casado(a)",
    solteiro: "Solteiro(a)",
    divorciado: "Divorciado(a)",
    viuvo: "Viúvo(a)",
  }

  return (
    <div className="infoclient-print space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Diagnóstico</p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="page-title text-[24px] text-foreground">
            Info<span className="text-primary">Client</span>
          </h1>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="no-print shrink-0"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Visão consolidada somente leitura — útil antes de reuniões e para impressão.
        </p>
      </div>

      {/* Informações pessoais */}
      <CenarioSecaoBox title="Informações pessoais" className="print:break-inside-avoid print:shadow-none">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <CampoLeitura label="Nome" value={dadosPessoais.nome} />
          <CampoLeitura label="CPF" value={dadosPessoais.cpf} />
          <CampoLeitura label="Cônjuge" value={dadosPessoais.conjuge} />
          <CampoLeitura label="Profissão" value={dadosPessoais.profissao} />
          <CampoLeitura label="Nascimento" value={dadosPessoais.nascimento} />
          <CampoLeitura
            label="Estado civil"
            value={estadoCivilLabel[dadosPessoais.estadoCivil] ?? dadosPessoais.estadoCivil}
          />
          <CampoLeitura label="Regime de bens" value={dadosPessoais.regime} />
          <CampoLeitura
            label="Sexo"
            value={
              dadosPessoais.sexo === "F"
                ? "Feminino"
                : dadosPessoais.sexo === "M"
                  ? "Masculino"
                  : ""
            }
          />
          <CampoLeitura label="Nº de filhos" value={quantidadeFilhos} />
          <CampoLeitura label="Email" value={dadosPessoais.email} />
          <CampoLeitura label="Telefone" value={dadosPessoais.telefone} />
          <CampoLeitura label="Cidade" value={dadosPessoais.cidadeResidencia} />
          <CampoLeitura
            label="Estado"
            value={dadosPessoais.estadoResidencia || dadosPessoais.uf}
          />
          <CampoLeitura label="Nascimento do cônjuge" value={dadosPessoais.dataNascimentoConjuge} />
          <CampoLeitura label="Profissão do cônjuge" value={dadosPessoais.profissaoConjuge} />
          <div className="col-span-2 md:col-span-3">
            <CampoLeitura
              label="Dinâmica familiar"
              value={dadosPessoais.observacoesDinamicaFamiliar}
            />
          </div>
        </div>

        {quantidadeFilhos > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#5F85B8]">
              Filhos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {(dadosPessoais.filhos ?? []).map((f, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/50 bg-background px-3 py-2.5"
                >
                  <p className="text-sm font-medium text-foreground truncate">
                    {f.nome || `Filho ${i + 1}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {f.dataNascimento || "Data não informada"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CenarioSecaoBox>

      {/* Balanço patrimonial */}
      <CenarioSecaoBox title="Balanço patrimonial" className="print:break-inside-avoid print:shadow-none">
        <KpiGrid>
          <KpiCard
            label="Patrimônio líquido"
            value={fmt(patrimonioLiquido)}
            hint="Ativos − Passivos"
            valueColor="#1066DA"
            background="#FFFFFF"
          />
          <KpiCard
            label="Ativos totais"
            value={fmt(patrimonioTotal)}
            background="#FFFFFF"
          />
          <KpiCard
            label="Passivos totais"
            value={fmt(totalPassivos)}
            valueColor="#B33A3A"
            background="#FFFFFF"
          />
          <KpiCard
            label="Reserva emergência"
            value={despesaMensal > 0 ? `${reservaEmergenciaMeses.toFixed(1)} meses` : "—"}
            background="#FFFFFF"
          />
        </KpiGrid>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg bg-background p-4">
            <p className="text-[13px] font-medium text-[#393939] mb-3">
              Composição total de ativos
            </p>
            <DonutComLegenda data={dataDonutGrupos} formatCurrency={fmt} />
          </div>
          <div className="rounded-lg bg-background p-4">
            <p className="text-[13px] font-medium text-[#393939] mb-3">
              Composição por classe
            </p>
            <DonutComLegenda data={dataDonutClasses} formatCurrency={fmt} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-border/40 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.06em] text-[#5F85B8] border-b border-border/50">
                  <th className="px-3 py-2.5 font-medium">Tipo</th>
                  <th className="px-3 py-2.5 font-medium">Descrição</th>
                  <th className="px-3 py-2.5 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {ativos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-muted-foreground">
                      Nenhum ativo cadastrado
                    </td>
                  </tr>
                ) : (
                  ativos.map((a, i) => {
                    const cor = corTipoAtivo(a.tipo, a.descricao)
                    const isParticipacao =
                      normalizeAtivoTipo(a.tipo, a.descricao) === "participacao_societaria"
                    const tituloParticipacao = isParticipacao
                      ? labelEmpresaParticipacao(a.empresa)
                      : a.descricao || "—"
                    const detalheParticipacao = isParticipacao
                      ? [
                          a.descricao || null,
                          percentualParticipacaoLabel(a.percentualParticipacao),
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : ""
                    return (
                      <tr
                        key={a.id}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-3 py-2.5">
                          <span
                            className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold text-white"
                            style={{ background: cor }}
                          >
                            {labelTipoAtivo(a.tipo, a.descricao)}
                          </span>
                          {normalizeAtivoTipo(a.tipo, a.descricao) === "previdencia" &&
                          (a.tipoPlanoPrevidencia || a.regimeTributarioPrevidencia) ? (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {[a.tipoPlanoPrevidencia, a.regimeTributarioPrevidencia]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 text-foreground">
                          {isParticipacao ? (
                            <>
                              <div>{tituloParticipacao}</div>
                              {detalheParticipacao ? (
                                <div className="text-xs text-muted-foreground">{detalheParticipacao}</div>
                              ) : null}
                            </>
                          ) : (
                            tituloParticipacao
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium text-foreground">
                          {fmt(Number(a.valor) || 0)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#5F85B8] mb-2">
              Passivos
            </p>
            <div className="overflow-x-auto rounded-lg border border-border/40 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-[0.06em] text-[#5F85B8] border-b border-border/50">
                    <th className="px-3 py-2.5 font-medium">Categoria</th>
                    <th className="px-3 py-2.5 font-medium">Descrição</th>
                    <th className="px-3 py-2.5 font-medium text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {passivos.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-4 text-muted-foreground">
                        Nenhum passivo cadastrado
                      </td>
                    </tr>
                  ) : (
                    passivos.map((p, i) => (
                      <tr
                        key={p.id}
                        className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                      >
                        <td className="px-3 py-2.5 text-foreground">{p.categoria || "—"}</td>
                        <td className="px-3 py-2.5 text-foreground">{p.descricao || "—"}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-medium text-[#B33A3A]">
                          {fmt(getSaldoDevedorPassivo(p))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CenarioSecaoBox>

      {/* Objetivos */}
      <CenarioSecaoBox title="Objetivos por prazo" className="print:break-inside-avoid print:shadow-none">
        {objetivos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum objetivo cadastrado.</p>
        ) : (
          <div className="space-y-6">
            {anosVisiveis.length > 0 && maxCapitalPeriodo > 0 && (
              <div className="rounded-lg bg-background p-4">
                <p className="text-[13px] font-medium text-[#393939] mb-3">
                  Necessidade de capital por ano
                </p>
                <GraficoCapitalPorAno
                  anosVisiveis={anosVisiveis}
                  capitalMap={capitalMap}
                  capitalPorObjetivoMap={capitalPorObjetivoMap}
                  objetivos={objetivos}
                  coresPorObjetivoId={coresPorObjetivoId}
                  maxCapitalPeriodo={maxCapitalPeriodo}
                  rotuloStep={rotuloStep}
                  formatCurrency={fmt}
                />
              </div>
            )}

            {PRAZO_GRUPOS.map((g) => {
              const lista = objetivosPorPrazo[g.id]
              if (lista.length === 0) return null
              return (
                <div key={g.id} className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#5F85B8]">
                    {g.titulo}
                  </p>
                  <ul className="space-y-2">
                    {lista.map((o) => (
                      <li
                        key={o.id}
                        className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {o.descricao || "Objetivo"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {o.prazoAnos} {o.prazoAnos === 1 ? "ano" : "anos"}
                            {o.recorrente ? " · Recorrente" : ""}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                          {fmt(Number(o.valor) || 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        )}
      </CenarioSecaoBox>

      {/* Aposentadoria */}
      <CenarioSecaoBox title="Dados da aposentadoria" className="print:break-inside-avoid print:shadow-none">
        <KpiGrid>
          <KpiCard
            label="Idade de aposentadoria"
            value={String(premissas.idadeApos || "—")}
            background="#FFFFFF"
          />
          <KpiCard
            label="Retirada desejada"
            value={fmt(Number(premissas.retiradaMensal) || 0)}
            valueColor="#1066DA"
            background="#FFFFFF"
          />
          <KpiCard
            label="Renda mensal na aposentadoria"
            value={fmt(Number(premissas.rendaAposentadoria) || 0)}
            background="#FFFFFF"
          />
        </KpiGrid>
        {premissas.observacaoAposentadoria?.trim() ? (
          <div className="flex gap-3 rounded-lg border-l-[3px] border-l-[#1066DA] bg-[rgba(16,102,218,0.08)] px-4 py-3">
            <Info className="h-4 w-4 shrink-0 text-[#1066DA] mt-0.5" />
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#5F85B8]">
                Observações
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {premissas.observacaoAposentadoria}
              </p>
            </div>
          </div>
        ) : null}
      </CenarioSecaoBox>

      {/* Questionário sucessório */}
      <CenarioSecaoBox title="Questionário do sucessório" className="print:break-inside-avoid print:shadow-none">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {QUESTIONARIO_CAMPOS.map(({ key, label }) => (
            <div key={key} className="space-y-1.5 min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.06em] text-[#5F85B8]">
                {label}
              </p>
              <BadgeResposta value={questionario[key]} />
            </div>
          ))}
          <div className="md:col-span-2">
            <CampoLeitura
              label="Observações"
              value={questionario.observacoesSucessorio}
            />
          </div>
        </div>
      </CenarioSecaoBox>

      {/* Seguros */}
      <CenarioSecaoBox title="Seguros" className="print:break-inside-avoid print:shadow-none">
        {seguros.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum seguro cadastrado.</p>
        ) : (
          <ul className="space-y-2">
            {seguros.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Shield className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{s.tipoSeguro}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.beneficiario || "Beneficiário não informado"}
                    {s.observacao ? ` · ${s.observacao}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {fmt(Number(s.capitalSegurado) || 0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CenarioSecaoBox>
    </div>
  )
}
