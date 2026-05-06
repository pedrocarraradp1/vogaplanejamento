import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

type KpiStatCardProps = {
  label: string
  value: ReactNode
  icon: LucideIcon
  /** Caixa do ícone: padrão cinza ou destaque azul (ex.: patrimônio). */
  iconVariant?: "default" | "accent"
}

export function KpiStatCard({ label, value, icon: Icon, iconVariant = "default" }: KpiStatCardProps) {
  const accent = iconVariant === "accent"
  return (
    <Card className="bg-[#131929] border border-white/10 rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <div
              className={`text-3xl font-bold break-words ${accent ? "text-[#1E5CE6]" : "text-foreground"}`}
            >
              {value}
            </div>
          </div>
          <div
            className={`p-2 rounded-lg shrink-0 border ${
              accent ? "bg-[#1E5CE6]/10 border-[#1E5CE6]/30" : "bg-white/5 border-white/10"
            }`}
          >
            <Icon className={`w-5 h-5 ${accent ? "text-[#1E5CE6]" : "text-muted-foreground"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
