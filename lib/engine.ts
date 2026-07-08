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
  /** Horizonte de aposentadoria em anos (quanto tempo o patrimônio precisa durar). Padrão 35. */
  horizonteAposentadoria?: number
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

  const resultado: ProjecaoAno[] = []
  let saldo = saldoInicial

  for (let t = 0; t <= prazo; t++) {
    const idade        = idadeAtual + t
    const fatorInf     = Math.pow(1 + inf, t)
    const isAposentado = idade >= idadeApos
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

    const saldoReal       = saldo / fatorInf
    // Renda mensal sustentável pela anuidade (mesmo método dos cards/gráficos) — taxa
    // real de Fisher e horizonte de aposentadoria; sem método de juros.
    const taxaReal = (1 + r) / (1 + inf) - 1
    const horizonteApos = Math.max(1, Number(premissas.horizonteAposentadoria) || 35)
    const rendaMensalReal = Math.max(0, pmtDeAnuidade(saldoReal, taxaReal, horizonteApos) / 12)

    resultado.push({
      t,
      idade,
      saldoNominal:    Math.round(saldo),
      saldoReal:       Math.round(saldoReal),
      rendaMensalReal: Math.round(rendaMensalReal),
      isAposentado,
    })
  }

  return resultado
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

export function calcularKPIs(
  projecao: ProjecaoAno[],
  premissas: Premissas,
  renda: number,
  despesa: number
): KPIs {
  const anoApos            = projecao.find(p => p.idade === premissas.idadeApos)
  const patrimonioApos     = anoApos?.saldoNominal || 0
  const patrimonioAposReal = anoApos?.saldoReal    || 0
  const rendaMensalReal    = premissas.retiradaMensal

  const r   = premissas.rendimento / 100
  const inf = premissas.inflacao   / 100
  // Independência financeira pela MESMA anuidade do Bloco 1 (sem taxa de retirada fixa):
  // taxa real de Fisher + patrimônio necessário = valor presente de `horizonte` anos de renda.
  const taxaReal             = (1 + r) / (1 + inf) - 1
  const horizonte            = Math.max(1, Number(premissas.horizonteAposentadoria) || 35)
  const patrimonioNecessario = pvAnuidade(Math.max(0, premissas.retiradaMensal) * 12, taxaReal, horizonte)

  let idadeLF: number | null = null
  for (const ano of projecao) {
    if ((Number(ano.saldoReal) || 0) >= patrimonioNecessario) {
      idadeLF = ano.idade
      break
    }
  }

  const taxaPoupanca = renda > 0 ? ((renda - despesa) / renda) * 100 : 0

  return {
    patrimonioApos,
    patrimonioAposReal,
    rendaMensalReal,
    idadeLF,
    taxaPoupanca: Math.round(taxaPoupanca),
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
