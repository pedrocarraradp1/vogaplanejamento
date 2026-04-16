"use client"

import { cn } from "@/lib/utils"

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
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">V</span>
          </div>
          <div>
            <span className="text-foreground font-bold text-lg tracking-wide">VOGA</span>
            <p className="text-muted-foreground text-xs">btg pactual · Planejamento</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-4 border-t border-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
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
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-primary-foreground font-semibold text-sm">A</span>
          </div>
          <div>
            <p className="text-foreground font-medium text-sm">André</p>
            <p className="text-muted-foreground text-xs">Advisor · Voga Wealth</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
