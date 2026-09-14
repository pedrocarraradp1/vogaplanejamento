import { criarEntradaCapital, type EntradaCapital } from "@/lib/entradas-capitais"
import {
  calcularProjecao,
  encontrarAporteNecessario,
  encontrarIdadeLiberdadeFinanceira,
  patrimonioPerpetuidade,
  rendaMensalGeradaNominal,
  rendaMensalGeradaReal,
  type Premissas,
  type ProjecaoAno,
} from "@/lib/engine"
import {
  aplicarRentabilidadeDoCenario,
  taxaRealDeBruto,
} from "@/lib/rentabilidade-utils"

export type ModoProjecaoLivre = "padrao" | "tempo-renda" | "aporte-necessario"

/** Mesmas taxas-padrão da aba Cenários (bruto % a.a.). */
export const TAXAS_CENARIOS_PROJECAO_LIVRE = {
  conservador: 7,
  moderado: 10,
  arrojado: 13,
} as const

export interface ProjecaoLivreState {
  modo: ModoProjecaoLivre
  saldoInicial: number
  aporteMensal: number
  aporteExtraAnual: number
  prazo: number
  taxaRendimento: number
  inflacao: number
  idadeAtual: number
  idadeApos: number
  rendaMensalDesejada: number
  novaEntradaValor: number
  novaEntradaIdade: number
  tempoDesejado: number
}

export const defaultProjecaoLivre: ProjecaoLivreState = {
  modo: "padrao",
  saldoInicial: 0,
  aporteMensal: 0,
  aporteExtraAnual: 0,
  prazo: 30,
  taxaRendimento: 10,
  inflacao: 4,
  idadeAtual: 40,
  idadeApos: 65,
  rendaMensalDesejada: 0,
  novaEntradaValor: 0,
  novaEntradaIdade: 0,
  tempoDesejado: 20,
}

function n(value: unknown, fallback = 0): number {
  const v = Number(value)
  return Number.isFinite(v) ? v : fallback
}

export function hidratarProjecaoLivre(raw: unknown): ProjecaoLivreState {
  const r = raw && typeof raw === "object" ? (raw as Partial<ProjecaoLivreState>) : {}
  const modo: ModoProjecaoLivre =
    r.modo === "tempo-renda" || r.modo === "aporte-necessario" ? r.modo : "padrao"
  return {
    ...defaultProjecaoLivre,
    ...r,
    modo,
    saldoInicial: Math.max(0, n(r.saldoInicial, defaultProjecaoLivre.saldoInicial)),
    aporteMensal: Math.max(0, n(r.aporteMensal, defaultProjecaoLivre.aporteMensal)),
    aporteExtraAnual: Math.max(0, n(r.aporteExtraAnual, defaultProjecaoLivre.aporteExtraAnual)),
    prazo: Math.max(0, n(r.prazo, defaultProjecaoLivre.prazo)),
    taxaRendimento: Math.max(0, n(r.taxaRendimento, defaultProjecaoLivre.taxaRendimento)),
    inflacao: Math.max(0, n(r.inflacao, defaultProjecaoLivre.inflacao)),
    idadeAtual: Math.max(0, n(r.idadeAtual, defaultProjecaoLivre.idadeAtual)),
    idadeApos: Math.max(0, n(r.idadeApos, defaultProjecaoLivre.idadeApos)),
    rendaMensalDesejada: Math.max(0, n(r.rendaMensalDesejada, defaultProjecaoLivre.rendaMensalDesejada)),
    novaEntradaValor: Math.max(0, n(r.novaEntradaValor, defaultProjecaoLivre.novaEntradaValor)),
    novaEntradaIdade: Math.max(0, n(r.novaEntradaIdade, defaultProjecaoLivre.novaEntradaIdade)),
    tempoDesejado: Math.max(0, n(r.tempoDesejado, defaultProjecaoLivre.tempoDesejado)),
  }
}

