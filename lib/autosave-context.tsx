"use client"

import { createContext, useContext, type ReactNode } from "react"
import {
  useAutosaveSimulacao,
  type AutosaveApi,
} from "@/hooks/use-autosave-simulacao"

const noop = async () => {}

const DEFAULT_AUTOSAVE: AutosaveApi = {
  status: "idle",
  lastSavedAt: null,
  error: null,
  salvarAgora: noop,
  draft: {
    exists: false,
    savedAt: null,
    restaurar: () => {},
    descartar: () => {},
  },
}

const AutosaveContext = createContext<AutosaveApi>(DEFAULT_AUTOSAVE)

export function AutosaveProvider({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  const value = useAutosaveSimulacao({ enabled })
  return <AutosaveContext.Provider value={value}>{children}</AutosaveContext.Provider>
}

export function useAutosave(): AutosaveApi {
  return useContext(AutosaveContext)
}
