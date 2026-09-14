"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase"
import { usePlano } from "@/lib/plano-context"
import { usePlanoReadOnly } from "@/lib/plano-readonly-context"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"
import {
  AUTOSAVE_DEBOUNCE_MS,
  AUTOSAVE_MAX_WAIT_MS,
  draftStorageKey,
  nextRetryDelayMs,
  parseDraftPayload,
  shouldAutosave,
  snapshotHash,
  type AutosaveStatus,
} from "@/lib/autosave"

export type AutosaveDraftApi = {
  exists: boolean
  savedAt: Date | null
  restaurar: () => void
  descartar: () => void
}

export type AutosaveApi = {
  status: AutosaveStatus
  lastSavedAt: Date | null
  error: string | null
  salvarAgora: () => Promise<void>
  draft: AutosaveDraftApi
}

function clearTimer(ref: { current: ReturnType<typeof setTimeout> | null }) {
  if (ref.current) {
    clearTimeout(ref.current)
    ref.current = null
  }
}

export function useAutosaveSimulacao({ enabled }: { enabled: boolean }): AutosaveApi {
  const { state, simulacaoMeta, loadState, setSimulacaoMeta } = usePlano()
  const readOnly = usePlanoReadOnly()
  const { toast } = useToast()

  const gateOn = enabled && !readOnly

  const [status, setStatus] = useState<AutosaveStatus>("idle")
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  )
  const [userId, setUserId] = useState<string | null>(null)
  const [draftExists, setDraftExists] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)

  const saveNowRef = useRef<() => Promise<void>>(async () => {})
  const lastSavedHash = useRef<string | null>(null)
  const inFlight = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxWaitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const attempt = useRef(0)
  const pendingAfterFlight = useRef(false)
  const conflictLock = useRef(false)
  const skipNextUpdatedAtBaseline = useRef(false)
  const wroteDraftThisSession = useRef(false)
  const baselineId = useRef<string | null | undefined>(undefined)
  const initialHash = useRef(snapshotHash(state))
  const stateRef = useRef(state)
  const metaRef = useRef(simulacaoMeta)
  const onlineRef = useRef(online)
  const userIdRef = useRef(userId)
  const gateRef = useRef(gateOn)
  const toastRef = useRef(toast)

  stateRef.current = state
  metaRef.current = simulacaoMeta
  onlineRef.current = online
  userIdRef.current = userId
  gateRef.current = gateOn
  toastRef.current = toast

  const persistDraft = useCallback(() => {
    const uid = userIdRef.current
    if (!uid) return
    const current = stateRef.current
    if (snapshotHash(current) === initialHash.current) return
    try {
      const key = draftStorageKey(uid, metaRef.current.clienteId)
      const savedAt = new Date().toISOString()
      localStorage.setItem(
        key,
        JSON.stringify({
          state: current,
          savedAt,
          clienteId: metaRef.current.clienteId,
        }),
      )
      wroteDraftThisSession.current = true
      setDraftExists(false)
      setDraftSavedAt(new Date(savedAt))
    } catch {
      // localStorage pode falhar (modo privado / cota)
    }
  }, [])

  const removeDraft = useCallback(() => {
    const uid = userIdRef.current
    if (!uid) return
    try {
      localStorage.removeItem(draftStorageKey(uid, metaRef.current.clienteId))
    } catch {
      // ignore
    }
    setDraftExists(false)
    setDraftSavedAt(null)
  }, [])

  const saveExisting = useCallback(async () => {
    if (conflictLock.current) return
    const meta = metaRef.current
    const id = meta.simulacaoId
    const uid = userIdRef.current
    if (!gateRef.current || !id || !uid) return

    const hashToSave = snapshotHash(stateRef.current)
    if (hashToSave === lastSavedHash.current) {
      setStatus("saved")
      return
    }
    if (inFlight.current) {
      pendingAfterFlight.current = true
      return
    }
    if (!onlineRef.current) {
      setStatus("offline")
      return
    }
    if (
      !shouldAutosave({
        enabled: gateRef.current,
        readOnly: false,
        simulacaoId: id,
        dirty: true,
        inFlight: false,
        online: true,
      })
    ) {
      return
    }

    inFlight.current = true
    setStatus("saving")
    setError(null)
    clearTimer(debounceTimer)
    clearTimer(maxWaitTimer)
    clearTimer(retryTimer)

    const nowIso = new Date().toISOString()
    const payload = stateRef.current
    try {
      const supabase = createClient()
      let query = supabase
        .from("simulacoes")
        .update({ dados: payload, updated_at: nowIso })
        .eq("id", id)
      const guard = meta.updatedAt
      if (guard) query = query.eq("updated_at", guard)
      const { data, error: updErr } = await query.select("updated_at")

      if (updErr) throw new Error(updErr.message)

      const rows = Array.isArray(data) ? data : data ? [data] : []
      if (guard && rows.length === 0) {
        conflictLock.current = true
        setStatus("conflict")
        setError("conflict")
        toastRef.current({
          variant: "destructive",
          title: "Este cenário foi alterado em outra aba ou por outro usuário. Recarregue a página para continuar.",
        })
        return
      }

      const nextUpdatedAt =
        (rows[0] as { updated_at?: string } | undefined)?.updated_at ?? nowIso
      lastSavedHash.current = hashToSave
      attempt.current = 0
      skipNextUpdatedAtBaseline.current = true
      setSimulacaoMeta({ updatedAt: nextUpdatedAt })
      setLastSavedAt(new Date())
      setStatus("saved")
      setError(null)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Erro ao salvar"
      setError(message)
      setStatus("error")
      const delay = nextRetryDelayMs(attempt.current)
      attempt.current += 1
      if (delay == null) {
        toastRef.current({
          variant: "destructive",
          title: "Não foi possível salvar automaticamente",
          action: (
            <ToastAction
              altText="Tentar novamente"
              onClick={() => {
                attempt.current = 0
                void saveNowRef.current()
              }}
            >
              Tentar novamente
            </ToastAction>
          ),
        })
      } else {
        retryTimer.current = setTimeout(() => {
          void saveNowRef.current()
        }, delay)
      }
    } finally {
      inFlight.current = false
      if (pendingAfterFlight.current && !conflictLock.current) {
        pendingAfterFlight.current = false
        void saveNowRef.current()
      }
    }
  }, [setSimulacaoMeta])

  saveNowRef.current = saveExisting

  const salvarAgora = useCallback(async () => {
    if (!gateRef.current) return
    if (!metaRef.current.simulacaoId) {
      persistDraft()
      return
    }
    attempt.current = 0
    conflictLock.current = false
    await saveExisting()
  }, [persistDraft, saveExisting])

  const restaurar = useCallback(() => {
    const uid = userIdRef.current
    if (!uid) return
    try {
      const parsed = parseDraftPayload(
        localStorage.getItem(draftStorageKey(uid, metaRef.current.clienteId)),
      )
      if (!parsed) return
      loadState(parsed.state, {
        simulacaoId: null,
        clienteId: parsed.clienteId ?? metaRef.current.clienteId,
      })
      lastSavedHash.current = snapshotHash(parsed.state)
      setDraftExists(false)
      setDraftSavedAt(parsed.savedAt ? new Date(parsed.savedAt) : null)
      setStatus("draft")
    } catch {
      // ignore
    }
  }, [loadState])

  const descartar = useCallback(() => {
    removeDraft()
    setStatus("draft")
  }, [removeDraft])

  useEffect(() => {
    if (!gateOn) return
    const supabase = createClient()
    void supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [gateOn])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])

  useEffect(() => {
    if (!gateOn) return
    if (!online && metaRef.current.simulacaoId && !conflictLock.current) {
      setStatus("offline")
      return
    }
    if (online && metaRef.current.simulacaoId && !conflictLock.current) {
      const dirty = snapshotHash(stateRef.current) !== lastSavedHash.current
      if (dirty) void saveNowRef.current()
    }
  }, [gateOn, online])

  useEffect(() => {
    if (!gateOn) return
    const id = simulacaoMeta.simulacaoId
    if (baselineId.current !== id) {
      const prev = baselineId.current
      baselineId.current = id
      lastSavedHash.current = snapshotHash(stateRef.current)
      attempt.current = 0
      conflictLock.current = false
      if (id) {
        if (prev === null) removeDraft()
        setStatus("saved")
        if (simulacaoMeta.updatedAt) setLastSavedAt(new Date(simulacaoMeta.updatedAt))
      } else {
        setStatus("draft")
      }
      return
    }
    if (skipNextUpdatedAtBaseline.current) {
      skipNextUpdatedAtBaseline.current = false
      return
    }
    if (id && simulacaoMeta.updatedAt) {
      lastSavedHash.current = snapshotHash(stateRef.current)
      setLastSavedAt(new Date(simulacaoMeta.updatedAt))
      setStatus("saved")
    }
  }, [gateOn, simulacaoMeta.simulacaoId, simulacaoMeta.updatedAt, removeDraft])

  useEffect(() => {
    if (!gateOn || !userId || simulacaoMeta.simulacaoId) return
    if (wroteDraftThisSession.current) return
    try {
      const parsed = parseDraftPayload(
        localStorage.getItem(draftStorageKey(userId, simulacaoMeta.clienteId)),
      )
      if (!parsed) return
      if (snapshotHash(parsed.state) === snapshotHash(stateRef.current)) return
      setDraftExists(true)
      setDraftSavedAt(parsed.savedAt ? new Date(parsed.savedAt) : null)
    } catch {
      // ignore
    }
  }, [gateOn, userId, simulacaoMeta.simulacaoId, simulacaoMeta.clienteId])

  useEffect(() => {
    if (!gateOn || !userId || conflictLock.current) return

    const id = simulacaoMeta.simulacaoId
    const hash = snapshotHash(state)

    if (!id) {
      setStatus("draft")
      if (hash === initialHash.current) return
      clearTimer(debounceTimer)
      debounceTimer.current = setTimeout(persistDraft, AUTOSAVE_DEBOUNCE_MS)
      return () => clearTimer(debounceTimer)
    }

    if (hash === lastSavedHash.current) {
      if (!inFlight.current) setStatus("saved")
      return
    }

    if (!online) {
      setStatus("offline")
      return
    }

    setStatus("dirty")
    clearTimer(debounceTimer)
    debounceTimer.current = setTimeout(() => {
      void saveNowRef.current()
    }, AUTOSAVE_DEBOUNCE_MS)
    if (!maxWaitTimer.current) {
      maxWaitTimer.current = setTimeout(() => {
        void saveNowRef.current()
      }, AUTOSAVE_MAX_WAIT_MS)
    }

    return () => clearTimer(debounceTimer)
  }, [gateOn, userId, state, simulacaoMeta.simulacaoId, online, persistDraft])

  useEffect(() => {
    if (!gateOn) return

    const flush = () => {
      if (!metaRef.current.simulacaoId || conflictLock.current) return
      const dirty = snapshotHash(stateRef.current) !== lastSavedHash.current
      if (dirty && !inFlight.current) void saveNowRef.current()
    }

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush()
    }
    const onPageHide = () => flush()
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!metaRef.current.simulacaoId) return
      const dirty = snapshotHash(stateRef.current) !== lastSavedHash.current
      if (dirty || inFlight.current) {
        e.preventDefault()
        e.returnValue = ""
      }
    }

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("pagehide", onPageHide)
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pagehide", onPageHide)
      window.removeEventListener("beforeunload", onBeforeUnload)
    }
  }, [gateOn])

  useEffect(() => {
    return () => {
      clearTimer(debounceTimer)
      clearTimer(maxWaitTimer)
      clearTimer(retryTimer)
    }
  }, [])

  return {
    status: gateOn ? status : "idle",
    lastSavedAt,
    error,
    salvarAgora,
    draft: {
      exists: gateOn && draftExists,
      savedAt: draftSavedAt,
      restaurar,
      descartar,
    },
  }
}
