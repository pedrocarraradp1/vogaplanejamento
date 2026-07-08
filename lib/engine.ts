// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Premissas {
  saldoInicial: number       // ativos líquidos + previdência (sem passivos)
  aporteM: number            // calculado: renda - despesa
  /** Opcional: aporte mensal nominal por ano (t=0..prazo). Se presente, substitui `aporteM*(1+inf)^t`. */
  aportePorAnoNominal?: number[]
  rendimento: number         // ex: 9 para 9% a.a.
  inflacao: number           // ex: 4 para 4% a.a.
  idadeAtual: number         // calculado: data de nascimento → hoje
  prazo: number
  idadeApos: number
  retiradaMensal: number
  rendaAposentadoria: number // renda já existente na aposentadoria (INSS, aluguéis etc.)
  novaEntrada: number        // valor de entrada extra (herança, venda, etc.)
  idadeEntrada: number       // idade em que a entrada ocorre (0 = não usar)
  /** @deprecated Preferir `horizontePosAposentadoriaAnos` — derivar do prazo de simulação. */
  horizonteAposentadoria?: number
}

/**
 * Anos restantes do plano DEPOIS da aposentadoria, alinhados ao intervalo
 * real da simulação (`idadeAtual + prazo` = idade máxima desenhada nos gráficos).
 * Não usa mais o default fixo de 35 anos.
 */
export function horizontePosAposentadoriaAnos(premissas: {
  idadeAtual?: number
  idadeApos?: number
  prazo?: number
  horizonteAposentadoria?: number
}): number {
  const idadeAtual = Number(premissas.idadeAtual) || 0
  const idadeApos = Number(premissas.idadeApos) || 0
  const prazo = Number(premissas.prazo) || 0
  const idadeMaximaSimulacao = idadeAtual + prazo
  if (idadeApos > 0 && idadeMaximaSimulacao > idadeApos) {
    return Math.max(1, idadeMaximaSimulacao - idadeApos)
  }
  // Fallback legado (planos antigos sem prazo/idade coerentes).
  return Math.max(1, Number(premissas.horizonteAposentadoria) || 35)
}

// ─── Anuidade (fonte única para toda a tela de aposentadoria) ─────────────────

/** Valor presente de uma anuidade: patrimônio necessário para pagar `pmtAnual` por `n` anos. */
export function pvAnuidade(pmtAnual: number, r: number, n: number): number {
  if (r === 0) return pmtAnual * n
  return (pmtAnual * (1 - Math.pow(1 + r, -n))) / r
}

/** Pagamento anual sustentável a partir de um patrimônio `pv` por `n` anos. */
export function pmtDeAnuidade(pv: number, r: number, n: number): number {
  if (r === 0) return pv / n
  return (pv * r) / (1 - Math.pow(1 + r, -n))
}

/**
 * Horizonte de anuidade para renda sustentável em um dado ano.
 * Antes da aposentadoria: horizonte completo (hipótese "se parasse agora").
 * Depois: horizonte restante do plano já em andamento.
 */
export function horizonteRendaSustentavelAnos(
  idade: number,
  idadeAposentadoria: number,
  horizonteOriginal: number,
): number {
  const h = Math.max(1, horizonteOriginal)
  if (!idadeAposentadoria || idade < idadeAposentadoria) return h
  const anosDesdeAposentadoria = Math.max(0, idade - idadeAposentadoria)
  return Math.max(1, h - anosDesdeAposentadoria)
}

export interface RendaGeradaOptions {
  /** Objetivos anuais em poder de compra real do ano. */
  objetivosAnuaisReal?: number
  /** Dívidas anuais em poder de compra real do ano. */
  dividasAnuaisReal?: number
  /** Alíquota de IR sobre o rendimento (0–1). */
  aliquotaIR?: number
}

/**
 * Renda anual gerada (perpetuidade) em termos reais: rendimento real do ano
 * (Fisher) líquido de IR, menos objetivos/dívidas eternos — o que sobra é a
 * retirada que mantém o patrimônio REAL constante (fluxo líquido zero).
 */
export function rendaAnualGeradaReal(
  patrimonioRealInicio: number,
  taxaNominalAnual: number,
  inflacaoAnual: number,
  opts: RendaGeradaOptions = {},
): number {
  if (patrimonioRealInicio <= 0) return 0
  const r = Math.max(0, taxaNominalAnual)
  const inf = Math.max(0, inflacaoAnual)
  const aliq = Math.max(0, Math.min(1, opts.aliquotaIR ?? 0))
  const objetivos = Math.max(0, opts.objetivosAnuaisReal ?? 0)
  const dividas = Math.max(0, opts.dividasAnuaisReal ?? 0)

  const taxaReal = inf >= 0 && r >= 0 ? (1 + r) / (1 + inf) - 1 : 0
  const rendimentoRealAno = patrimonioRealInicio * Math.max(0, taxaReal)
  const rendimentoRealLiquido = rendimentoRealAno * (1 - aliq)

  return Math.max(0, rendimentoRealLiquido - objetivos - dividas)
}

/** Renda mensal gerada (perpetuidade) em termos reais. */
export function rendaMensalGeradaReal(
  patrimonioRealInicio: number,
  taxaNominalAnual: number,
  inflacaoAnual: number,
  opts: RendaGeradaOptions = {},
): number {
  return rendaAnualGeradaReal(patrimonioRealInicio, taxaNominalAnual, inflacaoAnual, opts) / 12
}

/** Renda mensal gerada em termos nominais (mesma perpetuidade, expressa no ano t). */
export function rendaMensalGeradaNominal(
  patrimonioNominalInicio: number,
  taxaNominalAnual: number,
  inflacaoAnual: number,
  fatorInflacaoAno: number,
  opts: RendaGeradaOptions = {},
): number {
  if (patrimonioNominalInicio <= 0 || fatorInflacaoAno <= 0) return 0
  const patrimonioRealInicio = patrimonioNominalInicio / fatorInflacaoAno
  const rendaRealMensal = rendaMensalGeradaReal(
    patrimonioRealInicio,
    taxaNominalAnual,
    inflacaoAnual,
    opts,
  )
  return rendaRealMensal * fatorInflacaoAno
}

