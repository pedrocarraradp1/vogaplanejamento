/** Produtos reais MAG Vida Inteira Resgatável (A7Z) com prazos de pagamento distintos. */

export interface MagProduto {
  codigo: string
  nome: string
  subtitulo: string
  anospag: number
  mult: number
  descricao: string
}

export const MAG_PRODUTOS: MagProduto[] = [
  {
    codigo: "A7Z",
    nome: "Vida Inteira Resgatável",
    subtitulo: "5 anos",
    anospag: 5,
    mult: 4.2,
    descricao:
      "Cobertura vitalícia com reserva resgatável. Prêmio pago em 5 anos. Maior prêmio mensal, menor prazo de pagamento.",
  },
  {
    codigo: "A7Z",
    nome: "Vida Inteira Resgatável",
    subtitulo: "10 anos",
    anospag: 10,
    mult: 2.7,
    descricao:
      "Cobertura vitalícia com reserva resgatável. Prêmio pago em 10 anos. Resgate disponível a partir do 25º mês.",
  },
  {
    codigo: "A7Z",
    nome: "Vida Inteira Resgatável",
    subtitulo: "20 anos",
    anospag: 20,
    mult: 1.8,
    descricao:
      "Cobertura vitalícia com reserva resgatável. Prêmio pago em 20 anos. Prêmio mensal mais acessível com prazo estendido.",
  },
  {
    codigo: "A7Z",
    nome: "Vida Inteira Resgatável",
    subtitulo: "30 anos",
    anospag: 30,
    mult: 1.4,
    descricao:
      "Cobertura vitalícia com reserva resgatável. Prêmio pago em 30 anos. Menor prêmio mensal, prazo máximo de pagamento.",
  },
]

export const MAG_PRODUTO_META: Record<
  string,
  { nome: string; mult: number; anospag: number }
> = Object.fromEntries(
  MAG_PRODUTOS.map((p) => [
    `${p.codigo}_${p.anospag}`,
    { nome: `${p.nome} ${p.subtitulo}`, mult: p.mult, anospag: p.anospag },
  ]),
)

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
