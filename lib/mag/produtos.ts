/** Metadados de exibição e fallback — alinhados ao comparador MAG. */

export const MAG_PRODUTO_META: Record<
  string,
  { nome: string; mult: number; anospag: number }
> = {
  WL10: { nome: "Whole Life Integral 10 anos", mult: 2.7, anospag: 10 },
  WL5: { nome: "Whole Life 5 anos", mult: 3.8, anospag: 5 },
  TL10: { nome: "Term Life 10 anos", mult: 1.0, anospag: 10 },
  TL20: { nome: "Term Life 20 anos", mult: 1.0, anospag: 20 },
  TL30: { nome: "Term Life 30 anos", mult: 1.0, anospag: 30 },
}

/** Taxa mensal de referência (fração do capital segurado) por idade. */
export function taxaFaixaEtaria(idade: number): number {
  const i = Math.max(18, Math.min(99, idade || 35))
  if (i <= 30) return 0.00022
  if (i <= 40) return 0.00034
  if (i <= 50) return 0.00052
  if (i <= 60) return 0.00078
  return 0.00115
}

export function nomeProdutoMag(codigo: string): string {
  return MAG_PRODUTO_META[codigo]?.nome ?? codigo
}
