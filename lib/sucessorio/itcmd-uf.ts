/** Teto da alíquota progressiva após a LC 227/2026. */
export const TETO_PROGRESSIVO_REFORMA = 0.08

export type UfBrasil =
  | "AC"
  | "AL"
  | "AP"
  | "AM"
  | "BA"
  | "CE"
  | "DF"
  | "ES"
  | "GO"
  | "MA"
  | "MT"
  | "MS"
  | "MG"
  | "PA"
  | "PB"
  | "PR"
  | "PE"
  | "PI"
  | "RJ"
  | "RN"
  | "RS"
  | "RO"
  | "RR"
  | "SC"
  | "SP"
  | "SE"
  | "TO"

export type TipoItcmd = "fixa" | "progressiva"

export type FaixaItcmd = {
  /** Limite superior da faixa (use Infinity na última). */
  ate: number
  aliquota: number
}

export type MultaAtrasoItcmd = {
  prazoDias: number
  modo: "aliquota_fixa" | "diaria"
  aliquota: number
  teto?: number
  base: "imposto"
}

export type RegraItcmdUf = {
  uf: UfBrasil
  lei: string
  tipo: TipoItcmd
  faixas: FaixaItcmd[]
  aliquotaFixa?: number
  isencaoDoacao?: number
  isencaoCausaMortis?: number
  unidadeFiscal?: string
  regraAgregacao?: string
  pontosDeAtencao: string[]
  revisadoEm: "2026-10"
  conferir?: boolean
  prazoPagamentoDias?: number
  multaAtraso?: MultaAtrasoItcmd
}

export type MemoriaFaixa = {
  de: number
  ate: number
  baseNaFaixa: number
  aliquota: number
  imposto: number
}

const REVISADO: "2026-10" = "2026-10"

function fixa(
  uf: UfBrasil,
  lei: string,
  aliquota: number,
  extra: Partial<RegraItcmdUf> = {},
): RegraItcmdUf {
  return {
    uf,
    lei,
    tipo: "fixa",
    faixas: [{ ate: Number.POSITIVE_INFINITY, aliquota }],
    aliquotaFixa: aliquota,
    pontosDeAtencao: extra.pontosDeAtencao ?? [],
    revisadoEm: REVISADO,
    prazoPagamentoDias: extra.prazoPagamentoDias ?? 30,
    multaAtraso: extra.multaAtraso ?? {
      prazoDias: extra.prazoPagamentoDias ?? 30,
      modo: "aliquota_fixa",
      aliquota: 0.1,
      base: "imposto",
    },
    ...extra,
  }
}

function progressiva(
  uf: UfBrasil,
  lei: string,
  faixas: FaixaItcmd[],
  extra: Partial<RegraItcmdUf> = {},
): RegraItcmdUf {
  return {
    uf,
    lei,
    tipo: "progressiva",
    faixas,
    pontosDeAtencao: extra.pontosDeAtencao ?? [],
    revisadoEm: REVISADO,
    prazoPagamentoDias: extra.prazoPagamentoDias ?? 60,
    multaAtraso: extra.multaAtraso ?? {
      prazoDias: extra.prazoPagamentoDias ?? 60,
      modo: "diaria",
      aliquota: 0.0033,
      teto: 0.2,
      base: "imposto",
    },
    ...extra,
  }
}

/**
 * Síntese 4% / 6% / 8% usada como referência da reforma (estados já progressivos + teto LC 227/2026).
 * Calibrada para o caso SP R$ 8,65 mi → R$ 661.500.
 */
export const TABELA_REFERENCIA_REFORMA: FaixaItcmd[] = [
  { ate: 525_000, aliquota: 0.04 },
  { ate: 1_000_000, aliquota: 0.06 },
  { ate: Number.POSITIVE_INFINITY, aliquota: TETO_PROGRESSIVO_REFORMA },
]

