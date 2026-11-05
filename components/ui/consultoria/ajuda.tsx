"use client"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function AjudaConsultoria({ texto }: { texto: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="consultoria-ajuda" aria-label="Ajuda">
          i
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{texto}</TooltipContent>
    </Tooltip>
  )
}
