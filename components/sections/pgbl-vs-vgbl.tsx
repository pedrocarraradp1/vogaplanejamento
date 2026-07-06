"use client"

import { EmBreve } from "./em-breve"

interface PgblVsVgblProps {
  onNavigate: (section: string) => void
}

export function PgblVsVgbl({ onNavigate }: PgblVsVgblProps) {
  return (
    <EmBreve
      grupo="Planejamento Fiscal"
      titulo="PGBL vs VGBL"
      onNavigate={onNavigate}
    />
  )
}
