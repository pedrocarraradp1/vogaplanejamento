import type { FluxoAnualRow, ProjecaoAno } from "@/lib/engine"

/** Ponto pronto para o ComposedChart de fluxo (saídas já negativas). */
export interface DadoFluxoGrafico {
  idade: number
  t: number
  fase: string
  entradasTotal: number
  saidasTotal: number
  fluxoLiquido: number
  aporte: number
  rendimento: number
  previdencia: number
  inss: number
  complemento: number
  extra: number
  objetivos: number
  dividas: number
  retirada: number
  ir: number
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

export function buildDadosFluxoGrafico(
  projecao: ProjecaoAno[],
  fluxoAnual: FluxoAnualRow[],
  displayMode: "nominal" | "real",
  inflacaoPct: number
): DadoFluxoGrafico[] {
  const inf = inflacaoPct / 100

  return projecao.map((p, i) => {
    const row = fluxoAnual[i]
    const t = p.t
    const def = Math.pow(1 + inf, Math.max(0, t))
    const scale = (v: number) => (displayMode === "nominal" ? v : v / def)

    const aporte = scale(row?.aporte ?? 0)
    const rendimento = scale(row?.rendimento ?? 0)
    const previdencia = scale(row?.previdencia ?? 0)
    const inss = scale(row?.inss ?? 0)
    const complemento = scale(row?.complemento ?? 0)
    const extra = scale(row?.extra ?? 0)
    const objetivosPos = scale(row?.objetivos ?? 0)
    const dividasPos = scale(row?.dividas ?? 0)
    const retiradaPos = scale(row?.retirada ?? 0)
    const irPos = scale(row?.ir ?? 0)

    const entradasTotal = aporte + rendimento + previdencia + inss + complemento + extra
    const saidasTotal = objetivosPos + dividasPos + retiradaPos + irPos

    return {
      idade: p.idade,
      t,
      fase: row?.fase ?? (p.isAposentado ? "Aposentadoria" : "Acumulação"),
      entradasTotal,
      saidasTotal,
      fluxoLiquido: entradasTotal - saidasTotal,
      aporte,
      rendimento,
      previdencia,
      inss,
      complemento,
      extra,
      objetivos: -objetivosPos,
      dividas: -dividasPos,
      retirada: -retiradaPos,
      ir: -irPos,
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
