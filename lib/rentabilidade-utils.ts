import { buildBlocosAporte, type BlocoAporte } from "@/lib/renda-utils"

export type ModoRentabilidade = "padrao" | "por_periodo" | "acumulacao_aposentadoria"

export interface PremissasRentabilidade {
  rendimento: number
  rendimentoBruto?: number
  aliquotaImpostoRendimento?: number
  inflacao: number
  prazo?: number
  idadeAtual?: number
  idadeApos?: number
  modoRentabilidade?: ModoRentabilidade
  rendimentoPeriodosBruto?: number[]
  rendimentoAcumulacao?: number
  rendimentoAposentadoria?: number
}

export function rendimentoLiquidoDeBruto(brutoPct: number, aliquota: number): number {
  const aliq = Math.max(0, Math.min(1, Number(aliquota) || 0))
  return Math.max(0, Number(brutoPct) || 0) * (1 - aliq)
}

export function taxaNominalLiquidaDeBruto(brutoPct: number, aliquota: number): number {
  return rendimentoLiquidoDeBruto(brutoPct, aliquota) / 100
}

export function taxaRealDeBruto(brutoPct: number, inflacaoPct: number, aliquota: number): number {
  const r = taxaNominalLiquidaDeBruto(brutoPct, aliquota)
  const inf = Math.max(0, Number(inflacaoPct) || 0) / 100
  if (r < 0 || inf < 0) return 0
  return (1 + r) / (1 + inf) - 1
}

function blocoNoAno(blocos: BlocoAporte[], t: number): BlocoAporte | undefined {
  return blocos.find((b, idx) => {
    const isLast = idx === blocos.length - 1
    return t >= b.inicio && (isLast ? t <= b.fim : t < b.fim)
  })
}

export function blocosRentabilidadePorPrazo(prazoSimulacao: number): BlocoAporte[] {
  return buildBlocosAporte(Math.max(0, Number(prazoSimulacao) || 0))
}

export function resolverRendimentoBrutoPorAno(premissas: PremissasRentabilidade): (t: number) => number {
  const modo = premissas.modoRentabilidade ?? "padrao"
  const padrao = Number(premissas.rendimentoBruto ?? premissas.rendimento) || 0

  switch (modo) {
    case "por_periodo": {
      const prazo = Math.max(0, Number(premissas.prazo) || 0)
      const blocos = blocosRentabilidadePorPrazo(prazo)
      const periodos = premissas.rendimentoPeriodosBruto ?? []
      return (t: number) => {
        const bloco = blocoNoAno(blocos, t)
        if (!bloco) return padrao
        return Number(periodos[bloco.i] ?? padrao) || padrao
      }
    }
    case "acumulacao_aposentadoria": {
      const acum = Number(premissas.rendimentoAcumulacao ?? padrao) || padrao
      const apos = Number(premissas.rendimentoAposentadoria ?? padrao) || padrao
      const idadeAtual = Number(premissas.idadeAtual) || 0
      const idadeApos = Number(premissas.idadeApos) || 0
      const anosAteApos = Math.max(0, idadeApos - idadeAtual)
      return (t: number) => (t < anosAteApos ? acum : apos)
    }
    case "padrao":
    default:
      return () => padrao
  }
}

export function resolverTaxaRealPorAno(premissas: PremissasRentabilidade): (t: number) => number {
  const brutoPorAno = resolverRendimentoBrutoPorAno(premissas)
  const aliq = Number(premissas.aliquotaImpostoRendimento) || 0
  const inflacao = Number(premissas.inflacao) || 0
  return (t) => taxaRealDeBruto(brutoPorAno(t), inflacao, aliq)
}

export function resolverRendimentoLiquidoNominalPorAno(
  premissas: PremissasRentabilidade,
): (t: number) => number {
  const brutoPorAno = resolverRendimentoBrutoPorAno(premissas)
  const aliq = Number(premissas.aliquotaImpostoRendimento) || 0
  return (t) => taxaNominalLiquidaDeBruto(brutoPorAno(t), aliq)
}
