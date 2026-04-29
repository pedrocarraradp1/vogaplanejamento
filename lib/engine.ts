// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Premissas {
  saldoInicial: number       // calculado: ativos - passivos
  aporteM: number            // calculado: renda - despesa
  rendimento: number         // ex: 9 para 9% a.a.
  inflacao: number           // ex: 4 para 4% a.a.
  idadeAtual: number         // calculado: data de nascimento → hoje
  prazo: number
  idadeApos: number
  retiradaMensal: number
  rendaAposentadoria: number // renda já existente na aposentadoria (INSS, aluguéis etc.)
  novaEntrada: number        // valor de entrada extra (herança, venda, etc.)
  idadeEntrada: number       // idade em que a entrada ocorre (0 = não usar)
}

export interface Objetivo {
  id: string
  descricao: string
  prazo: number              // anos a partir de hoje (0 = ano atual)
  valor: number              // valor em R$ de hoje
  recorrente: boolean
  aCada: number
}

export interface Passivo {
  id: string
  descricao: string
  valor: number              // valor original do financiamento
  prazo: number              // prazo em meses
  taxa: number               // taxa mensal em % ex: 1.5 para 1.5% a.m.
  modelo: "SAC" | "PRICE" | "AMERICANA"
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
function saqueObjetivosAno(t: number, objetivos: Objetivo[], inf: number): number {
  let total = 0
  const fatorInf = Math.pow(1 + inf, t)
  for (const obj of objetivos) {
    if (obj.valor <= 0) continue
    if (!obj.recorrente) {
      if (t === obj.prazo) total += obj.valor * fatorInf
    } else {
      if (obj.aCada > 0 && (t - obj.prazo) % obj.aCada === 0) {
        total += obj.valor * fatorInf
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
  const { valor, prazo, taxa, modelo } = passivo
  const taxaDec = taxa / 100
  if (t >= prazo) return 0

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

// ─── Projeção Patrimonial ─────────────────────────────────────────────────────

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
 * Aposentadoria t>0:
 *   saldo = saldo_prev*(1+r) - retiradaM*12*(1+inf)^t
 *
 * Valor Real:
 *   saldoReal = saldoNominal / (1+inf)^t
 */
export function calcularProjecao(
  premissas: Premissas,
  objetivos: Objetivo[],
  passivos: Passivo[] = []
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
    const objetivosAno = saqueObjetivosAno(t, objetivos, inf)
    const dividasAno   = passivos.reduce((s, p) => s + pagamentoDividaAno(p, t), 0)

    // Nova entrada: soma corrigida pela inflação no ano em que a idade bate
    const entradaAno =
      novaEntrada > 0 && idadeEntrada > 0 && idade === idadeEntrada
        ? novaEntrada * fatorInf
        : 0

    if (t === 0) {
      saldo = saldoInicial + fvMensal(aporteM, r) - objetivosAno - dividasAno + entradaAno
    } else if (isAposentado) {
      saldo = saldo * (1 + r) - retiradaEfetiva * 12 * fatorInf + entradaAno
    } else {
      saldo = saldo * (1 + r) + fvMensal(aporteM * fatorInf, r) - objetivosAno - dividasAno + entradaAno
    }

    const saldoReal       = saldo / fatorInf
    const taxaReal        = r - inf
    const rendaMensalReal = isAposentado
      ? retiradaEfetiva
      : Math.max(0, saldoReal * taxaReal / 12)

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
  const taxaReal             = r - inf
  const retiradaEfetiva      = Math.max(0, premissas.retiradaMensal - (premissas.rendaAposentadoria || 0))
  const retiradaAnual        = retiradaEfetiva * 12
  const patrimonioNecessario = taxaReal > 0 ? retiradaAnual / taxaReal : Infinity

  let idadeLF: number | null = null
  for (const ano of projecao) {
    if (!ano.isAposentado && ano.saldoReal >= patrimonioNecessario) {
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
