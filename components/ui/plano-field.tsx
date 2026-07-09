"use client"

import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { FieldValueReadonly } from "@/components/ui/field-value-readonly"
import { usePlanoReadOnly } from "@/lib/plano-readonly-context"
import { cn } from "@/lib/utils"

export function PlanoField({
  label,
  htmlFor,
  readOnly,
  displayValue,
  emptyDisplay = "—",
  className,
  children,
}: {
  label: ReactNode
  htmlFor?: string
  /** Força modo leitura mesmo fora do link público. */
  readOnly?: boolean
  displayValue?: ReactNode
  emptyDisplay?: string
  className?: string
  children: ReactNode
}) {
  const planoReadOnly = usePlanoReadOnly()
  const somenteLeitura = readOnly ?? planoReadOnly

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="field-label">
        {label}
      </Label>
      {somenteLeitura ? (
        <FieldValueReadonly empty={emptyDisplay}>{displayValue}</FieldValueReadonly>
      ) : (
        children
      )}
    </div>
  )
}
