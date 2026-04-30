"use client"

import { cn } from "@/lib/utils"
import { Shield } from "lucide-react"

interface NavItem {
  id: string
  number: number
  label: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: "Cadastro do Cliente",
    items: [
      { id: "dados-pessoais", number: 1, label: "Dados Pessoais" },
      { id: "patrimonio", number: 2, label: "Patrimônio" },
      { id: "objetivos", number: 3, label: "Objetivos" },
    ],
  },
  {
    title: "Planejamento",
    items: [
      { id: "projecao", number: 4, label: "Projeção" },
      { id: "sucessorio", number: 5, label: "Sucessório" },
      { id: "protecao", number: 6, label: "Proteção Financeira" },
    ],
  },
  {
    title: "Resultado",
    items: [
      { id: "dashboard", number: 7, label: "Dashboard" },
    ],
  },
]

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <nav className="flex-1 py-8 px-3 space-y-6 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-3 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {group.title}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const isActive = activeSection === item.id
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      <span
                        className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {item.number}
                      </span>
                      {item.id === "protecao" && (
                        <Shield className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                      )}
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
