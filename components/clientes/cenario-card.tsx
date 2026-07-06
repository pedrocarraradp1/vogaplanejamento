import type { MouseEvent } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Copy, Trash2 } from "lucide-react"

type CenarioCardProps = {
  nomeCenario: string
  sublinha: string
  patrimonioProjetadoLabel: string
  abrirHref: string
  onDuplicar: (e: MouseEvent) => void
  onExcluir: (e: MouseEvent) => void
}

export function CenarioCard({
  nomeCenario,
  sublinha,
  patrimonioProjetadoLabel,
  abrirHref,
  onDuplicar,
  onExcluir,
}: CenarioCardProps) {
  return (
    <div className="kpi-card transition-colors hover:border-[var(--accent)]/40">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{nomeCenario}</p>
          <p className="text-xs text-muted-foreground">{sublinha}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Patrimônio projetado:{" "}
            <span className="text-[var(--accent)] font-medium">{patrimonioProjetadoLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onDuplicar}
            className="h-9 w-9 border-border bg-transparent text-muted-foreground hover:text-foreground"
            title="Duplicar"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onExcluir}
            className="h-9 w-9 border-border bg-transparent text-destructive hover:text-destructive hover:bg-destructive/10"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Link
            href={abrirHref}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground hover:translate-x-0.5"
            title="Abrir cenário"
          >
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
