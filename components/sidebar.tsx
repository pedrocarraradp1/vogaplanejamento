"use client"

import { cn } from "@/lib/utils"
import { ChevronRight } from "lucide-react"

interface NavItem {
  id: string
  label: string
}

interface NavGroup {
  title: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    title: "Cadastro do Cliente",
    items: [{ id: "dados-pessoais", label: "Dados Pessoais" }],
  },
  {
    title: "Planejamento Financeiro",
    items: [
      { id: "patrimonio", label: "Patrimônio" },
      { id: "objetivos", label: "Objetivos" },
      { id: "fluxo-de-caixa", label: "Fluxo de Caixa" },
      { id: "diagnostico-financeiro", label: "Diagnóstico Financeiro" },
    ],
  },
  {
    title: "Planejamento Patrimonial",
    items: [
      { id: "projecao", label: "Projeção" },
      { id: "cenarios", label: "Cenários" },
    ],
  },
  {
    title: "Planejamento Sucessório",
    items: [{ id: "sucessorio", label: "Sucessório" }],
  },
  {
    title: "Gestão de Risco e Proteção",
    items: [
      { id: "protecao", label: "Proteção Financeira" },
      { id: "simulador-seguros", label: "Simulador de Seguros" },
    ],
  },
  {
    title: "Planejamento Fiscal",
    items: [
      { id: "pgbl-vs-vgbl", label: "PGBL vs VGBL" },
      { id: "eficiencia-tributaria", label: "Eficiência Tributária" },
    ],
  },
  {
    title: "Diagnóstico",
    items: [{ id: "dashboard", label: "Dashboard" }],
  },
]

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-16 z-40 flex h-[calc(100vh-4rem)] w-64 flex-col bg-navy">
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <h3 className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/40">
              {group.title}
            </h3>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activeSection === item.id
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSectionChange(item.id)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium transition-colors rounded-none",
                        isActive
                          ? "bg-white/[0.08] text-white border-r-[3px] border-primary"
                          : "text-white/75 hover:bg-navy-light hover:text-white border-r-[3px] border-transparent"
                      )}
                    >
                      <span className="truncate text-left">{item.label}</span>
                      {isActive && <ChevronRight className="h-4 w-4 shrink-0 text-white/90" />}
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