export interface Objetivo {
  id: string
  descricao: string
  /** Ano (t) a partir de hoje em que o objetivo começa (0 = ano atual). */
  prazoAnos: number
  valor: number              // valor em R$ de hoje
  recorrente: boolean
  /** Repetir a cada X anos (apenas quando recorrente). */
  frequenciaAnos: number
  /** Janela de vigência da recorrência (a partir de `prazoAnos`). */
  duracaoTipo?: "total" | "personalizado"
  /** Quantos anos de vigência (apenas quando `duracaoTipo` = "personalizado"). */
  duracaoAnos?: number
}

/** Objetivo recorrente com vigência até o fim do horizonte (= eterno/contínuo no modelo). */
export function isObjetivoEterno(obj: Objetivo): boolean {
  if (!obj.recorrente || obj.valor <= 0) return false
  return (obj.duracaoTipo ?? "total") === "total"
}

/**
 * Converte um objetivo eterno (que se repete a cada N anos, para sempre) no
 * valor anual equivalente que precisa ser reservado, rendendo à taxa real,
 * para sustentar essa recorrência indefinidamente.
 * N=1 (todo ano) reduz para o próprio valor do objetivo, como esperado.
 */
export function custoAnualEquivalentePeriodico(
  valorObjetivo: number,
  taxaReal: number,
  intervaloAnos: number,
): number {
  const N = Math.max(1, intervaloAnos)
  if (valorObjetivo <= 0) return 0
  if (taxaReal === 0) return valorObjetivo / N
  return (valorObjetivo * taxaReal) / (Math.pow(1 + taxaReal, N) - 1)
}

/** Soma o custo anual equivalente de todos os objetivos recorrentes eternos. */
export function totalObjetivosEternosAnuais(objetivos: Objetivo[], taxaReal: number): number {
  return objetivos
    .filter(isObjetivoEterno)
    .reduce((soma, o) => {
      const intervalo = Math.max(1, Number(o.frequenciaAnos) || 1)
      return soma + custoAnualEquivalentePeriodico(o.valor, taxaReal, intervalo)
    }, 0)
}

export interface Passivo {
  id: string
  categoria?: string
  descricao: string
  saldoDevedor?: number
  parcelaMensal?: number
  taxaJurosMensal?: number
  prazoRestanteMeses?: number
  instituicao?: string
  bemVinculado?: string
  /** Legado */
  valor?: number
  prazo?: number
  taxa?: number
  tipo?: string
  modelo?: "SAC" | "PRICE" | "AMERICANA"
}

function saldoDevedorEngine(p: Passivo): number {
  const saldo = Number(p.saldoDevedor)
  if (saldo > 0) return saldo
  return Math.max(0, Number(p.valor) || 0)
}

function parcelaMensalEngine(p: Passivo): number {
  const parcela = Number(p.parcelaMensal)
  if (parcela > 0) return parcela
  const saldo = saldoDevedorEngine(p)
  return saldo > 0 ? saldo / 120 : 0
}

export interface ProjecaoAno {
  t: number
  idade: number
  saldoNominal: number
  saldoReal: number
  rendaMensalReal: number
  isAposentado: boolean
}

export interface KPIs {
  patrimonioApos: number
  patrimonioAposReal: number
  rendaMensalReal: number
  idadeLF: number | null
  taxaPoupanca: number
  /** Equivalente anual (real) reservado para objetivos recorrentes eternos. */
  objetivosEternosAnuais: number
  /** Renda anual desejada + objetivos eternos (real, poder de compra de hoje). */
  necessidadeAnualTotal: number
  /** Patrimônio necessário para LF (anuidade sobre necessidade total). */
  patrimonioNecessarioLF: number
}

export interface InventarioResult {
  /** Pool comum (após dívidas), regimes parcial/aquestos; útil para exibição. */
  patrimonioComum: number
  /** Soma dos bens com heranca === true (não inclui undefined; regimes parcial/aquestos). */
  patrimonioHeranca: number
  meacao: number
  heranca: number
  porHerdeiro: number
  custoITCMD: number
  custoHon: number
  custoCart: number
  custoTotal: number
  percentualCusto: number
}

export interface ProtecaoResult {
  capitalSeguravel: number
  necessidadeTotal: number
  custoVidaTotal: number
  comSeguroPatrimonio: number
  comSeguroRendaMensal: number
  comSeguroPatrimonioFinal: number
  semSeguroPatrimonio: number
  semSeguroRendaMensal: number
  semSeguroPatrimonioFinal: number
}

// ─── Helper: FV mensal ───────────────────────────────────────────────────────

/**
 * Replica VF do Excel para 12 aportes mensais iguais.
 * VF((1+r)^(1/12)-1; 12; -pmt; 0) = pmt × r / ((1+r)^(1/12) - 1)
 */
function fvMensal(pmt: number, r: number): number {
  const taxaMensal = Math.pow(1 + r, 1 / 12) - 1
  if (taxaMensal === 0) return pmt * 12
  return pmt * r / taxaMensal
}

/**
 * Total de objetivos que vencem no ano t, corrigidos pela inflação.
 * Não recorrente: SE(t = prazo; valor*(1+inf)^t; 0)
 * Recorrente:     SE(MOD(t - prazo; aCada) = 0; valor*(1+inf)^t; 0)
 */
function saqueObjetivosAno(t: number, objetivos: Objetivo[], inf: number, prazoTotal: number): number {
  let total = 0
  const fatorInf = Math.pow(1 + inf, t)
  for (const obj of objetivos) {
    if (obj.valor <= 0) continue
    if (!obj.recorrente) {
      if (t === (Number(obj.prazoAnos) || 0)) total += obj.valor * fatorInf
    } else {
      const prazoAnos = Number(obj.prazoAnos) || 0
      const freq = Number(obj.frequenciaAnos) || 0
      if (freq <= 0) continue
      if (t < prazoAnos) continue

      const duracaoTipo = obj.duracaoTipo ?? "total"
      const duracaoAnos = Number(obj.duracaoAnos) || 0
      const anoFimExclusive =
        duracaoTipo === "total"
          ? (Number(prazoTotal) || 0) + 1
          : prazoAnos + Math.max(0, duracaoAnos)

      if (t >= prazoAnos && t < anoFimExclusive) {
        if ((t - prazoAnos) % freq === 0) total += obj.valor * fatorInf
      }
    }
  }
  return total
}

// ─── Modelagem de Dívidas ─────────────────────────────────────────────────────

/**
 * Calcula a parcela no mês t para cada modelo de dívida.
 * Replica a fórmula da sheet Apoio do Excel Voga.
 * t = mês relativo ao início (0-indexed). Retorna 0 se t >= prazo.
 */
