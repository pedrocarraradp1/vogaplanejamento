/**
 * Extrai e calcula prêmios a partir da resposta MAG de simulação.
 *
 * O payload da simulação traz taxas por cobertura (`capitalBase`, `premioBase`, `custoFixo`),
 * não o prêmio final. Fórmula:
 *   premio = custoFixo + (capitalDesejado / capitalBase) * premioBase
 */
import {
  calcularPremioCobertura,
  calcularPremiosDaSimulacao,
  type MagPremioCalculado,
} from "@/lib/mag/premio-cobertura"

export { calcularPremioCobertura, calcularPremiosDaSimulacao }
export type { MagPremioCalculado }

/** @deprecated Preferir calcularPremiosDaSimulacao — mantido para callers simples. */
export function extrairPremiosMag(
  json: unknown,
  capitalSegurado?: number,
  opts?: { idProduto?: number; modeloJson?: unknown },
): {
  premioMensal?: number
  premioAnual?: number
  premioBaseMorte?: number
  detalhe?: MagPremioCalculado
} {
  const detalhe = calcularPremiosDaSimulacao({
    simulacaoJson: json,
    capitalDesejado: capitalSegurado ?? 0,
    idProduto: opts?.idProduto,
    modeloJson: opts?.modeloJson,
  })
  const principal = detalhe.coberturas[0]
  return {
    premioMensal: detalhe.premioMensal > 0 ? detalhe.premioMensal : undefined,
    premioAnual: detalhe.premioAnual > 0 ? detalhe.premioAnual : undefined,
    premioBaseMorte: principal?.premioBase,
    detalhe,
  }
}
