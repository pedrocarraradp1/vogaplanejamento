"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

interface GrupoSelecaoUnicaProps {
  label: string
  value?: string
  options: readonly string[]
  onChange: (value: string) => void
  className?: string
}

export function GrupoSelecaoUnica({
  label,
  value,
  options,
  onChange,
  className,
}: GrupoSelecaoUnicaProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <RadioGroup
        value={value ?? ""}
        onValueChange={onChange}
        className="flex flex-wrap gap-x-4 gap-y-2"
      >
        {options.map((opt) => {
          const id = `${label}-${opt}`.replace(/\s+/g, "-").toLowerCase()
          return (
            <label
              key={opt}
              htmlFor={id}
              className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
            >
              <RadioGroupItem
                id={id}
                value={opt}
              />
              <span>{opt}</span>
            </label>
          )
        })}
      </RadioGroup>
    </div>
  )
}

interface GrupoSelecaoMultiplaProps {
  label: string
  values: readonly string[]
  options: readonly string[]
  onChange: (values: string[]) => void
  className?: string
}

export function GrupoSelecaoMultipla({
  label,
  values,
  options,
  onChange,
  className,
}: GrupoSelecaoMultiplaProps) {
  const toggle = (opt: string, checked: boolean) => {
    if (checked) {
      if (values.includes(opt)) return
      onChange([...values, opt])
      return
    }
    onChange(values.filter((v) => v !== opt))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((opt) => {
          const id = `${label}-${opt}`.replace(/\s+/g, "-").toLowerCase()
          const checked = values.includes(opt)
          return (
            <label
              key={opt}
              htmlFor={id}
              className="flex cursor-pointer items-center gap-2 text-sm text-foreground"
            >
              <Checkbox
                id={id}
                checked={checked}
                onCheckedChange={(v) => toggle(opt, v === true)}
                className="data-[state=checked]:bg-[#2D6DF5] data-[state=checked]:border-[#2D6DF5]"
              />
              <span>{opt}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
