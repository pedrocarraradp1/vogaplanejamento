export type AutosaveStatus =
  | "idle"
  | "dirty"
  | "saving"
  | "saved"
  | "error"
  | "offline"
  | "conflict"
  | "draft"

export const AUTOSAVE_DEBOUNCE_MS = 1500
export const AUTOSAVE_MAX_WAIT_MS = 10000

const RETRY_DELAYS_MS = [2000, 5000, 15000] as const

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value
  if (Array.isArray(value)) return value.map(sortKeys)
  const obj = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(obj).sort()) {
    out[key] = sortKeys(obj[key])
  }
  return out
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value))
}

/** FNV-1a 32 bits em hex (8 chars). */
export function snapshotHash(state: unknown): string {
  const input = stableStringify(state)
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

export function shouldAutosave(p: {
  enabled: boolean
  readOnly: boolean
  simulacaoId: string | null
  dirty: boolean
  inFlight: boolean
  online: boolean
}): boolean {
  return (
    p.enabled &&
    !p.readOnly &&
    Boolean(p.simulacaoId) &&
    p.dirty &&
    !p.inFlight &&
    p.online
  )
}

/** Tentativas 0, 1, 2 → 2s / 5s / 15s; depois para. */
export function nextRetryDelayMs(attempt: number): number | null {
  if (attempt < 0 || attempt >= RETRY_DELAYS_MS.length) return null
  return RETRY_DELAYS_MS[attempt]
}

export function draftStorageKey(userId: string, clienteId: string | null): string {
  return `voga:rascunho:${userId}:${clienteId ?? "novo"}`
}

export function formatHoraSalvo(d: Date): string {
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export type AutosaveDraftPayload = {
  state: unknown
  savedAt: string
  clienteId: string | null
}

export function parseDraftPayload(raw: string | null): AutosaveDraftPayload | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<AutosaveDraftPayload>
    if (!parsed || typeof parsed !== "object" || parsed.state === undefined) return null
    return {
      state: parsed.state,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
      clienteId: parsed.clienteId ?? null,
    }
  } catch {
    return null
  }
}
