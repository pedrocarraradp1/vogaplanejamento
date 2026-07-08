/** Modo de exibição das seções na página Plano Financeiro Completo. */
export type PlanoSecaoVariant = "full" | "planoCompleto"

export function isPlanoCompleto(variant?: PlanoSecaoVariant): boolean {
  return variant === "planoCompleto"
}