export function calcularParcelaDivida(passivo: Passivo, t: number): number {
  const parcelaInformada = parcelaMensalEngine(passivo)
  if (parcelaInformada > 0) {
    const prazoRest = Number(passivo.prazoRestanteMeses ?? passivo.prazo) || 0
    if (prazoRest > 0 && t >= prazoRest) return 0
    return parcelaInformada
  }

  const valor = saldoDevedorEngine(passivo)
  const prazo = Number(passivo.prazoRestanteMeses ?? passivo.prazo) || 0
  const taxa = Number(passivo.taxaJurosMensal ?? passivo.taxa) || 0
  const modelo = passivo.modelo ?? "SAC"
  const taxaDec = taxa / 100
  if (prazo <= 0 || t >= prazo) return 0

  if (modelo === "PRICE") {
    if (taxaDec === 0) return valor / prazo
    return valor * taxaDec / (1 - Math.pow(1 + taxaDec, -prazo))
  }
  if (modelo === "SAC") {
    const amortizacao  = valor / prazo
    const saldoDevedor = valor - amortizacao * t
    return amortizacao + saldoDevedor * taxaDec
  }
  if (modelo === "AMERICANA") {
    const juros = valor * taxaDec
    if (t === prazo - 1) return juros + valor
    return juros
  }
  return 0
}

function pagamentoDividaAno(passivo: Passivo, anoT: number): number {
  let total = 0
  for (let mes = anoT * 12; mes < (anoT + 1) * 12; mes++) {
    total += calcularParcelaDivida(passivo, mes)
  }
  return total
}

/**
 * Pagamento anual: parcelaMensal × 12 (prioridade) ou soma SAC/PRICE/estimativa.
 */
export function calcularPagamentoPassivosAno(passivo: Passivo, anoT: number): number {
  const parcela = parcelaMensalEngine(passivo)
  if (parcela > 0) {
    const prazoRest = Number(passivo.prazoRestanteMeses ?? passivo.prazo) || 0
    if (prazoRest > 0 && anoT * 12 >= prazoRest) return 0
    return parcela * 12
  }
  return pagamentoDividaAno(passivo, anoT)
}

/** Série anual (t = 0..numAnos) do pagamento de todos os passivos. */
export function calcularPassivosPorAnoSeries(
  passivos: Passivo[],
  numAnos: number
): number[] {
  const n = Math.max(0, numAnos)
  return Array.from({ length: n + 1 }, (_, t) =>
    passivos.reduce((s, p) => s + calcularPagamentoPassivosAno(p, t), 0)
  )
}

// ─── Projeção Patrimonial ─────────────────────────────────────────────────────

export type DisplayModeProjecao = "nominal" | "real"

/**
 * Retirada anual na aposentadoria — SEMPRE em poder de compra constante: o valor
 * mensal desejado cresce nominalmente com a inflação. A simulação de saldo é
 * única (uma só trajetória nominal); o modo "real" é apenas essa mesma série
 * deflacionada (`saldoReal = saldoNominal / (1+inf)^t`), com o mesmo formato de
 * curva. O parâmetro `displayMode` é mantido só por compatibilidade de assinatura
 * e não altera mais a trajetória — evita o bug em que o modo real eliminava a
 * fase de saque e o patrimônio parecia crescer indefinidamente.
 */
export function retiradaAnualAposentadoria(
  retiradaEfetivaMensal: number,
  t: number,
  inflacaoAnual: number,
  _displayMode: DisplayModeProjecao = "nominal",
): number {
  const base = Math.max(0, retiradaEfetivaMensal) * 12
  if (base === 0) return 0
  return base * Math.pow(1 + inflacaoAnual, Math.max(0, t))
}

/**
 * Replica exatamente as fórmulas das sheets de Apoio do Excel Voga.
 *
 * Ano 0:
 *   saldo = saldoInicial + fvMensal(aporteM, r) - objetivos_t0 - dividas_t0
 *
 * Acumulação t>0:
 *   saldo = saldo_prev*(1+r) + fvMensal(aporteM*(1+inf)^t, r) - objetivos_t - dividas_t
 *   + novaEntrada*(1+inf)^t  se idade == idadeEntrada
 *
 * Aposentadoria t>0 (simulação única):
 *   saldo = saldo_prev*(1+r) - retiradaM*12*(1+inf)^t
 *   (retirada com poder de compra constante — cresce com a inflação)
 *
 * Valor Real (apenas exibição, mesma série deflacionada):
 *   saldoReal = saldoNominal / (1+inf)^t
 */
export function calcularProjecao(
  premissas: Premissas,
  objetivos: Objetivo[],
  passivos: Passivo[] = [],
  displayMode: DisplayModeProjecao = "nominal",
): ProjecaoAno[] {
  const r   = premissas.rendimento / 100
  const inf = premissas.inflacao   / 100
  const {
    saldoInicial, aporteM, idadeAtual, prazo,
    idadeApos, retiradaMensal, rendaAposentadoria, novaEntrada, idadeEntrada,
  } = premissas
  const retiradaEfetiva = Math.max(0, retiradaMensal - (rendaAposentadoria || 0))

  const taxaReal = (1 + r) / (1 + inf) - 1
  const objetivosEternosEq = totalObjetivosEternosAnuais(objetivos, taxaReal)

  const resultado: ProjecaoAno[] = []
  let saldo = saldoInicial

  for (let t = 0; t <= prazo; t++) {
    const idade        = idadeAtual + t
    const fatorInf     = Math.pow(1 + inf, t)
    const isAposentado = idade >= idadeApos
    const saldoInicio  = saldo
    const objetivosAno = saqueObjetivosAno(t, objetivos, inf, prazo)
    const dividasAno   = passivos.reduce((s, p) => s + pagamentoDividaAno(p, t), 0)
    const aporteNominalAno =
      (premissas.aportePorAnoNominal?.[t] ?? null) !== null
        ? Number(premissas.aportePorAnoNominal?.[t]) || 0
        : aporteM * fatorInf

    // Nova entrada: soma corrigida pela inflação no ano em que a idade bate
    const entradaAno =
      novaEntrada > 0 && idadeEntrada > 0 && idade === idadeEntrada
        ? novaEntrada * fatorInf
        : 0

    if (t === 0) {
      saldo = saldoInicial + fvMensal(aporteNominalAno, r) - objetivosAno - dividasAno + entradaAno
    } else if (isAposentado) {
      const retiradaAno = retiradaAnualAposentadoria(retiradaEfetiva, t, inf, displayMode)
      // Objetivos e dívidas também consomem patrimônio na aposentadoria.
      saldo = saldo * (1 + r) - retiradaAno - objetivosAno - dividasAno + entradaAno
    } else {
      saldo = saldo * (1 + r) + fvMensal(aporteNominalAno, r) - objetivosAno - dividasAno + entradaAno
    }

    const saldoRealInicio = saldoInicio / fatorInf
    const saldoReal = saldo / fatorInf
    const rendaMensalReal = Math.round(
      rendaMensalGeradaReal(saldoRealInicio, r, inf, {
        objetivosAnuaisReal: objetivosEternosEq,
        dividasAnuaisReal: dividasAno / fatorInf,
      }),
    )

    resultado.push({
      t,
      idade,
      saldoNominal:    Math.round(saldo),
      saldoReal:       Math.round(saldoReal),
      rendaMensalReal,
      isAposentado,
    })
  }

  return resultado
}

