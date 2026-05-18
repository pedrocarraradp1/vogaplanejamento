import type { ProjecaoAno } from "@/lib/engine"

/** Ponto simplificado para o ComposedChart de fluxo anual (5 séries). */
export interface DadoFluxoGrafico {
  idade: number
  t: number
  fase: string
  entradasTotal: number
  saidasTotal: number
  fluxoLiquido: number
  rendimento: number
  aporte: number
  objetivos: number
  retirada: number
  metaRenda: number
}

/** Ponto pronto para o gráfico de renda da carteira. */
export interface DadoRendaGrafico {
  idade: number
  t: number
  rendaNominal: number
  rendaPoderCompra: number
  rendaReal: number
  meta: number
  acimaMeta: boolean
}

export interface BuildDadosFluxoOptions {
  taxaLiqAnual: number
  aporteMensal: number
  idadeAtual: number
  idadeApos: number
  rendaMensalMeta: number
  displayMode: "nominal" | "real"
  inflacaoPct: number
  objetivosPorAno: number[]
}

/**
 * Séries: Rendimento, Aporte Mensal (entradas) | Objetivos, Retirada (saídas) | metaRenda (linha).
 */
export function buildDadosFluxoGrafico(
  projecao: ProjecaoAno[],
  options: BuildDadosFluxoOptions
): DadoFluxoGrafico[] {
  const {
    taxaLiqAnual,
    aporteMensal,
    idadeAtual,
    idadeApos,
    rendaMensalMeta,
    displayMode,
    inflacaoPct,
    objetivosPorAno,
  } = options

  const inf = inflacaoPct / 100
  const prazoAcumulacao = Math.max(0, idadeApos - idadeAtual)
  const metaAnual = rendaMensalMeta * 12

  return projecao.map((p, i) => {
    const t = p.t
    const def = Math.pow(1 + inf, Math.max(0, t))
    const scale = (v: number) => (displayMode === "nominal" ? v : v / def)

    const patrimonio = Number(p.saldoNominal) || 0
    const rendimento = Math.round(scale(patrimonio * taxaLiqAnual))
    const aporte = i < prazoAcumulacao ? Math.round(scale(aporteMensal * 12)) : 0
    const objetivosPos = objetivosPorAno[i] ?? 0
    const objetivos = -Math.round(scale(objetivosPos))
    const retirada = i >= prazoAcumulacao ? -Math.round(scale(metaAnual)) : 0
    const metaRenda = metaAnual

    const entradasTotal = rendimento + aporte
    const saidasTotal = Math.abs(objetivos) + Math.abs(retirada)
    const fluxoLiquido = entradasTotal - saidasTotal

    return {
      idade: p.idade,
      t,
      fase: p.isAposentado ? "Aposentadoria" : "Acumulação",
      entradasTotal,
      saidasTotal,
      fluxoLiquido,
      rendimento,
      aporte,
      objetivos,
      retirada,
      metaRenda,
    }
  })
}

export function buildDadosRendaGrafico(
  projecao: ProjecaoAno[],
  taxaMensalLiq: number,
  taxaRealMensal: number,
  metaMensal: number,
  inflacaoPct: number,
  displayMode: "nominal" | "real"
): DadoRendaGrafico[] {
  const inf = inflacaoPct / 100

  return projecao.map((p) => {
    const t = p.t
    const patrimonioAno = Number(p.saldoNominal) || 0
    const def = Math.pow(1 + inf, Math.max(0, t))
    const patrimonioReal = patrimonioAno / def

    const rendaNominal = Math.round(Math.max(0, patrimonioAno * taxaMensalLiq))
    const rendaPoderCompra = Math.round(
      Math.max(0, (patrimonioAno * taxaMensalLiq) / def)
    )
    const rendaReal = Math.round(Math.max(0, patrimonioReal * taxaRealMensal))

    const metaNominal = metaMensal * def
    const meta = displayMode === "nominal" ? metaNominal : metaMensal
    const rendaComparar = displayMode === "nominal" ? rendaNominal : rendaReal

    return {
      idade: p.idade,
      t,
      rendaNominal,
      rendaPoderCompra,
      rendaReal,
      meta,
      acimaMeta: rendaComparar >= meta && meta > 0,
    }
  })
}
