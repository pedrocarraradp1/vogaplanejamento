import type { ReactNode } from "react"
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
    <div className="kpi-card">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 min-w-0 flex-1">
          <p
            className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-label)]"
          >
            {label}
          </p>
          <div
            className={`text-[28px] font-normal break-words ${
              accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
            }`}
          >
            {value}
          </div>
        </div>
        <div
          className={`p-2 rounded-lg shrink-0 border ${
            accent
              ? "bg-[var(--accent-light)] border-[var(--accent)]/30"
              : "bg-[var(--surface)] border-[var(--border)]"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${accent ? "text-[var(--accent)]" : "text-[var(--text-label)]"}`}
          />
        </div>
      </div>
    </div>
  )
}
