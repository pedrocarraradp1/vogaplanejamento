import type { RelatorioA4Input, RelatorioSecaoA4 } from "@/lib/pdf/tipos-relatorio"
import type { Parecer } from "./consultoria"
import type { ComparadorHolding } from "./holding"
import type { VisaoSucessorio } from "./visao"

function brl(n: number, moeda: "BRL" | "USD" = "BRL") {
  return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: moeda,
    maximumFractionDigits: 0,
  }).format(n)
}

function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n)
}

function pct(n: number) {
  return `${(n * 100).toFixed(2).replace(".", ",")}%`
}

const FRENTE: Record<string, string> = {
  sucessorio: "Sucessório",
  juridico: "Jurídico",
  fiscal: "Fiscal",
  internacional: "Internacional",
}
const NIVEL = { baixo: "Baixo", medio: "Médio", alto: "Alto" } as const

export type AbaRelatorioSucessorio =
  | "diagnostico"
  | "itcmd"
  | "exterior"
  | "roteiro"
  | "holding"
  | "consultoria"

export function secaoConsultoria(p: Parecer, texto: string, moeda: "BRL" | "USD" = "BRL"): RelatorioSecaoA4 {
  const top = p.recomendacao.ranqueadas[0]
  return {
    titulo: "Consultoria sucessória e fiscal",
    kpis: [
      { label: "Score de exposição", valor: String(Math.round(p.diagnostico.score)), hint: p.diagnostico.nivel },
      { label: "ITCMD / inventário", valor: brl(p.simulacoes.inventario.total, moeda) },
      { label: "Recomendação", valor: top?.nome ?? "—" },
      { label: "Economia estimada", valor: brl(top?.economia ?? 0, moeda) },
    ],
    paragrafos: texto.split(/\n\n+/).filter(Boolean),
    pontos: p.diagnostico.riscos.slice(0, 6).map((r) => `${r.titulo} (${brl(r.impactoReais, moeda)})`),
  }
}

export function secaoHolding(r: ComparadorHolding, moeda: "BRL" | "USD" = "BRL"): RelatorioSecaoA4 {
  const y1 = r.anos[0]
  const payback = r.paybackDentro
    ? `${r.paybackAnos} anos e ${r.paybackMeses} meses`
    : "Além do horizonte"
  return {
    titulo: "Holding patrimonial vs. pessoa física",
    kpis: [
      { label: "Veredito", valor: r.veredito.frase },
      { label: "Carga PF (1º ano)", valor: brl(y1?.pfCarga ?? 0, moeda) },
      { label: "Carga holding (1º ano)", valor: brl(y1?.holdingCarga ?? 0, moeda) },
      { label: "Economia 1º ano", valor: brl(y1?.economia ?? 0, moeda) },
      { label: "Economia acumulada", valor: brl(r.economiaAnos, moeda) },
      { label: "VPL", valor: brl(r.vpl, moeda), hint: payback },
    ],
    tabela: {
      colunas: ["Ano", "PF", "Holding", "Economia", "Acumulada"],
      linhas: r.anos.map((a) => [
        String(a.ano) + (a.cbsAtivo ? (a.ibsFator >= 1 ? " · IBS" : " · CBS") : ""),
        brl(a.pfCarga, moeda),
        brl(a.holdingCarga, moeda),
        brl(a.economia, moeda),
        brl(a.economiaAcumulada, moeda),
      ]),
    },
    memoria: [
      { label: "ITBI de entrada", valor: brl(r.entrada.itbi, moeda) },
      { label: "Ganho de capital", valor: brl(r.entrada.ganhoCapital, moeda) },
      { label: "Abertura", valor: brl(r.entrada.abertura, moeda) },
      { label: "Inventário hoje", valor: brl(r.sucessao.inventario.total, moeda) },
      { label: "ITCMD doação (usufruto)", valor: brl(r.sucessao.doacao.imposto, moeda) },
      { label: "ITCMD doação (reforma)", valor: brl(r.sucessao.doacao.impostoReforma, moeda) },
      { label: "Custo da estrutura no período", valor: brl(r.sucessao.custoEstruturaPeriodo, moeda) },
    ],
    pontos: [...r.veredito.motivos, ...r.pontosAtencao],
  }
}

export function secaoDiagnostico(v: VisaoSucessorio): RelatorioSecaoA4 {
  const d = v.diagnostico
  return {
    titulo: "Diagnóstico sucessório",
    kpis: (["sucessorio", "juridico", "fiscal", "internacional"] as const).map((f) => ({
      label: FRENTE[f],
      valor: `${Math.round((d.porFrente[f].pontos / 5) * 100)}%`,
      hint: `${NIVEL[d.porFrente[f].nivel]} · ${d.porFrente[f].pontos} de 5`,
    })),
    paragrafos: [
      `Pergunta de abertura: ${d.perguntaAbertura}`,
      `Próximo passo: ${d.proximoPasso}`,
    ],
    memoria: (["sucessorio", "juridico", "fiscal", "internacional"] as const).map((f) => ({
      label: FRENTE[f],
      valor: `${d.porFrente[f].pontos}/5 · ${NIVEL[d.porFrente[f].nivel]}`,
    })),
    pontos: d.sinais.filter((s) => s.ativo).map((s) => `${s.titulo} (${s.etiqueta})`),
  }
}

