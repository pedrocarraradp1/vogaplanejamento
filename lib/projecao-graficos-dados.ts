import {
  encontrarRendaDeConsumoMensalReal,
  rendaMensalGeradaReal,
  type Objetivo,
  type Passivo,
  type Premissas,
  type ProjecaoAno,
} from "@/lib/engine"

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

/** Ponto pronto para o gráfico de renda da carteira (sempre em termos reais). */
export interface DadoRendaGrafico {
  idade: number
  t: number
  rendaGeradaReal: number
  rendaConsumoReal: number
  meta: number
  acimaMeta: boolean
}

export interface BuildDadosRendaOptions {
  taxaRealAnual: number
  taxaNominalAnual: number
  inflacaoAnual: number
  horizonteAnos: number
  /** Renda mensal desejada nas premissas (poder de compra de hoje). */
  metaMensal: number
  idadeAposentadoria: number
  saldoInicial: number
  objetivosEternosAnuais: number
  aliquotaIR: number
  fluxoAnual: Array<{ objetivos?: number; dividas?: number }>
  premissas: Premissas
  objetivos: Objetivo[]
  passivos: Passivo[]
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
  /** Aporte anual do motor (`calcularFluxoAnual`), alinhado ao `displayMode`. */
  aportePorAno?: number[]
  /** Retirada anual nominal do motor (`calcularFluxoAnual`), alinhada ao `displayMode`. */
  retiradaPorAno?: number[]
}

/** Filtra pontos do Fluxo Anual pelo intervalo de anos-calendário (De/até). */
export function filtrarDadosFluxoPorPeriodo(
  data: DadoFluxoGrafico[],
  anoBase: number,
  periodoInicioAno: number,
  periodoFimAno: number,
): DadoFluxoGrafico[] {
  const ini = Math.min(periodoInicioAno, periodoFimAno)
  const fim = Math.max(periodoInicioAno, periodoFimAno)
  return data.filter((d) => {
    const ano = anoBase + d.t
    return ano >= ini && ano <= fim
  })
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
    aportePorAno,
    retiradaPorAno,
  } = options

  const inf = inflacaoPct / 100
  const metaAnual = rendaMensalMeta * 12

  return projecao.map((p, i) => {
    const t = Number(p.t) || 0
    const def = Math.pow(1 + inf, Math.max(0, t))
    const prev = i > 0 ? projecao[i - 1] : null
    const defPrev = Math.pow(1 + inf, Math.max(0, prev ? Number(prev.t) || 0 : 0))

    const patrimonioNominal = Number(p.saldoNominal) || 0
    const patrimonioNominalPrev = prev ? Number(prev.saldoNominal) || 0 : patrimonioNominal

    const isAposentado = p.isAposentado

    const scaleFluxoNominal = (v: number) =>
      displayMode === "nominal" ? v : v / def

    // Base do gráfico de patrimônio (mesma da série "Simulação em tempo real").
    const patrimonioBase =
      displayMode === "nominal" ? patrimonioNominal : patrimonioNominal / def
    const patrimonioBasePrev =
      displayMode === "nominal" ? patrimonioNominalPrev : patrimonioNominalPrev / defPrev

    const aporteAnualBase = aportePorAno
      ? Number(aportePorAno[i]) || 0
      : !isAposentado
        ? aporteMensal * 12
        : 0
    const aporte = !isAposentado ? Math.round(scaleFluxoNominal(aporteAnualBase)) : 0
    const objetivosPos = objetivosPorAno[i] ?? 0
    const objetivos = -Math.round(scaleFluxoNominal(objetivosPos))
    const passivosPos = passivosPorAno[i] ?? 0
    const passivos = -Math.round(scaleFluxoNominal(passivosPos))

    const retiradaMotor = isAposentado ? Number(retiradaPorAno?.[i]) || 0 : 0
    const metaRenda = scaleFluxoNominal(isAposentado ? retiradaMotor : metaAnual)
    const retirada = isAposentado ? -Math.round(scaleFluxoNominal(Math.abs(retiradaMotor))) : 0

    // Fluxo líquido = variação do patrimônio no ano (mesma série do gráfico de patrimônio),
    // garantindo que patrimonio[t] - patrimonio[t-1] == fluxo líquido exibido.
    const fluxoLiquido = prev
      ? Math.round(patrimonioBase - patrimonioBasePrev)
      : Math.round(Math.max(0, patrimonioBase * taxaLiqAnual)) + aporte + objetivos + passivos + retirada

    // Rendimento é o resíduo que reconcilia a variação do patrimônio com os fluxos explícitos
    // (aporte, objetivos, passivos, retirada) — assim as barras empilhadas somam exatamente o fluxo líquido.
    const rendimento = fluxoLiquido - aporte - objetivos - passivos - retirada

    const entradasTotal = rendimento + aporte
    const saidasTotal = Math.abs(objetivos) + Math.abs(passivos) + Math.abs(retirada)

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

/**
 * Renda gerada (perpetuidade, varia com o patrimônio) e renda de consumo
 * (valor ÚNICO no início da aposentadoria — linha flat, igual ao KPI).
 */
export function buildDadosRendaGrafico(
  projecao: ProjecaoAno[],
  options: BuildDadosRendaOptions,
): DadoRendaGrafico[] {
  const {
    taxaRealAnual,
    taxaNominalAnual,
    inflacaoAnual,
    horizonteAnos,
    metaMensal,
    idadeAposentadoria,
    saldoInicial,
    objetivosEternosAnuais,
    aliquotaIR,
    fluxoAnual,
    premissas,
    objetivos,
    passivos,
  } = options

  const horizonteOriginal = Math.max(1, horizonteAnos)
  const meta = metaMensal

  const rendaConsumoMensalReal =
    idadeAposentadoria > 0
      ? Math.round(
          encontrarRendaDeConsumoMensalReal({
            premissas,
            objetivos,
            passivos,
            tolerancia: 1000,
          }),
        )
      : 0

  return projecao.map((p, i) => {
    const t = Number(p.t) || 0
    const prev = i > 0 ? projecao[i - 1] : null
    const deflatorInicio = Math.pow(1 + inflacaoAnual, Math.max(0, prev ? Number(prev.t) || 0 : 0))
    const saldoNominalInicio = prev ? Number(prev.saldoNominal) || 0 : saldoInicial
    const patrimonioRealInicio = saldoNominalInicio / deflatorInicio

    const fluxoAno = fluxoAnual[i]
    const deflator = Math.pow(1 + inflacaoAnual, Math.max(0, t))
    // Taxa já líquida; perpetuidade pura (objetivos/passivos saem no patrimônio, não aqui).
    const optsRendaGerada = {
      aliquotaIR: 0,
    }

    const rendaGeradaReal = Math.round(
      rendaMensalGeradaReal(
        patrimonioRealInicio,
        taxaNominalAnual,
        inflacaoAnual,
        optsRendaGerada,
      ),
    )

    return {
      idade: p.idade,
      t,
      rendaGeradaReal,
      rendaConsumoReal: rendaConsumoMensalReal,
      meta,
      acimaMeta: rendaGeradaReal >= meta && meta > 0,
    }
  })
}
