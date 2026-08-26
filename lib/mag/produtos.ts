import {
  MODELO_PROPOSTA_ATUAL,
  MAG_MODELOS,
  type MagModeloProposta,
} from "@/lib/mag/config"

/** Prazos de pagamento do Whole Life (10, 20, 30 anos). */

export interface MagProduto {
  codigo: MagModeloProposta
  nome: string
  subtitulo: string
  anospag: number
  mult: number
  descricao: string
}

function produtosDoModelo(codigo: MagModeloProposta): MagProduto[] {
  const spec = MAG_MODELOS[codigo]
  const nome =
    codigo === "ER6" ? "Vida Inteira Integral" : "Vida Inteira Resgatável"
  return [
    {
      codigo,
      nome,
      subtitulo: "10 anos",
      anospag: 10,
      mult: 1,
      descricao:
        codigo === "ER6"
          ? `Cobertura vitalícia (${spec.nome}, SUSEP ${spec.susep}). Prêmio pago em 10 anos.`
          : "Cobertura vitalícia com reserva resgatável. Prêmio pago em 10 anos. Resgate disponível a partir do 25º mês.",
    },
    {
      codigo,
      nome,
      subtitulo: "20 anos",
      anospag: 20,
      mult: 1,
      descricao:
        codigo === "ER6"
          ? `Cobertura vitalícia (${spec.nome}, SUSEP ${spec.susep}). Prêmio pago em 20 anos.`
          : "Cobertura vitalícia com reserva resgatável. Prêmio pago em 20 anos. Prêmio mensal mais acessível com prazo estendido.",
    },
    {
      codigo,
      nome,
      subtitulo: "30 anos",
      anospag: 30,
      mult: 1,
      descricao:
        codigo === "ER6"
          ? `Cobertura vitalícia (${spec.nome}, SUSEP ${spec.susep}). Prêmio pago em 30 anos.`
          : "Cobertura vitalícia com reserva resgatável. Prêmio pago em 30 anos. Menor prêmio mensal, prazo máximo de pagamento.",
    },
  ]
}

/** Lista exibida no simulador — segue MODELO_PROPOSTA_ATUAL (ER6 em STG). */
export const MAG_PRODUTOS: MagProduto[] = produtosDoModelo(MODELO_PROPOSTA_ATUAL)

/** Catálogo A75 mantido para fallback / comparação. */
export const MAG_PRODUTOS_A75: MagProduto[] = produtosDoModelo("A75")

export const MAG_PRODUTO_META: Record<
  string,
  { nome: string; mult: number; anospag: number; codigoModelo: MagModeloProposta }
> = Object.fromEntries(
  MAG_PRODUTOS.map((p) => [
    `${p.codigo}_${p.anospag}`,
    { nome: `${p.nome} ${p.subtitulo}`, mult: p.mult, anospag: p.anospag, codigoModelo: p.codigo },
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