export const ITCMD_POR_UF: Record<UfBrasil, RegraItcmdUf> = {
  AC: fixa("AC", "Lei estadual nº 1.425/2002 (e alterações)", 0.04, {
    conferir: true,
    pontosDeAtencao: ["Confirmar se permanece 4% linear após a LC 227/2026."],
  }),
  AL: progressiva(
    "AL",
    "Lei nº 6.858/2008 (e alterações)",
    [
      { ate: 200_000, aliquota: 0.02 },
      { ate: 400_000, aliquota: 0.04 },
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.08 },
    ],
    {
      conferir: true,
      pontosDeAtencao: ["Tabela progressiva 2%–8% — conferir faixas atualizadas em 2026."],
    },
  ),
  AP: fixa("AP", "Lei nº 400/1997 (e alterações)", 0.04, {
    conferir: true,
    pontosDeAtencao: ["Alíquota usualmente linear de 4%."],
  }),
  AM: fixa("AM", "Lei nº 1.732/1986 (e alterações)", 0.02, {
    conferir: true,
    pontosDeAtencao: ["Amazonas historicamente pratica 2%; confirmar vigência em 2026."],
  }),
  BA: progressiva(
    "BA",
    "Lei nº 4.827/1989 (e alterações)",
    [
      { ate: 200_000, aliquota: 0.035 },
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.08 },
    ],
    {
      conferir: true,
      pontosDeAtencao: ["Há discussão sobre progressividade 3,5%–8% na Bahia."],
    },
  ),
  CE: progressiva(
    "CE",
    "Lei nº 15.812/2015 (e alterações)",
    [
      { ate: 25_000, aliquota: 0.02 },
      { ate: 150_000, aliquota: 0.04 },
      { ate: 250_000, aliquota: 0.06 },
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.08 },
    ],
    {
      conferir: true,
      unidadeFiscal: "UFRCE",
      pontosDeAtencao: ["Faixas oficiais são em UFRCE — valores em R$ são aproximação 2026-10."],
    },
  ),
  DF: progressiva(
    "DF",
    "Lei nº 5.452/2015 (e alterações)",
    [
      { ate: 1_000_000, aliquota: 0.04 },
      { ate: 2_000_000, aliquota: 0.05 },
      { ate: 3_000_000, aliquota: 0.06 },
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.08 },
    ],
    {
      pontosDeAtencao: [
        "DF usa progressividade por faixas; a prática local às vezes aplica alíquota única sobre o quinhão.",
      ],
    },
  ),
  ES: fixa("ES", "Lei nº 10.011/2013 (e alterações)", 0.04, {
    pontosDeAtencao: ["Alíquota linear de 4% para doação e causa mortis."],
  }),
  GO: progressiva(
    "GO",
    "Lei nº 11.651/1991 / LC estadual (e alterações)",
    [
      { ate: 150_000, aliquota: 0.02 },
      { ate: 400_000, aliquota: 0.04 },
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.08 },
    ],
    {
      conferir: true,
      pontosDeAtencao: ["Goiás prevê progressividade até 8% — conferir faixas em UPF."],
    },
  ),
  MA: progressiva(
    "MA",
    "Lei nº 7.799/2002 (e alterações)",
    [
      { ate: 100_000, aliquota: 0.01 },
      { ate: 300_000, aliquota: 0.04 },
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.07 },
    ],
    {
      conferir: true,
      pontosDeAtencao: ["Alíquotas 1%–7% no Maranhão — confirmar teto após LC 227/2026."],
    },
  ),
  MT: progressiva(
    "MT",
    "Lei nº 7.818/2002 (e alterações)",
    [
      { ate: 200_000, aliquota: 0.02 },
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.04 },
    ],
    {
      conferir: true,
      pontosDeAtencao: ["Historicamente 2%–4%; pode ter sido elevada rumo ao teto de 8%."],
    },
  ),
  MS: progressiva(
    "MS",
    "Lei nº 1.810/1997 (e alterações)",
    [
      { ate: 150_000, aliquota: 0.03 },
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.06 },
    ],
    {
      conferir: true,
      pontosDeAtencao: ["MS pratica alíquotas na casa de 3%–6% — conferir 2026."],
    },
  ),
  MG: fixa("MG", "Lei nº 14.941/2003 (e alterações)", 0.05, {
    isencaoDoacao: 22_800,
    isencaoCausaMortis: 80_000,
    unidadeFiscal: "UFEMG",
    pontosDeAtencao: [
      "Alíquota linear de 5%. Isenções em UFEMG — valores em R$ são aproximação.",
    ],
  }),
  PA: fixa("PA", "Lei nº 5.530/1989 (e alterações)", 0.04, {
    conferir: true,
    pontosDeAtencao: ["Pará usualmente 4% linear."],
  }),
  PB: fixa("PB", "Lei nº 5.123/1989 (e alterações)", 0.04, {
    conferir: true,
    pontosDeAtencao: ["Paraíba usualmente 4% linear."],
  }),
  PR: fixa("PR", "Lei nº 18.573/2015 (e alterações)", 0.04, {
    pontosDeAtencao: ["Paraná mantém 4% para doação e causa mortis."],
  }),
  PE: progressiva(
    "PE",
    "Lei nº 13.974/2009 (e alterações)",
    [
      { ate: 100_000, aliquota: 0.02 },
      { ate: 200_000, aliquota: 0.04 },
      { ate: 300_000, aliquota: 0.06 },
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.08 },
    ],
    {
      conferir: true,
      unidadeFiscal: "UFR-PE",
      pontosDeAtencao: ["Progressiva 2%–8%; faixas oficiais em UFR."],
    },
  ),
  PI: fixa("PI", "Lei nº 4.261/1989 (e alterações)", 0.04, {
    conferir: true,
    pontosDeAtencao: ["Piauí usualmente 4% linear."],
  }),
  RJ: progressiva(
    "RJ",
    "Lei nº 7.174/2015 (e alterações)",
    [
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.07 },
    ],
    {
      aliquotaFixa: 0.07,
      conferir: true,
      pontosDeAtencao: [
        "A lei fluminense prevê progressividade 4%–8%. Nesta base usamos 7% como alíquota efetiva de referência para causa mortis (caso pedagógico SP+RJ), até conferência da tabela UFIR-RJ vigente.",
      ],
    },
  ),
  RN: progressiva(
    "RN",
    "Lei nº 5.900/1989 (e alterações)",
    [
      { ate: 150_000, aliquota: 0.03 },
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.04 },
    ],
    {
      conferir: true,
      pontosDeAtencao: ["RN historicamente 3%–4%."],
    },
  ),
  RS: progressiva(
    "RS",
    "Lei nº 8.821/1989 (e alterações)",
    [
      { ate: 40_000, aliquota: 0 },
      { ate: 200_000, aliquota: 0.03 },
      { ate: 600_000, aliquota: 0.04 },
      { ate: 1_200_000, aliquota: 0.06 },
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.08 },
    ],
    {
      conferir: true,
      unidadeFiscal: "UPF-RS",
      pontosDeAtencao: [
        "RS é progressivo até 8% com isenção inicial em UPF. Faixas em R$ são aproximação.",
      ],
    },
  ),
  RO: fixa("RO", "Lei nº 959/2000 (e alterações)", 0.04, {
    conferir: true,
    pontosDeAtencao: ["Rondônia usualmente 4% linear."],
  }),
  RR: fixa("RR", "Lei nº 059/1993 (e alterações)", 0.04, {
    conferir: true,
    pontosDeAtencao: ["Roraima usualmente 4% linear."],
  }),
  SC: progressiva(
    "SC",
    "Lei nº 13.136/2004 (e alterações)",
    [
      { ate: 50_000, aliquota: 0.01 },
      { ate: 150_000, aliquota: 0.03 },
      { ate: 400_000, aliquota: 0.05 },
      { ate: 1_000_000, aliquota: 0.07 },
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.08 },
    ],
    {
      conferir: true,
      pontosDeAtencao: ["SC é progressivo 1%–8%; faixas oficiais usam UFESC."],
    },
  ),
  SP: fixa("SP", "Lei nº 10.705/2000 (e alterações)", 0.04, {
    isencaoDoacao: 93_000,
    isencaoCausaMortis: 185_000,
    unidadeFiscal: "UFESP",
    regraAgregacao: "Doações ao mesmo donatário no mesmo ano-calendário são somadas para apuração da isenção e da alíquota.",
    prazoPagamentoDias: 30,
    multaAtraso: {
      prazoDias: 30,
      modo: "aliquota_fixa",
      aliquota: 0.1,
      base: "imposto",
    },
    pontosDeAtencao: [
      "Alíquota linear de 4% (doação e causa mortis).",
      "Isenções em UFESP (doação ~2.500 UFESP; imóvel residencial causa mortis ~5.000 UFESP, com requisitos).",
      "Multa de mora de 10% sobre o imposto após 30 dias da abertura da sucessão (modelo desta base).",
      "ITCMD não incide, em regra, sobre VGBL; PGBL pode integrar o inventário.",
    ],
  }),
  SE: fixa("SE", "Lei nº 3.704/1996 (e alterações)", 0.04, {
    conferir: true,
    pontosDeAtencao: ["Sergipe usualmente 4% linear."],
  }),
  TO: progressiva(
    "TO",
    "Lei nº 1.287/2001 (e alterações)",
    [
      { ate: 150_000, aliquota: 0.02 },
      { ate: Number.POSITIVE_INFINITY, aliquota: 0.04 },
    ],
    {
      conferir: true,
      pontosDeAtencao: ["Tocantins 2%–4% — confirmar se já aderiu ao teto de 8%."],
    },
  ),
}

