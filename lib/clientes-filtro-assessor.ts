export type AssessorOption = {
  advisorId: string
  nome: string
  email: string | null
  totalClientes: number
  totalSimulacoes: number
}

export const SEM_ASSESSOR = "__sem_assessor__"

type ClienteAdvisorEmbed =
  | { advisor_id?: string | null }
  | { advisor_id?: string | null }[]
  | null
  | undefined

export type SimulacaoComAdvisor = {
  advisor_id?: string | null
  clientes?: ClienteAdvisorEmbed
}

function textoId(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim()
  return trimmed ? trimmed : null
}

function advisorIdDoCliente(clientes: ClienteAdvisorEmbed): string | null {
  if (!clientes) return null
  if (Array.isArray(clientes)) {
    return textoId(clientes[0]?.advisor_id)
  }
  return textoId(clientes.advisor_id)
}

/** coalesce(simulacao.advisor_id, cliente.advisor_id). */
export function resolverAdvisorId(row: SimulacaoComAdvisor): string | null {
  return textoId(row.advisor_id) ?? advisorIdDoCliente(row.clientes)
}

export function filtrarSimulacoesPorAssessor<T extends SimulacaoComAdvisor>(
  rows: T[],
  assessorId: string | null,
): T[] {
  if (assessorId == null || assessorId === "") return rows
  if (assessorId === SEM_ASSESSOR) {
    return rows.filter((row) => resolverAdvisorId(row) === null)
  }
  return rows.filter((row) => resolverAdvisorId(row) === assessorId)
}

export function labelAssessor(opt: AssessorOption): string {
  const n = opt.totalClientes
  const palavra = n === 1 ? "cliente" : "clientes"
  return `${opt.nome} · ${n} ${palavra}`
}