/** Série anual de aporte nominal escalada (mesma forma da simulação principal). */
export function seriesAportePorEscala(premissas: Premissas, escala: number): number[] {
  const prazo = Math.max(0, Number(premissas.prazo) || 0)
  const inf = (Number(premissas.inflacao) || 0) / 100
  const k = Math.max(0, escala)
  const aporteM = Number(premissas.aporteM) || 0
  const base = premissas.aportePorAnoNominal
  const temSeriePositiva = base?.some((v) => (Number(v) || 0) > 0) ?? false

  if (temSeriePositiva && base && base.length > 0) {
    return Array.from({ length: prazo + 1 }, (_, t) => (Number(base[t]) || 0) * k)
  }
  if (aporteM > 0) {
    return Array.from({ length: prazo + 1 }, (_, t) => aporteM * k * Math.pow(1 + inf, t))
  }
  return Array.from({ length: prazo + 1 }, (_, t) => k * Math.pow(1 + inf, t))
}

/** Premissas com aporteM e aportePorAnoNominal escalados pelo mesmo fator. */
export function premissasComEscalaAporte(premissas: Premissas, escala: number): Premissas {
  const k = Math.max(0, escala)
  const aporteM = Number(premissas.aporteM) || 0
  const base = premissas.aportePorAnoNominal
  const temSeriePositiva = base?.some((v) => (Number(v) || 0) > 0) ?? false
  const serie = seriesAportePorEscala(premissas, k)
  const aporteMEquiv = aporteM > 0 || temSeriePositiva ? aporteM * k : k
  return {
    ...premissas,
    aporteM: aporteMEquiv,
    aportePorAnoNominal: serie,
  }
}

/** Drift de preservação: saldo real no fim − saldo real na aposentadoria (≈ 0 = patrimônio constante). */
export function driftPreservacaoComEscala(
  premissas: Premissas,
  objetivos: Objetivo[],
  passivos: Passivo[],
  escala: number,
): { drift: number; patrimonioNaAposentadoria: number; patrimonioNoFimDoHorizonte: number } {
  const idadeApos = Number(premissas.idadeApos) || 0
  const proj = calcularProjecao(
    premissasComEscalaAporte(premissas, escala),
    objetivos,
    passivos,
    "real",
  )
  const patrimonioNaAposentadoria =
    Number(proj.find((p) => p.idade === idadeApos)?.saldoReal) || 0
  const patrimonioNoFimDoHorizonte = Number(proj[proj.length - 1]?.saldoReal) || 0
  return {
    drift: patrimonioNoFimDoHorizonte - patrimonioNaAposentadoria,
    patrimonioNaAposentadoria,
    patrimonioNoFimDoHorizonte,
  }
}

/** Saldo REAL na idade de aposentadoria com escala sobre a série de aportes. */
export function saldoRealNaIdadeAposComEscala(
  premissas: Premissas,
  objetivos: Objetivo[],
  passivos: Passivo[],
  escala: number,
): number {
  const idadeApos = Number(premissas.idadeApos) || 0
  const proj = calcularProjecao(
    premissasComEscalaAporte(premissas, escala),
    objetivos,
    passivos,
    "real",
  )
  const ponto = proj.find((p) => p.idade === idadeApos)
  return ponto ? Number(ponto.saldoReal) || 0 : 0
}

/** Saldo REAL na idade de aposentadoria — escala derivada de aporteMensal / aporteM base. */
export function saldoRealNaIdadeApos(
  premissas: Premissas,
  objetivos: Objetivo[],
  passivos: Passivo[],
  aporteMensal: number,
): number {
  const baseM = Number(premissas.aporteM) || 0
  const escala = baseM > 0 ? Math.max(0, aporteMensal) / baseM : 0
  return saldoRealNaIdadeAposComEscala(premissas, objetivos, passivos, escala)
}

export interface ResultadoAporteNecessario {
  /** Fator sobre a série `aportePorAnoNominal` (1 = ritmo atual das fontes). */
  escala: number
  /** Equivalente mensal hoje para exibição: escala × aporteM (ou valor absoluto se aporte atual = 0). */
  aporteMensalEquivalente: number
  aportePorAnoNominal: number[]
  patrimonioNaAposentadoria: number
  patrimonioNoFimDoHorizonte: number
  /** Saldo fim − saldo na aposentadoria; ≈ 0 = preservação (fluxo-zero na retirada). */
  drift: number
}

function aporteMensalEquivalenteDaEscala(premissas: Premissas, escala: number): number {
  const aporteMBase = Number(premissas.aporteM) || 0
  const base = premissas.aportePorAnoNominal
  const temSeriePositiva = (base?.some((v) => (Number(v) || 0) > 0) ?? false)
  if (aporteMBase > 0 || temSeriePositiva) return aporteMBase * escala
  return escala
}

/**
 * Menor escala sobre `aportePorAnoNominal` que, na mesma `calcularProjecao` do gráfico
 * principal, deixa o patrimônio REAL praticamente constante na fase de retirada
 * (drift fim − aposentadoria ≈ 0) — mesmo critério de Preservação / fluxo-zero.
 */
