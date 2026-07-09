"use client"

import { createContext, useContext, type ReactNode } from "react"

const PlanoReadOnlyContext = createContext(false)

export function PlanoReadOnlyProvider({
  readOnly,
  children,
}: {
  readOnly: boolean
  children: ReactNode
}) {
  return (
    <PlanoReadOnlyContext.Provider value={readOnly}>{children}</PlanoReadOnlyContext.Provider>
  )
}

export function usePlanoReadOnly(): boolean {
  return useContext(PlanoReadOnlyContext)
}
