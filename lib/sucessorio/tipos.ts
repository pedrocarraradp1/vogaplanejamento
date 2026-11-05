import { TIPOS_ROTEIRO, idsRoteiroDoTipo, type TipoRoteiro } from "./roteiros"

export type ViaInventarioSimulador = "extrajudicial" | "judicial" | "litigio"

export type SucessaoDiagnostico = {
  respostas: boolean[]
}

export type SucessaoSimulador = {
  soHeranca?: boolean
  via?: ViaInventarioSimulador
  honorariosPct?: number
  custasPct?: number
  diasAteAbertura?: number
  custoPlanejarVida?: number
  bensEuaUSD?: number
  cambio?: number
}

export type SucessaoRoteiroProgresso = {
  concluidos: string[]
}

export type SucessaoRoteiros = Partial<Record<TipoRoteiro, SucessaoRoteiroProgresso>>

export type SucessaoDocumentos = {
  clausulasIncluidas?: string[]
  camposClausulas?: Record<string, string>
  templates?: Record<string, Record<string, string>>
}

export const DEFAULT_SUCESSAO_DIAGNOSTICO: SucessaoDiagnostico = {
  respostas: Array.from({ length: 20 }, () => false),
}

export const DEFAULT_SUCESSAO_SIMULADOR: SucessaoSimulador = {
  soHeranca: false,
  via: "extrajudicial",
  honorariosPct: 6,
  custasPct: 1.5,
  diasAteAbertura: 30,
  custoPlanejarVida: 0,
}

export const DEFAULT_SUCESSAO_ROTEIROS: SucessaoRoteiros = {}

export const DEFAULT_SUCESSAO_DOCUMENTOS: SucessaoDocumentos = {
  clausulasIncluidas: [],
  camposClausulas: {},
  templates: {},
}

export function hidratarDiagnostico(raw: unknown): SucessaoDiagnostico {
  if (!raw || typeof raw !== "object" || !Array.isArray((raw as { respostas?: unknown }).respostas)) {
    return { respostas: [...DEFAULT_SUCESSAO_DIAGNOSTICO.respostas] }
  }
  const respostas = (raw as { respostas: unknown[] }).respostas
  return {
    respostas: Array.from({ length: 20 }, (_, i) => Boolean(respostas[i])),
  }
}

export function hidratarSimulador(raw: unknown): SucessaoSimulador {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SUCESSAO_SIMULADOR }
  const s = raw as Record<string, unknown>
  const via =
    s.via === "judicial" || s.via === "litigio" || s.via === "extrajudicial" ? s.via : "extrajudicial"
  return {
    soHeranca: Boolean(s.soHeranca),
    via,
    honorariosPct: Number(s.honorariosPct) || DEFAULT_SUCESSAO_SIMULADOR.honorariosPct,
    custasPct: Number(s.custasPct) || DEFAULT_SUCESSAO_SIMULADOR.custasPct,
    diasAteAbertura:
      s.diasAteAbertura != null
        ? Number(s.diasAteAbertura) || 0
        : DEFAULT_SUCESSAO_SIMULADOR.diasAteAbertura,
    custoPlanejarVida:
      s.custoPlanejarVida != null ? Number(s.custoPlanejarVida) || 0 : 0,
    bensEuaUSD: s.bensEuaUSD != null ? Number(s.bensEuaUSD) : undefined,
    cambio: s.cambio != null ? Number(s.cambio) : undefined,
  }
}

export function hidratarRoteiros(raw: unknown): SucessaoRoteiros {
  if (!raw || typeof raw !== "object") return {}
  const src = raw as Record<string, unknown>
  const hidratados: SucessaoRoteiros = {}
  for (const tipo of TIPOS_ROTEIRO) {
    const bloco = src[tipo]
    if (!bloco || typeof bloco !== "object") continue
    const b = bloco as { concluidos?: unknown; itens?: unknown }
    const idsValidos = new Set(idsRoteiroDoTipo(tipo))
    const brutos = Array.isArray(b.concluidos)
      ? b.concluidos
      : b.itens && typeof b.itens === "object"
        ? Object.entries(b.itens as Record<string, unknown>)
            .filter(([, v]) => Boolean(v))
            .map(([k]) => k)
        : []
    const concluidos = brutos.filter(
      (id: unknown): id is string => typeof id === "string" && idsValidos.has(id),
    )
    hidratados[tipo] = { concluidos }
  }
  return hidratados
}

export function hidratarDocumentos(raw: unknown): SucessaoDocumentos {
  if (!raw || typeof raw !== "object") {
    return {
      clausulasIncluidas: [],
      camposClausulas: {},
      templates: {},
    }
  }
  const d = raw as Record<string, unknown>
  const incluidas = Array.isArray(d.clausulasIncluidas)
    ? d.clausulasIncluidas.filter((id: unknown) => typeof id === "string")
    : []
  const camposClausulas: Record<string, string> = {}
  if (d.camposClausulas && typeof d.camposClausulas === "object") {
    for (const [k, v] of Object.entries(d.camposClausulas as Record<string, unknown>)) {
      if (typeof v === "string") camposClausulas[k] = v
    }
  }
  const templates: Record<string, Record<string, string>> = {}
  if (d.templates && typeof d.templates === "object") {
    for (const [tid, campos] of Object.entries(d.templates as Record<string, unknown>)) {
      if (!campos || typeof campos !== "object") continue
      const inner: Record<string, string> = {}
      for (const [k, v] of Object.entries(campos as Record<string, unknown>)) {
        if (typeof v === "string") inner[k] = v
      }
      templates[tid] = inner
    }
  }
  return { clausulasIncluidas: incluidas, camposClausulas, templates }
}
