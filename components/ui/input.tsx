'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { FieldValueReadonly } from '@/components/ui/field-value-readonly'
import { usePlanoReadOnly } from '@/lib/plano-readonly-context'

function Input({ className, type, readOnly, value, ...props }: React.ComponentProps<'input'>) {
  const planoReadOnly = usePlanoReadOnly()
  const somenteLeitura = readOnly || planoReadOnly

  if (planoReadOnly) {
    const exibicao =
      value === null || value === undefined || value === ""
        ? ""
        : String(value)
    return <FieldValueReadonly className={cn('form-input', className)}>{exibicao}</FieldValueReadonly>
  }

  return (
    <input
      type={type}
      data-slot="input"
      readOnly={somenteLeitura}
      value={value}
      className={cn('form-input', className)}
      {...props}
    />
  )
}

export { Input }