function idadeFimAcumulacao(s: ProjecaoLivreState, idadeApos: number, prazo: number): number {
  const tetoPrazo = s.idadeAtual + prazo
  if (idadeApos > s.idadeAtual) return Math.min(tetoPrazo, idadeApos - 1)
  return tetoPrazo
}

/** Aporte extra anual (fim de cada ano de acumulação) + nova entrada pontual — via entradasCapitais. */
export function montarEntradasProjecaoLivre(
  s: ProjecaoLivreState,
  opts?: { prazo?: number; idadeApos?: number },
): EntradaCapital[] {
  const prazo = opts?.prazo ?? s.prazo
  const idadeApos = opts?.idadeApos ?? s.idadeApos
  const entradas: EntradaCapital[] = []

  const extra = Math.max(0, s.aporteExtraAnual)
  if (extra > 0) {
    const fim = idadeFimAcumulacao(s, idadeApos, prazo)
    for (let idade = s.idadeAtual; idade <= fim; idade++) {
      entradas.push(
        criarEntradaCapital({
          id: `livre-extra-${idade}`,
          descricao: "Aporte extra anual",
          valor: extra,
          idade,
        }),
      )
    }
  }

  if (s.novaEntradaValor > 0 && s.novaEntradaIdade > 0) {
    entradas.push(
      criarEntradaCapital({
        id: "livre-nova-entrada",
        descricao: "Nova entrada",
        valor: s.novaEntradaValor,
        idade: s.novaEntradaIdade,
      }),
    )
  }

  return entradas
}

export function montarPremissasProjecaoLivre(
  s: ProjecaoLivreState,
  opts?: {
    prazo?: number
    idadeApos?: number
    retiradaMensal?: number
    aporteM?: number
  },
): Premissas {
  const prazo = Math.max(0, opts?.prazo ?? s.prazo)
  const idadeApos = Math.max(0, opts?.idadeApos ?? s.idadeApos)
  const taxa = Math.max(0, s.taxaRendimento)
  return {
    saldoInicial: Math.max(0, s.saldoInicial),
    aporteM: Math.max(0, opts?.aporteM ?? s.aporteMensal),
    rendimento: taxa,
    rendimentoBruto: taxa,
    aliquotaImpostoRendimento: 0,
    inflacao: Math.max(0, s.inflacao),
    idadeAtual: Math.max(0, s.idadeAtual),
    prazo,
    idadeApos,
    retiradaMensal: Math.max(0, opts?.retiradaMensal ?? s.rendaMensalDesejada),
    rendaAposentadoria: 0,
    novaEntrada: 0,
    idadeEntrada: 0,
    entradasCapitais: montarEntradasProjecaoLivre(s, { prazo, idadeApos }),
    modoRentabilidade: "padrao",
  }
}

/** Projeção Livre modo padrão — mesma série que `calcularProjecao` com as premissas montadas. */
export function projetarLivre(s: ProjecaoLivreState): ProjecaoAno[] {
  return calcularProjecao(montarPremissasProjecaoLivre(s), [], [])
}

export function projetarLivreTempoRenda(s: ProjecaoLivreState): ProjecaoAno[] {
  const prazo = 60
  const idadeApos = s.idadeAtual + prazo + 1
  return calcularProjecao(
    montarPremissasProjecaoLivre(s, {
      prazo,
      idadeApos,
      retiradaMensal: 0,
    }),
    [],
    [],
  )
}

export function cortarAoAtingirRenda(projecao: ProjecaoAno[], rendaMensalDesejada: number): ProjecaoAno[] {
  const alvo = Math.max(0, rendaMensalDesejada)
  if (alvo <= 0) return projecao
  const idx = projecao.findIndex((p) => (Number(p.rendaMensalReal) || 0) >= alvo)
  if (idx < 0) return projecao
  return projecao.slice(0, idx + 1)
}

export function patrimonioNecessarioRendaReal(s: ProjecaoLivreState): number {
  const taxaReal = taxaRealDeBruto(s.taxaRendimento, s.inflacao, 0)
  return patrimonioPerpetuidade(Math.max(0, s.rendaMensalDesejada) * 12, taxaReal)
}

