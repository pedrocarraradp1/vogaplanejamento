"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { FieldValueReadonly } from "@/components/ui/field-value-readonly"
import { cn } from "@/lib/utils"
import { usePlanoReadOnly } from "@/lib/plano-readonly-context"
import {
  centavosParaValorDecimal,
  extrairCentavos,
  formatarMoedaCentavos,
  type MoedaInput,
  valorDecimalParaCentavos,
} from "@/lib/moeda-input"

export interface InputMoedaProps
  extends Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange" | "inputMode"> {
  value?: number
  onChange?: (valor: number) => void
  moeda?: MoedaInput
  /** Quando true, exibe campo vazio em vez de "0,00" (padrão). */
  vazioQuandoZero?: boolean
}

export function InputMoeda({
  value = 0,
  onChange,
  moeda = "BRL",
  vazioQuandoZero = true,
  className,
  readOnly,
  onFocus,
  onBlur,
  ...props
}: InputMoedaProps) {
  const planoReadOnly = usePlanoReadOnly()
  const somenteLeitura = readOnly || planoReadOnly
  const valueCentavos = valorDecimalParaCentavos(value)
  const [centavos, setCentavos] = useState(valueCentavos)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) {
      setCentavos(valueCentavos)
    }
  }, [valueCentavos, focused])

  const formatar = (c: number) => formatarMoedaCentavos(c, moeda)
  const exibir = (c: number) => (vazioQuandoZero && c <= 0 ? "" : formatar(c))

  if (planoReadOnly && !readOnly) {
    return (
      <FieldValueReadonly className={cn("form-input tabular-nums", className)}>
        {exibir(valueCentavos)}
      </FieldValueReadonly>
    )
  }

  return (
    <Input
      type="text"
      inputMode="numeric"
      readOnly={somenteLeitura}
      value={exibir(readOnly ? valueCentavos : centavos)}
      onChange={(e) => {
        if (readOnly) return
        const novosCentavos = extrairCentavos(e.target.value)
        setCentavos(novosCentavos)
        onChange?.(centavosParaValorDecimal(novosCentavos))
      }}
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        onBlur?.(e)
      }}
      className={cn("tabular-nums", className)}
      {...props}
    />
  )
}
