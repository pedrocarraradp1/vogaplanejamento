import type { SnapshotCliente } from "@/types/diagnostico"
import type { PlanoState } from "@/lib/plano-context"
import {
  computeTotaisAtivos,
  getSaldoDevedorPassivo,
  getPatrimonioTotalConsolidado,
  metaReservaEmergenciaMeses,
} from "@/lib/patrimonio-utils"
import {
  getFontesRenda,
  aporteMensalAtual,
  resolveAporteParaPremissas,
} from "@/lib/renda-utils"
import { calcularProjecao, encontrarAporteNecessario, encontrarIdadeLiberdadeFinanceira } from "@/lib/engine"
import { calcularRealizadoMensal } from "@/lib/fluxo-caixa-utils"

function idadePorNascimento(nascimento: string): number {
  if (!nascimento) return 0
  const nasc = new Date(nascimento)
  if (Number.isNaN(nasc.getTime())) return 0
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return Math.max(0, idade)
}

/**
 * Monta o snapshot financeiro do cliente a partir do estado global (`PlanoState`),
 * reaproveitando os mesmos cálculos das abas (balanço, fluxo de caixa, projeção).
 * Só inclui um bloco quando há dados suficientes — assim o modelo analisa apenas
 * as áreas de fato preenchidas.
 */
export function montarSnapshotCliente(state: PlanoState): SnapshotCliente {
  const snapshot: SnapshotCliente = {}
  const { premissas, dadosPessoais, ativos, passivos, objetivos, fluxoDeCaixa } = state

  const totais = computeTotaisAtivos(ativos ?? [])
  const passivosTotais = (passivos ?? []).reduce((s, p) => s + getSaldoDevedorPassivo(p), 0)
  const despesaMensal = Number(dadosPessoais.despesa) || 0

  // ── Balanço patrimonial ────────────────────────────────────────────────────
  if (totais.patrimonioBruto > 0 || passivosTotais > 0) {
    const ativosTotais = totais.patrimonioBruto
    snapshot.balancoPatrimonial = {
      patrimonioLiquido: getPatrimonioTotalConsolidado(ativos ?? [], passivos ?? []),
      ativosLiquidos: totais.totalAtivoLiquido,
      passivosTotais,
      reservaEmergenciaMeses: despesaMensal > 0 ? totais.totalAtivoLiquido / despesaMensal : 0,
      reservaEmergenciaMetaMeses: metaReservaEmergenciaMeses(
        dadosPessoais.profissao ?? "",
        dadosPessoais.filhos?.length ?? 0,
      ),
      indiceAlavancagem: ativosTotais > 0 ? (passivosTotais / ativosTotais) * 100 : 0,
    }
  }

  // ── Fluxo de caixa realizado ────────────────────────────────────────────────
  const realizado = calcularRealizadoMensal(fluxoDeCaixa)
  const temFluxo = realizado.some(
    (m) => m.rentabilidade !== 0 || m.receita !== 0 || m.despesa !== 0,
  )
  if (temFluxo) {
    const rent = realizado.reduce((s, d) => s + d.rentabilidade, 0)
    const rec = realizado.reduce((s, d) => s + d.receita, 0)
    const fluxo = realizado.reduce((s, d) => s + d.fluxoLiquido, 0)
    const entradas = rent + rec
    snapshot.fluxoDeCaixa = {
      fluxoLiquidoAnual: fluxo,
      taxaPoupancaEfetiva: entradas > 0 ? (fluxo / entradas) * 100 : 0,
      mesesComSaldoNegativo: realizado
        .filter((m) => m.fluxoLiquido < 0)
        .map((m) => m.labelCompleto),
    }
  }

  // ── Objetivos ────────────────────────────────────────────────────────────────
  if (objetivos?.length) {
    const anoBase = new Date().getFullYear()
    snapshot.objetivos = objetivos.map((o) => ({
      nome: o.descricao,
      ano: anoBase + (Number(o.prazoAnos) || 0),
      valor: Number(o.valor) || 0,
    }))
  }

  // ── Aposentadoria / independência financeira ─────────────────────────────────
  const idadeAtual = idadePorNascimento(dadosPessoais.nascimento)
  const idadeApos = Number(premissas.idadeApos) || 0
  const rendaDesejada = Number(premissas.retiradaMensal) || 0

  if (idadeAtual > 0 && idadeApos > idadeAtual && rendaDesejada > 0) {
    const fontes = getFontesRenda(dadosPessoais)
    const { aporteM, aportePorAnoNominal } = resolveAporteParaPremissas(
      fontes,
      despesaMensal,
      premissas,
    )
    const saldoInicial = totais.totalAtivosFinanceiros
    const projecao = calcularProjecao(
      { ...premissas, saldoInicial, aporteM, idadeAtual, aportePorAnoNominal },
      objetivos,
      passivos,
    )

    const idadeIndep = encontrarIdadeLiberdadeFinanceira(
      projecao,
      premissas.rendimento,
      premissas.inflacao,
      rendaDesejada,
      objetivos,
    )
    const anosParaIndependencia =
      idadeIndep != null ? Math.max(0, idadeIndep - idadeAtual) : Math.max(0, idadeApos - idadeAtual)

    const resultadoAporte = encontrarAporteNecessario({
      premissas: { ...premissas, saldoInicial, aporteM, idadeAtual, aportePorAnoNominal },
      objetivos,
      passivos,
    })
    const aporteMensalNecessario = resultadoAporte.aporteMensalEquivalente

    snapshot.aposentadoria = {
      idadeAtual,
      idadeAposentadoriaDesejada: idadeApos,
      anosParaIndependencia,
      aporteMensalAtual: aporteMensalAtual(fontes, despesaMensal),
      aporteMensalNecessario,
    }
  }

  return snapshot
}
