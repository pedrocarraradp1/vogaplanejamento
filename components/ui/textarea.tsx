'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'
import { FieldValueReadonly } from '@/components/ui/field-value-readonly'
import { usePlanoReadOnly } from '@/lib/plano-readonly-context'

function Textarea({ className, readOnly, value, ...props }: React.ComponentProps<'textarea'>) {
  const planoReadOnly = usePlanoReadOnly()

  if (planoReadOnly) {
    const exibicao =
      value === null || value === undefined || value === ""
        ? ""
        : String(value)
    return (
      <FieldValueReadonly
        className={cn(
          'border-input flex min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base md:text-sm whitespace-pre-wrap',
          className,
        )}
      >
        {exibicao}
      </FieldValueReadonly>
    )
  }

  return (
    <textarea
      data-slot="textarea"
      readOnly={readOnly}
      value={value}
      className={cn(
        'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