export function calcularAporteNecessarioLivre(s: ProjecaoLivreState) {
  const tempo = Math.max(1, s.tempoDesejado)
  const idadeApos = s.idadeAtual + tempo
  const prazo = tempo + 35
  const premissasBase = montarPremissasProjecaoLivre(s, {
    prazo,
    idadeApos,
    retiradaMensal: s.rendaMensalDesejada,
    aporteM: 0,
  })
  const resultado = encontrarAporteNecessario({
    premissas: premissasBase,
    objetivos: [],
    passivos: [],
  })
  const premissasComAporte = montarPremissasProjecaoLivre(s, {
    prazo,
    idadeApos,
    retiradaMensal: s.rendaMensalDesejada,
    aporteM: resultado.aporteMensalEquivalente,
  })
  const projecao = calcularProjecao(premissasComAporte, [], [])
  const anoApos = projecao.find((p) => p.idade === idadeApos) ?? projecao[projecao.length - 1]
  const inf = (Number(s.inflacao) || 0) / 100
  const r = (Number(s.taxaRendimento) || 0) / 100
  const tApos = Number(anoApos?.t) || tempo
  const fatorInf = Math.pow(1 + inf, tApos)
  const rendaReal = Number(anoApos?.rendaMensalReal) || 0
  const rendaNominal = rendaMensalGeradaNominal(
    Number(anoApos?.saldoNominal) || 0,
    r,
    inf,
    fatorInf,
  )
  return {
    aporteMensal: resultado.aporteMensalEquivalente,
    patrimonioFinalNominal: Number(anoApos?.saldoNominal) || 0,
    patrimonioFinalReal: Number(anoApos?.saldoReal) || 0,
    rendaMensalReal: rendaReal,
    rendaMensalNominal: rendaNominal,
    projecao,
    premissas: premissasComAporte,
  }
}

export function enriquecerAnoProjecaoLivre(
  anos: ProjecaoAno[],
  s: ProjecaoLivreState,
  saldoInicial: number,
) {
  const inf = (Number(s.inflacao) || 0) / 100
  const r = (Number(s.taxaRendimento) || 0) / 100
  return anos.map((p, i) => {
    const fatorInf = Math.pow(1 + inf, p.t)
    const prev = i > 0 ? anos[i - 1] : null
    const saldoNominalInicio = prev ? Number(prev.saldoNominal) || 0 : saldoInicial
    const saldoRealInicio = saldoNominalInicio / Math.max(fatorInf, 1e-12)
    return {
      ...p,
      rendaMensalNominal: rendaMensalGeradaNominal(saldoNominalInicio, r, inf, fatorInf),
      rendaMensalRealInicio: rendaMensalGeradaReal(saldoRealInicio, r, inf),
    }
  })
}

export function idadeLiberdadeFinanceiraLivre(
  projecao: ProjecaoAno[],
  s: ProjecaoLivreState,
): number | null {
  return encontrarIdadeLiberdadeFinanceira(
    projecao,
    s.taxaRendimento,
    s.inflacao,
    s.rendaMensalDesejada,
    [],
  )
}

export function projetarCenariosLivre(s: ProjecaoLivreState) {
  const base = montarPremissasProjecaoLivre(s)
  const conservador = calcularProjecao(
    aplicarRentabilidadeDoCenario(base, TAXAS_CENARIOS_PROJECAO_LIVRE.conservador),
    [],
    [],
  )
  const moderado = calcularProjecao(
    aplicarRentabilidadeDoCenario(base, TAXAS_CENARIOS_PROJECAO_LIVRE.moderado),
    [],
    [],
  )
  const arrojado = calcularProjecao(
    aplicarRentabilidadeDoCenario(base, TAXAS_CENARIOS_PROJECAO_LIVRE.arrojado),
    [],
    [],
  )
  return { conservador, moderado, arrojado, premissas: base }
}