export function normalizarUf(uf: string): UfBrasil {
  const u = uf.trim().toUpperCase() as UfBrasil
  if (!(u in ITCMD_POR_UF)) {
    throw new Error(`UF inválida: ${uf}`)
  }
  return u
}

export function getRegraItcmdUf(uf: string): RegraItcmdUf {
  return ITCMD_POR_UF[normalizarUf(uf)]
}

export function impostoPorFaixas(
  base: number,
  faixas: FaixaItcmd[],
): { imposto: number; memoria: MemoriaFaixa[] } {
  const valorBase = Math.max(0, Number(base) || 0)
  const sorted = [...faixas].sort((a, b) => a.ate - b.ate)
  let piso = 0
  let imposto = 0
  const memoria: MemoriaFaixa[] = []

  for (const faixa of sorted) {
    const teto = faixa.ate
    const fatia = Math.min(valorBase, teto) - piso
    if (fatia > 0) {
      const parcela = fatia * faixa.aliquota
      memoria.push({
        de: piso,
        ate: Math.min(valorBase, teto),
        baseNaFaixa: fatia,
        aliquota: faixa.aliquota,
        imposto: parcela,
      })
      imposto += parcela
    }
    piso = teto
    if (valorBase <= teto) break
  }

  return { imposto, memoria }
}