export function secaoItcmd(v: VisaoSucessorio, moeda: "BRL" | "USD" = "BRL"): RelatorioSecaoA4 {
  return {
    titulo: "ITCMD e inventário",
    kpis: [
      { label: "ITCMD total", valor: brl(v.espolio.imposto, moeda) },
      { label: "Alíquota consolidada", valor: pct(v.espolio.aliquotaConsolidada) },
      { label: "Custo total do inventário", valor: brl(v.custoInv.total, moeda) },
      { label: "Aumento potencial (reforma)", valor: brl(v.reforma.aumento, moeda) },
      { label: "Economia vs. planejar em vida", valor: brl(v.economiaPlanejar, moeda) },
      { label: "Líquido aos herdeiros", valor: brl(v.custoInv.liquidoHerdeiros, moeda) },
    ],
    tabela: {
      colunas: ["Estado", "Base", "Imposto", "Alíquota"],
      linhas: v.espolio.porEstado.map((e) => [
        e.uf,
        brl(e.base, moeda),
        brl(e.imposto, moeda),
        pct(e.aliquotaEfetiva),
      ]),
    },
    memoria: [
      { label: "ITCMD", valor: brl(v.custoInv.itcmd, moeda) },
      { label: "Multa", valor: brl(v.custoInv.multa, moeda) },
      { label: "Honorários", valor: brl(v.custoInv.honorarios, moeda) },
      { label: "Custas", valor: brl(v.custoInv.custas, moeda) },
      { label: "ITCMD hoje (reforma)", valor: brl(v.reforma.impostoHoje, moeda) },
      { label: "Projeção teto 8%", valor: brl(v.reforma.impostoProjecao, moeda) },
      ...v.espolio.porEstado.flatMap((e) =>
        e.detalhe.memoria.map((m, i) => ({
          label: `${e.uf} faixa ${i + 1} (${pct(m.aliquota)})`,
          valor: brl(m.imposto, moeda),
        })),
      ),
    ],
    pontos: v.pontosAtencao,
  }
}

export function secaoExterior(v: VisaoSucessorio): RelatorioSecaoA4 {
  return {
    titulo: "Estate tax — EUA",
    kpis: [
      { label: "Bens com situs nos EUA", valor: usd(v.bensEuaUSD) },
      { label: "Imposto (USD)", valor: usd(v.estate.imposto) },
      { label: "Alíquota efetiva", valor: pct(v.estate.aliquotaEfetiva) },
      { label: "Líquido USD", valor: usd(v.estate.liquidoUSD) },
    ],
    memoria: [
      { label: "Imposto tentativo", valor: usd(v.estate.impostoTentativo) },
      { label: "Crédito do não residente", valor: usd(v.estate.credito) },
      ...v.estate.memoria.map((m, i) => ({
        label: `Faixa ${i + 1} (${pct(m.aliquota)})`,
        valor: usd(m.imposto),
      })),
    ],
    pontos: [
      "Brasil e EUA não têm tratado contra bitributação de transmissão causa mortis.",
      "O crédito unificado do não residente é de US$ 13.000 (isenção equivalente a US$ 60.000).",
    ],
  }
}

export function secaoRoteiro(v: VisaoSucessorio): RelatorioSecaoA4 {
  return {
    titulo: "Roteiro de execução",
    kpis: v.progressoRoteiros.slice(0, 4).map((r) => ({
      label: r.label,
      valor: `${r.progresso.total.feitos}/${r.progresso.total.total}`,
      hint: `${r.progresso.documentos.feitos} docs · ${r.progresso.etapas.feitos} etapas`,
    })),
    tabela: {
      colunas: ["Tipo", "Documentos", "Etapas", "Conferências", "Total"],
      linhas: v.progressoRoteiros.map((r) => [
        r.label,
        `${r.progresso.documentos.feitos}/${r.progresso.documentos.total}`,
        `${r.progresso.etapas.feitos}/${r.progresso.etapas.total}`,
        `${r.progresso.conferencias.feitos}/${r.progresso.conferencias.total}`,
        `${r.progresso.total.feitos}/${r.progresso.total.total}`,
      ]),
    },
    pontos: v.progressoRoteiros
      .filter((r) => r.progresso.total.feitos < r.progresso.total.total)
      .map(
        (r) =>
          `${r.label}: ${r.progresso.total.total - r.progresso.total.feitos} pendências`,
      ),
  }
}

export function montarRelatorioSucessorio(opts: {
  visao: VisaoSucessorio
  abas: AbaRelatorioSucessorio[]
  cliente: string
  assessor: string
  moeda?: "BRL" | "USD"
  holding?: ComparadorHolding | null
  parecerConsultoria?: Parecer | null
  textoConsultoria?: string
}): RelatorioA4Input {
  const moeda = opts.moeda ?? "BRL"
  const holdingSecao = opts.holding
    ? secaoHolding(opts.holding, moeda)
    : {
        titulo: "Holding patrimonial vs. pessoa física",
        paragrafos: ["Sem simulação de holding neste relatório."],
      }
  const consultoriaSecao = opts.parecerConsultoria
    ? secaoConsultoria(opts.parecerConsultoria, opts.textoConsultoria || "", moeda)
    : {
        titulo: "Consultoria sucessória e fiscal",
        paragrafos: ["Consultoria ainda não gerada."],
      }
  const mapa: Record<AbaRelatorioSucessorio, RelatorioSecaoA4> = {
    diagnostico: secaoDiagnostico(opts.visao),
    itcmd: secaoItcmd(opts.visao, moeda),
    exterior: secaoExterior(opts.visao),
    roteiro: secaoRoteiro(opts.visao),
    holding: holdingSecao,
    consultoria: consultoriaSecao,
  }
  const secoes = opts.abas.map((a) => mapa[a])
  const completo = opts.abas.length > 1
  return {
    titulo: completo ? "Relatório completo — planejamento sucessório" : secoes[0]?.titulo ?? "Relatório",
    cliente: opts.cliente,
    assessor: opts.assessor,
    data: new Intl.DateTimeFormat("pt-BR").format(new Date()),
    secoes,
    capa: opts.abas.length === 1 && opts.abas[0] === "consultoria",
  }
}
