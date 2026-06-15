import type { ProjecaoAno } from "@/lib/engine"

/** Ponto simplificado para o ComposedChart de fluxo anual (6 séries + meta). */
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
  passivos: number
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
  passivosPorAno: number[]
}

/**
 * Séries: Rendimento, Aporte (entradas) | Objetivos, Passivos, Retirada (saídas) | metaRenda (linha).
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
    passivosPorAno,
  } = options

  const inf = inflacaoPct / 100
  const prazoAcumulacao = Math.max(0, idadeApos - idadeAtual)
  const metaAnual = rendaMensalMeta * 12

  return projecao.map((p, i) => {
    const t = Number(p.t) || 0
    const def = Math.pow(1 + inf, Math.max(0, t))
    const patrimonioNominal = Number(p.saldoNominal) || 0
    const patrimonioReal =
      Number(p.saldoReal) > 0 ? Number(p.saldoReal) : patrimonioNominal / def

    const isAposentado = i >= prazoAcumulacao
    const anosDesdeAposentadoria = Math.max(0, i - prazoAcumulacao)

    const scaleFluxoNominal = (v: number) =>
      displayMode === "nominal" ? v : v / def

    const rendimento = Math.round(
      Math.max(
        0,
        displayMode === "nominal"
          ? patrimonioNominal * taxaLiqAnual
          : patrimonioReal * taxaLiqAnual,
      ),
    )
    const aporte = !isAposentado ? Math.round(scaleFluxoNominal(aporteMensal * 12)) : 0
    const objetivosPos = objetivosPorAno[i] ?? 0
    const objetivos = -Math.round(scaleFluxoNominal(objetivosPos))
    const passivosPos = passivosPorAno[i] ?? 0
    const passivos = -Math.round(scaleFluxoNominal(passivosPos))

    let retiradaAno = 0
    let metaRenda = metaAnual
    if (isAposentado) {
      if (displayMode === "real") {
        // Poder de compra fixo em reais de hoje — não aplica IPCA
        retiradaAno = metaAnual
        metaRenda = metaAnual
      } else {
        // Valor nominal futuro cresce com IPCA a partir da aposentadoria
        const fatorIpca = Math.pow(1 + inf, anosDesdeAposentadoria)
        retiradaAno = metaAnual * fatorIpca
        metaRenda = retiradaAno
      }
    }
    const retirada = -Math.round(retiradaAno)

    const entradasTotal = rendimento + aporte
    const saidasTotal = Math.abs(objetivos) + Math.abs(passivos) + Math.abs(retirada)
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
      passivos,
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
    const t = Number(p.t) || 0
    const patrimonioAno = Number(p.saldoNominal) || 0
    const def = Math.pow(1 + inf, Math.max(0, t))
    const patrimonioReal =
      Number(p.saldoReal) > 0 ? Number(p.saldoReal) : patrimonioAno / def

    const rendaNominal = Math.round(Math.max(0, patrimonioAno * taxaMensalLiq))
    const rendaPoderCompra = Math.round(Math.max(0, rendaNominal / def))
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
