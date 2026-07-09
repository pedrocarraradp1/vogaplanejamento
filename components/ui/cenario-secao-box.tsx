import type { ReactNode } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface CenarioSecaoBoxProps {
  title: string
  children: ReactNode
  description?: ReactNode
  headerRight?: ReactNode
  className?: string
}

/** Mesmo padrão visual das seções da Projeção (ex.: Simulação Monte Carlo). */
export function CenarioSecaoBox({
  title,
  children,
  description,
  headerRight,
  className,
}: CenarioSecaoBoxProps) {
  return (
    <Card className={cn("form-card", className)}>
      <CardHeader className="pb-4">
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base font-medium text-foreground">{title}</CardTitle>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">{children}</CardContent>
    </Card>
  )
}
