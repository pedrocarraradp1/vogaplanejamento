"use client"

import {
  Check,
  Clock,
  CloudOff,
  FileClock,
  Loader2,
  TriangleAlert,
  WifiOff,
} from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatHoraSalvo, type AutosaveStatus } from "@/lib/autosave"
import { cn } from "@/lib/utils"

export function AutosaveIndicator({
  status,
  lastSavedAt,
  onRetry,
  onReload,
}: {
  status: AutosaveStatus
  lastSavedAt: Date | null
  onRetry: () => void
  onReload: () => void
}) {
  if (status === "idle") return null

  const base = "inline-flex items-center gap-1.5 text-[12px] text-white/80 min-w-[11rem]"

  if (status === "saved") {
    return (
      <span className={base} aria-live="polite">
        <Check className="h-3.5 w-3.5 shrink-0" />
        {lastSavedAt ? `Salvo às ${formatHoraSalvo(lastSavedAt)}` : "Salvo"}
      </span>
    )
  }

  if (status === "dirty") {
    return (
      <span className={base} aria-live="polite">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        Alterações pendentes
      </span>
    )
  }

  if (status === "saving") {
    return (
      <span className={base} aria-live="polite">
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        Salvando…
      </span>
    )
  }

  if (status === "error") {
    return (
      <span className={base} aria-live="polite">
        <CloudOff className="h-3.5 w-3.5 shrink-0" />
        Erro ao salvar ·{" "}
        <button type="button" className="underline underline-offset-2" onClick={onRetry}>
          Tentar novamente
        </button>
      </span>
    )
  }

  if (status === "offline") {
    return (
      <span className={base} aria-live="polite">
        <WifiOff className="h-3.5 w-3.5 shrink-0" />
        Offline · salvará ao reconectar
      </span>
    )
  }

  if (status === "conflict") {
    return (
      <span className={cn(base, "text-amber-200")} aria-live="polite">
        <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
        Alterado em outra aba ·{" "}
        <button type="button" className="underline underline-offset-2" onClick={onReload}>
          Recarregar
        </button>
      </span>
    )
  }

  if (status === "draft") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={base} aria-live="polite">
            <FileClock className="h-3.5 w-3.5 shrink-0" />
            Rascunho local
          </span>
        </TooltipTrigger>
        <TooltipContent>Salve o cenário para gravar no servidor</TooltipContent>
      </Tooltip>
    )
  }

  return null
}