export function encontrarAporteNecessario(
  params: {
    premissas: Premissas
    objetivos: Objetivo[]
    passivos?: Passivo[]
    tolerancia?: number
    maxIter?: number
  },
): ResultadoAporteNecessario {
  const {
    premissas,
    objetivos,
    passivos = [],
    tolerancia = 500,
    maxIter = 60,
  } = params

  const idadeAtual = Number(premissas.idadeAtual) || 0
  const idadeApos = Number(premissas.idadeApos) || 0
  const anosAteApos = idadeApos - idadeAtual
  const toleranciaDrift = tolerancia * Math.max(1, anosAteApos + 1)

  const build = (escala: number): ResultadoAporteNecessario => {
    const { drift, patrimonioNaAposentadoria, patrimonioNoFimDoHorizonte } =
      driftPreservacaoComEscala(premissas, objetivos, passivos, escala)
    return {
      escala,
      aporteMensalEquivalente: aporteMensalEquivalenteDaEscala(premissas, escala),
      aportePorAnoNominal: seriesAportePorEscala(premissas, escala),
      patrimonioNaAposentadoria,
      patrimonioNoFimDoHorizonte,
      drift,
    }
  }

  if (anosAteApos <= 0) return build(0)

  const driftEm = (escala: number) =>
    driftPreservacaoComEscala(premissas, objetivos, passivos, escala).drift

  const driftSemAporte = driftEm(0)
  if (Math.abs(driftSemAporte) < toleranciaDrift) return build(0)
  if (driftSemAporte > 0) return build(0)

  let baixo = 0
  let alto = 1

  if (driftEm(alto) < 0) {
    for (let i = 0; i < 40; i++) {
      if (driftEm(alto) >= 0) break
      alto *= 2
      if (alto > 100_000) break
    }
  }

  for (let i = 0; i < maxIter; i++) {
    const mid = (baixo + alto) / 2
    const drift = driftEm(mid)
    if (Math.abs(drift) < toleranciaDrift) return build(mid)
    if (drift < 0) baixo = mid
    else alto = mid
  }

  return build((baixo + alto) / 2)
}

