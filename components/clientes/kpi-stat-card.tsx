import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

type KpiStatCardProps = {
  label: string
  value: ReactNode
  icon: LucideIcon
  iconVariant?: "default" | "accent"
}

export function KpiStatCard({ label, value, icon: Icon, iconVariant = "default" }: KpiStatCardProps) {
  const accent = iconVariant === "accent"
  return (
    <Card className="rounded-lg border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <div className={`text-2xl font-bold break-words ${accent ? "text-primary" : "text-foreground"}`}>
              {value}
            </div>
          </div>
          <div
            className={`p-2 rounded-lg shrink-0 border ${
              accent ? "bg-primary/10 border-primary/30" : "bg-secondary border-border"
            }`}
          >
            <Icon className={`w-5 h-5 ${accent ? "text-primary" : "text-muted-foreground"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
