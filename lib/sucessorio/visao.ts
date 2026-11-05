import { normalizeAtivoTipo } from "@/lib/patrimonio-utils"
import {
  calcularCustoInventario,
  calcularEspolio,
  calcularImpactoReforma,
  diagnosticoSinaisAlerta,
  type BemEspolio,
  type TipoAtivoSucessorio,
  type ViaInventario,
} from "./calculos"
import { calcularEstateTax } from "./estate-tax-eua"
import { getRegraItcmdUf, ITCMD_POR_UF, type UfBrasil } from "./itcmd-uf"
import { ROTEIROS, TIPOS_ROTEIRO, TIPO_ROTEIRO_LABEL, progressoRoteiro } from "./roteiros"
import {
  DEFAULT_SUCESSAO_DIAGNOSTICO,
  DEFAULT_SUCESSAO_SIMULADOR,
  type SucessaoDiagnostico,
  type SucessaoDocumentos,
  type SucessaoRoteiros,
  type SucessaoSimulador,
} from "./tipos"

export type AtivoVisao = {
  tipo: string
  descricao?: string
  valor: number
  uf?: string
  heranca?: boolean
  bemDeHeranca?: boolean
  localizacao?: string
}

export type PlanoVisaoSucessao = {
  dadosPessoais: {
    nome?: string
    uf?: string
    regime?: string
  }
  ativos: AtivoVisao[]
  sucessao: {
    diagnostico?: SucessaoDiagnostico
    simulador?: SucessaoSimulador
    roteiros?: SucessaoRoteiros
    documentos?: SucessaoDocumentos
    regimeSucessao?: string
  }
}

function ufSegura(uf: string | undefined): UfBrasil {
  const u = (uf || "SP").trim().toUpperCase()
  return (u in ITCMD_POR_UF ? u : "SP") as UfBrasil
}

function tipoItcmdDoAtivo(ativo: AtivoVisao): TipoAtivoSucessorio {
  const t = normalizeAtivoTipo(ativo.tipo, ativo.descricao)
  if (t === "imobilizado") return "imovel"
  if (t === "participacao_societaria") return "quotas"
  return "dinheiro"
}

export function visaoSucessorio(plano: PlanoVisaoSucessao) {
  const diagnosticoState = plano.sucessao.diagnostico ?? DEFAULT_SUCESSAO_DIAGNOSTICO
  const simulador = { ...DEFAULT_SUCESSAO_SIMULADOR, ...(plano.sucessao.simulador ?? {}) }
  const soHeranca = Boolean(simulador.soHeranca)
  const via = (simulador.via ?? "extrajudicial") as ViaInventario
  const honorariosPct = simulador.honorariosPct ?? 6
  const custasPct = simulador.custasPct ?? 1.5
  const diasAteAbertura = simulador.diasAteAbertura ?? 30
  const custoPlanejarVida = simulador.custoPlanejarVida ?? 0
  const domicilioUF = ufSegura(plano.dadosPessoais.uf)

  const respostas =
    diagnosticoState.respostas?.length === 20
      ? diagnosticoState.respostas
      : DEFAULT_SUCESSAO_DIAGNOSTICO.respostas
  const diagnostico = diagnosticoSinaisAlerta(respostas)

  const ativosBase = (plano.ativos ?? []).filter((a) => {
    const valor = Number(a.valor) || 0
    if (valor <= 0) return false
    if (!soHeranca) return true
    return a.heranca === true || a.bemDeHeranca === true
  })

  const bensEspolio: BemEspolio[] = ativosBase.map((a) => {
    const tipo = tipoItcmdDoAtivo(a)
    const uf = tipo === "imovel" ? ufSegura(a.uf || domicilioUF) : domicilioUF
    return { tipo, valor: Number(a.valor) || 0, uf }
  })

  const espolio = calcularEspolio({
    domicilioUF,
    modalidade: "causa_mortis",
    bens: bensEspolio,
  })

  const custoInv = calcularCustoInventario({
    uf: domicilioUF,
    patrimonio: espolio.patrimonio,
    via,
    honorariosPct: honorariosPct / 100,
    custasPct: custasPct / 100,
    diasAteAbertura,
  })

  let holding = 0
  let imoveis = 0
  let previdencia = 0
  let exterior = 0
  for (const a of ativosBase) {
    const t = normalizeAtivoTipo(a.tipo, a.descricao)
    const v = Number(a.valor) || 0
    if (t === "participacao_societaria") holding += v
    else if (t === "imobilizado") imoveis += v
    else if (t === "previdencia") previdencia += v
    else if (t === "ativo_liquido" && a.localizacao === "internacional") exterior += v
  }

  const reforma = calcularImpactoReforma({
    uf: domicilioUF,
    patrimonio: espolio.patrimonio,
    holding,
    imoveis,
    previdencia,
    exterior,
  })

  const pontosAtencao: string[] = []
  const ufs = new Set(espolio.porEstado.map((e) => e.uf))
  ufs.add(domicilioUF)
  for (const uf of ufs) {
    for (const p of getRegraItcmdUf(uf).pontosDeAtencao) {
      pontosAtencao.push(`${uf}: ${p}`)
    }
  }

  const somaLiquidosIntl = (plano.ativos ?? [])
    .filter(
      (a) =>
        normalizeAtivoTipo(a.tipo, a.descricao) === "ativo_liquido" &&
        a.localizacao === "internacional",
    )
    .reduce((s, a) => s + (Number(a.valor) || 0), 0)

  const bensEuaUSD = simulador.bensEuaUSD ?? somaLiquidosIntl
  const cambio = simulador.cambio && simulador.cambio > 0 ? simulador.cambio : undefined
  const estate = calcularEstateTax(bensEuaUSD, cambio)

  const economiaPlanejar = custoInv.total - custoPlanejarVida

  const roteiros = plano.sucessao.roteiros ?? {}
  const progressoRoteiros = TIPOS_ROTEIRO.map((tipo) => {
    const def = ROTEIROS[tipo]
    const concluidos = new Set(roteiros[tipo]?.concluidos ?? [])
    return {
      tipo,
      label: TIPO_ROTEIRO_LABEL[tipo],
      progresso: progressoRoteiro(def, concluidos),
    }
  })

  return {
    domicilioUF,
    diagnostico,
    espolio,
    custoInv,
    reforma,
    pontosAtencao,
    estate,
    bensEuaUSD,
    cambio,
    economiaPlanejar,
    custoPlanejarVida,
    progressoRoteiros,
    via,
    honorariosPct,
    custasPct,
    diasAteAbertura,
  }
}

export type VisaoSucessorio = ReturnType<typeof visaoSucessorio>