export interface MonteCarloTrajetoriaAno {
  idade: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

export interface ResultadoMonteCarlo {
  probabilidadeSucesso: number
  patrimonioFinalMediana: number
  patrimonioFinalP10: number
  patrimonioFinalP90: number
  trajetorias: MonteCarloTrajetoriaAno[]
}

export const VOLATILIDADE_MONTE_CARLO_ANUAL = 0.15

function amostraNormal(media: number, desvioPadrao: number): number {
  const u1 = Math.max(Number.EPSILON, Math.random())
  const u2 = Math.max(Number.EPSILON, Math.random())
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return media + z0 * desvioPadrao
}

function percentilOrdenado(valoresOrdenados: number[], p: number): number {
  if (valoresOrdenados.length === 0) return 0
  const pos = ((p / 100) * (valoresOrdenados.length - 1))
  const base = Math.floor(pos)
  const resto = pos - base
  const atual = valoresOrdenados[base] ?? valoresOrdenados[valoresOrdenados.length - 1]
  const prox = valoresOrdenados[Math.min(base + 1, valoresOrdenados.length - 1)] ?? atual
  return atual + (prox - atual) * resto
}

/**
 * Monte Carlo da mesma simulação patrimonial:
 * reaproveita aportes, objetivos, passivos, entrada extra e retirada anual;
 * a única diferença é que a taxa anual deixa de ser fixa e passa a ser sorteada.
 */
export function rodarMonteCarlo(
  premissas: Premissas,
  objetivos: Objetivo[],
  passivos: Passivo[] = [],
  numSimulacoes = 1000,
  volatilidadeAnual = VOLATILIDADE_MONTE_CARLO_ANUAL,
): ResultadoMonteCarlo {
  const inf = premissas.inflacao / 100
  const retornoEsperado = premissas.rendimento / 100
  const {
    saldoInicial, aporteM, idadeAtual, prazo,
    idadeApos, retiradaMensal, rendaAposentadoria, novaEntrada, idadeEntrada,
  } = premissas
  const retiradaEfetiva = Math.max(0, retiradaMensal - (rendaAposentadoria || 0))
  const totalAnos = Math.max(0, prazo)
  const resultadosPorAno: number[][] = Array.from({ length: totalAnos + 1 }, () => [])
  const finais: number[] = []
  let sucessoCount = 0

  for (let sim = 0; sim < numSimulacoes; sim++) {
    let saldo = saldoInicial
    let sucesso = true

    for (let t = 0; t <= totalAnos; t++) {
      const retornoAno = amostraNormal(retornoEsperado, volatilidadeAnual)
      const idade = idadeAtual + t
      const fatorInf = Math.pow(1 + inf, t)
      const isAposentado = idade >= idadeApos
      const objetivosAno = saqueObjetivosAno(t, objetivos, inf, totalAnos)
      const dividasAno = passivos.reduce((s, p) => s + pagamentoDividaAno(p, t), 0)
      const aporteNominalAno =
        (premissas.aportePorAnoNominal?.[t] ?? null) !== null
          ? Number(premissas.aportePorAnoNominal?.[t]) || 0
          : aporteM * fatorInf
      const entradaAno =
        novaEntrada > 0 && idadeEntrada > 0 && idade === idadeEntrada
          ? novaEntrada * fatorInf
          : 0

      if (t === 0) {
        saldo = saldoInicial + fvMensal(aporteNominalAno, retornoAno) - objetivosAno - dividasAno + entradaAno
      } else if (isAposentado) {
        const retiradaAno = retiradaAnualAposentadoria(retiradaEfetiva, t, inf, "nominal")
        saldo = saldo * (1 + retornoAno) - retiradaAno - objetivosAno - dividasAno + entradaAno
      } else {
        saldo = saldo * (1 + retornoAno) + fvMensal(aporteNominalAno, retornoAno) - objetivosAno - dividasAno + entradaAno
      }

      const saldoReal = saldo / fatorInf
      resultadosPorAno[t].push(Math.round(saldoReal))
      if (saldoReal < 0) sucesso = false
    }

    const saldoFinal = resultadosPorAno[totalAnos][resultadosPorAno[totalAnos].length - 1] ?? 0
    finais.push(saldoFinal)
    if (sucesso) sucessoCount++
  }

  const finaisOrdenados = [...finais].sort((a, b) => a - b)
  const trajetorias = resultadosPorAno.map((valores, t) => {
    const ordenado = [...valores].sort((a, b) => a - b)
    return {
      idade: idadeAtual + t,
      p10: percentilOrdenado(ordenado, 10),
      p25: percentilOrdenado(ordenado, 25),
      p50: percentilOrdenado(ordenado, 50),
      p75: percentilOrdenado(ordenado, 75),
      p90: percentilOrdenado(ordenado, 90),
    }
  })

  return {
    probabilidadeSucesso: (sucessoCount / Math.max(1, numSimulacoes)) * 100,
    patrimonioFinalMediana: percentilOrdenado(finaisOrdenados, 50),
    patrimonioFinalP10: percentilOrdenado(finaisOrdenados, 10),
    patrimonioFinalP90: percentilOrdenado(finaisOrdenados, 90),
    trajetorias,
  }
}

/** Rendas de referência para as 3 estratégias de retirada (perpetuidade e anuidade). */
export function calcularRendasReferenciaEstrategia(
  patrimonioRealInicio: number,
  taxaNominalAnualPct: number,
  inflacaoAnualPct: number,
  horizonteAnos: number,
  idadeApos: number,
  objetivos: Objetivo[] = [],
  opts: RendaGeradaOptions = {},
): { rendaGeradaMensal: number; rendaSustentavelMensal: number; taxaReal: number } {
  const r = Math.max(0, taxaNominalAnualPct) / 100
  const inf = Math.max(0, inflacaoAnualPct) / 100
  const taxaReal = (1 + r) / (1 + inf) - 1
  const objEq = totalObjetivosEternosAnuais(objetivos, taxaReal)
  const horizonte = horizonteRendaSustentavelAnos(idadeApos, idadeApos, horizonteAnos)
  const rendaGeradaMensal = rendaMensalGeradaReal(patrimonioRealInicio, r, inf, {
    objetivosAnuaisReal: objEq,
    ...opts,
  })
  const rendaSustentavelMensal = pmtDeAnuidade(patrimonioRealInicio, taxaReal, horizonte) / 12
  return { rendaGeradaMensal, rendaSustentavelMensal, taxaReal }
}

/** Converte retirada do patrimônio (real) para o campo `retiradaMensal` das premissas. */
function retiradaMensalNasPremissas(retiradaPortfolioReal: number, premissas: Premissas): number {
  const rendaApos = Number(premissas.rendaAposentadoria) || 0
  return Math.max(0, retiradaPortfolioReal) + rendaApos
}

/** Patrimônio REAL imediatamente antes da 1ª retirada na aposentadoria. */
export function saldoRealInicioAposentadoria(
  proj: ProjecaoAno[],
  premissas: Premissas,
): number {
  const idadeApos = Number(premissas.idadeApos) || 0
  const idxApos = proj.findIndex((p) => p.idade === idadeApos)
  if (idxApos < 0) return 0
  if (idxApos > 0) return Number(proj[idxApos - 1].saldoReal) || 0
  return Number(proj[0]?.saldoReal) || Number(premissas.saldoInicial) || 0
}

/** Patrimônio REAL no último ano da simulação (`calcularProjecao`). */
export function saldoRealFinalHorizonte(
  premissas: Premissas,
  objetivos: Objetivo[],
  passivos: Passivo[],
  retiradaPortfolioReal: number,
): number {
  const proj = calcularProjecao(
    { ...premissas, retiradaMensal: retiradaMensalNasPremissas(retiradaPortfolioReal, premissas) },
    objetivos,
    passivos,
    "real",
  )
  return Number(proj[proj.length - 1]?.saldoReal) || 0
}

/**
 * Encontra (por busca binária) a retirada mensal REAL do patrimônio que, rodando
 * `calcularProjecao` com os mesmos fluxos da simulação principal, deixa o patrimônio
 * REAL no fim do horizonte ≈ patrimônio real no início da aposentadoria.
 */
export function encontrarRendaDePreservacaoMensalReal(
  params: {
    premissas: Premissas
    objetivos: Objetivo[]
    passivos?: Passivo[]
    tolerancia?: number
    maxIter?: number
  },
): number {
  const { premissas, objetivos, passivos = [], tolerancia = 1000, maxIter = 60 } = params

  const projBase = calcularProjecao(premissas, objetivos, passivos, "real")
  const P0 = saldoRealInicioAposentadoria(projBase, premissas)
  if (P0 <= 0) return 0

  const saldoFinal = (retiradaPortfolio: number) =>
    saldoRealFinalHorizonte(premissas, objetivos, passivos, retiradaPortfolio)

  let baixo = 0
  let alto = Math.max(1000, P0 / Math.max(1, horizontePosAposentadoriaAnos(premissas) * 12)) * 6

  for (let i = 0; i < 40; i++) {
    if (saldoFinal(alto) <= P0) break
    alto *= 2
    if (alto > P0 * 10) break
  }

  for (let i = 0; i < maxIter; i++) {
    const mid = (baixo + alto) / 2
    const s = saldoFinal(mid)
    if (Math.abs(s - P0) <= tolerancia) return mid
    if (s > P0) baixo = mid
    else alto = mid
  }

  const sBaixo = saldoFinal(baixo)
  if (Math.abs(sBaixo - P0) <= Math.abs(saldoFinal(alto) - P0)) return baixo
  return alto
}

/**
 * Encontra (por busca binária) a retirada mensal REAL do patrimônio que zera o
 * saldo REAL no fim do horizonte — mesma simulação completa de `calcularProjecao`.
 */
export function encontrarRendaDeConsumoMensalReal(
  params: {
    premissas: Premissas
    objetivos: Objetivo[]
    passivos?: Passivo[]
    tolerancia?: number
    maxIter?: number
  },
): number {
  const { premissas, objetivos, passivos = [], tolerancia = 1000, maxIter = 60 } = params

  const projBase = calcularProjecao(premissas, objetivos, passivos, "real")
  const P0 = saldoRealInicioAposentadoria(projBase, premissas)
  if (P0 <= 0) return 0

  const saldoFinal = (retiradaPortfolio: number) =>
    saldoRealFinalHorizonte(premissas, objetivos, passivos, retiradaPortfolio)

  let baixo = 0
  let alto = Math.max(1000, P0 / Math.max(1, horizontePosAposentadoriaAnos(premissas) * 12)) * 6

  for (let i = 0; i < 40; i++) {
    if (saldoFinal(alto) <= 0) break
    alto *= 2
    if (alto > P0 * 10) break
  }

  for (let i = 0; i < maxIter; i++) {
    const mid = (baixo + alto) / 2
    const s = saldoFinal(mid)
    if (Math.abs(s) <= tolerancia) return mid
    if (s > 0) baixo = mid
    else alto = mid
  }

  const sBaixo = saldoFinal(baixo)
  if (sBaixo >= 0) return baixo
  return alto
}

/**
 * Série pós-aposentadoria para as 3 estratégias — fonte única: `calcularProjecao`
 * com apenas a retirada mensal do patrimônio variando.
 */
export function projecaoEstrategiaRetirada(
  params: {
    premissas: Premissas
    objetivos: Objetivo[]
    passivos?: Passivo[]
    retiradaMensalReal: number
    displayMode?: DisplayModeProjecao
  },
): ProjecaoAno[] {
  const {
    premissas,
    objetivos,
    passivos = [],
    retiradaMensalReal,
    displayMode = "real",
  } = params

  const idadeApos = Number(premissas.idadeApos) || 0
  const proj = calcularProjecao(
    {
      ...premissas,
      retiradaMensal: retiradaMensalNasPremissas(retiradaMensalReal, premissas),
    },
    objetivos,
    passivos,
    displayMode,
  )
  return proj.filter((p) => p.idade >= idadeApos)
}

// ─── Fluxo anual (gráficos de projeção) ───────────────────────────────────────

export interface FluxoAnualRow {
  t: number
  idade: number
  fase: "Acumulação" | "Aposentadoria"
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
  entradasTotal: number
  saidasTotal: number
  fluxoLiquido: number
}

/**
 * Detalha entradas e saídas ano a ano, alinhado à lógica de `calcularProjecao`.
 */
export function calcularFluxoAnual(
  premissas: Premissas,
  objetivos: Objetivo[],
  passivos: Passivo[] = [],
  aliquotaIR = 0.15,
  displayMode: DisplayModeProjecao = "nominal",
): FluxoAnualRow[] {
  const r   = premissas.rendimento / 100
  const inf = premissas.inflacao   / 100
  const {
    saldoInicial, aporteM, idadeAtual, prazo,
    idadeApos, retiradaMensal, rendaAposentadoria, novaEntrada, idadeEntrada,
  } = premissas
  const retiradaEfetiva = Math.max(0, retiradaMensal - (rendaAposentadoria || 0))
  const aliq = Math.max(0, Math.min(1, aliquotaIR))

  const rows: FluxoAnualRow[] = []
  let saldo = saldoInicial

  for (let t = 0; t <= prazo; t++) {
    const idade        = idadeAtual + t
    const fatorInf     = Math.pow(1 + inf, t)
    const isAposentado = idade >= idadeApos
    const saldoInicio  = saldo

    const objetivosAno = saqueObjetivosAno(t, objetivos, inf, prazo)
    const dividasAno   = passivos.reduce((s, p) => s + pagamentoDividaAno(p, t), 0)
    const aporteNominalAno =
      (premissas.aportePorAnoNominal?.[t] ?? null) !== null
        ? Number(premissas.aportePorAnoNominal?.[t]) || 0
        : aporteM * fatorInf
    const entradaAno =
      novaEntrada > 0 && idadeEntrada > 0 && idade === idadeEntrada
        ? novaEntrada * fatorInf
        : 0

    const aporte = isAposentado ? 0 : fvMensal(aporteNominalAno, r)
    const rendimento = t > 0 && saldoInicio > 0 ? saldoInicio * r : 0
    const previdencia = 0
    const inss = isAposentado ? (rendaAposentadoria || 0) * 12 * fatorInf : 0
    const complemento = 0
    const extra = entradaAno
    const objetivosVal = objetivosAno
    const dividasVal = dividasAno
    const retirada = isAposentado
      ? retiradaAnualAposentadoria(retiradaEfetiva, t, inf, displayMode)
      : 0
    const ir = rendimento * aliq

    const entradasTotal = aporte + rendimento + previdencia + inss + complemento + extra
    const saidasTotal = objetivosVal + dividasVal + retirada + ir
    const fluxoLiquido = entradasTotal - saidasTotal

    rows.push({
      t,
      idade,
      fase: isAposentado ? "Aposentadoria" : "Acumulação",
      aporte,
      rendimento,
      previdencia,
      inss,
      complemento,
      extra,
      objetivos: objetivosVal,
      dividas: dividasVal,
      retirada,
      ir,
      entradasTotal,
      saidasTotal,
      fluxoLiquido,
    })

    if (t === 0) {
      saldo = saldoInicial + aporte - objetivosVal - dividasVal + extra
    } else if (isAposentado) {
      // Objetivos e dívidas também consomem patrimônio na aposentadoria.
      saldo = saldo * (1 + r) - retirada - objetivosVal - dividasVal + extra
    } else {
      saldo = saldo * (1 + r) + aporte - objetivosVal - dividasVal + extra
    }
  }

  return rows
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

/**
 * Liberdade financeira (perpetuidade / fluxo-zero): primeira idade em que o
 * rendimento REAL anual do patrimônio cobre a necessidade anual (renda desejada
 * + objetivos eternos equivalentes), sem consumir o principal.
 *
 * Fonte única para o KPI "Liberdade Financeira" e a linha "Independência
 * Financeira" da tabela de cenários.
 */
export function encontrarIdadeLiberdadeFinanceira(
  projecao: ProjecaoAno[],
  rendimentoLiquidoPct: number,
  inflacaoPct: number,
  retiradaMensalDesejada: number,
  objetivos: Objetivo[] = [],
): number | null {
  const r = (Number(rendimentoLiquidoPct) || 0) / 100
  const inf = (Number(inflacaoPct) || 0) / 100
  const taxaReal = (1 + r) / (1 + inf) - 1
  const objetivosEternosAnuais = totalObjetivosEternosAnuais(objetivos, taxaReal)
  const necessidadeAnualTotal =
    Math.max(0, Number(retiradaMensalDesejada) || 0) * 12 + objetivosEternosAnuais

  for (const ano of projecao) {
    const patrimonioReal = Number(ano.saldoReal) || 0
    const rendimentoRealAno = patrimonioReal * taxaReal
    if (rendimentoRealAno >= necessidadeAnualTotal) {
      return ano.idade
    }
  }
  return null
}

export function calcularKPIs(
  projecao: ProjecaoAno[],
  premissas: Premissas,
  renda: number,
  despesa: number,
  objetivos: Objetivo[] = [],
): KPIs {
  const anoApos            = projecao.find(p => p.idade === premissas.idadeApos)
  const patrimonioApos     = anoApos?.saldoNominal || 0
  const patrimonioAposReal = anoApos?.saldoReal    || 0
  const rendaMensalReal    = premissas.retiradaMensal

  const r   = premissas.rendimento / 100
  const inf = premissas.inflacao   / 100
  const taxaReal             = (1 + r) / (1 + inf) - 1
  const horizonte            = horizontePosAposentadoriaAnos(premissas)
  const objetivosEternosAnuais = totalObjetivosEternosAnuais(objetivos, taxaReal)
  const rendaAnualDesejada = Math.max(0, premissas.retiradaMensal) * 12
  const necessidadeAnualTotal = rendaAnualDesejada + objetivosEternosAnuais
  const patrimonioNecessario = pvAnuidade(necessidadeAnualTotal, taxaReal, horizonte)

  const idadeLF = encontrarIdadeLiberdadeFinanceira(
    projecao,
    premissas.rendimento,
    premissas.inflacao,
    premissas.retiradaMensal,
    objetivos,
  )

  const taxaPoupanca = renda > 0 ? ((renda - despesa) / renda) * 100 : 0

  return {
    patrimonioApos,
    patrimonioAposReal,
    rendaMensalReal,
    idadeLF,
    taxaPoupanca: Math.round(taxaPoupanca),
    objetivosEternosAnuais,
    necessidadeAnualTotal,
    patrimonioNecessarioLF: patrimonioNecessario,
  }
}

// ─── Inventário Sucessório ────────────────────────────────────────────────────

/** Compatível com `Ativo` do plano (usa valor e heranca). */
export interface Ativo {
  valor: number
  heranca?: boolean
}

export function calcularInventario(
  pl: number,
  regime: string,
  herdeiros: number,
  itcmd: number,
  honorarios: number,
  cartoriais: number,
  ativos: Ativo[] = [],
  totalPassivos = 0
): InventarioResult {
  const isParcialOuAquestos =
    regime === "Comunhão Parcial de Bens" ||
    regime === "Participação Final nos Aquestos"
  const isUniversal = regime === "Comunhão Universal de Bens"
  const isSeparacao = regime === "Separação Total de Bens"

  let meacao: number
  let herancaVal: number
  let patrimonioComumOut = 0
  let patrimonioHerancaOut = 0

  if (isParcialOuAquestos) {
    // heranca !== true: inclui false e undefined (ativos antigos sem campo → patrimônio comum)
    const somaNaoHeranca = ativos
      .filter((a) => a.heranca !== true)
      .reduce((s, a) => s + Math.max(0, Number(a.valor) || 0), 0)
    const somaHerancaBens = ativos
      .filter((a) => a.heranca === true)
      .reduce((s, a) => s + Math.max(0, Number(a.valor) || 0), 0)
    const somaAtivosTotal = somaNaoHeranca + somaHerancaBens
    const usarPl =
      ativos.length === 0 || somaAtivosTotal === 0

    if (usarPl) {
      meacao = pl / 2
      herancaVal = pl / 2
      patrimonioComumOut = pl / 2
      patrimonioHerancaOut = pl / 2
    } else {
      const patrimonioComum = Math.max(0, somaNaoHeranca - totalPassivos)
      patrimonioComumOut = patrimonioComum
      patrimonioHerancaOut = somaHerancaBens
      meacao = patrimonioComum / 2
      herancaVal = patrimonioComum / 2 + somaHerancaBens
    }
  } else if (isUniversal) {
    meacao = pl / 2
    herancaVal = pl / 2
    patrimonioComumOut = pl / 2
    patrimonioHerancaOut = pl / 2
  } else if (isSeparacao) {
    meacao = 0
    herancaVal = pl
    patrimonioComumOut = 0
    patrimonioHerancaOut = pl
  } else {
    const temMeacao =
      regime === "Comunhão Universal de Bens" ||
      regime === "Comunhão Parcial de Bens" ||
      regime === "Participação Final nos Aquestos"
    meacao = temMeacao ? pl * 0.5 : 0
    herancaVal = pl - meacao
    patrimonioComumOut = temMeacao ? pl * 0.5 : 0
    patrimonioHerancaOut = herancaVal
  }

  const porHerdeiro = herdeiros > 0 ? herancaVal / herdeiros : herancaVal

  const custoITCMD = herancaVal * (itcmd / 100)
  const custoHon = herancaVal * (honorarios / 100)
  const custoCart = herancaVal * (cartoriais / 100)
  const custoTotal = custoITCMD + custoHon + custoCart

  const plPct = pl > 0 ? pl : 0

  return {
    patrimonioComum: Math.round(patrimonioComumOut),
    patrimonioHeranca: Math.round(patrimonioHerancaOut),
    meacao: Math.round(meacao),
    heranca: Math.round(herancaVal),
    porHerdeiro: Math.round(porHerdeiro),
    custoITCMD: Math.round(custoITCMD),
    custoHon: Math.round(custoHon),
    custoCart: Math.round(custoCart),
    custoTotal: Math.round(custoTotal),
    percentualCusto:
      Math.round((plPct > 0 ? (custoTotal / plPct) * 100 : 0) * 10) / 10,
  }
}

// ─── Proteção Financeira ──────────────────────────────────────────────────────

export function calcularProtecao(
  custoVidaMensal: number,
  anosCobertura: number,
  educacaoFilhos: number,
  dividasPendentes: number,
  patrimonioAtual: number,
  rendimentoAnual: number
): ProtecaoResult {
  const custoVidaTotal   = custoVidaMensal * 12 * anosCobertura
  const necessidadeTotal = custoVidaTotal + educacaoFilhos + dividasPendentes
  const capitalSeguravel = Math.max(0, necessidadeTotal - patrimonioAtual)
  const taxa = rendimentoAnual / 100

  return {
    capitalSeguravel,
    necessidadeTotal,
    custoVidaTotal,
    comSeguroPatrimonio:      patrimonioAtual + capitalSeguravel,
    comSeguroRendaMensal:     Math.round((patrimonioAtual + capitalSeguravel) * taxa / 12),
    comSeguroPatrimonioFinal: 0,
    semSeguroPatrimonio:      patrimonioAtual,
    semSeguroRendaMensal:     Math.round(patrimonioAtual * taxa / 12),
    semSeguroPatrimonioFinal: Math.round(patrimonioAtual - necessidadeTotal),
  }
}
