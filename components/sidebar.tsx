"use client"

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
      { id: "patrimonio", label: "Balanço Patrimonial" },
      { id: "objetivos", label: "Objetivos" },
      { id: "projecao", label: "Projeções / Aposentadoria" },
      { id: "cenarios", label: "Cenários" },
      { id: "fluxo-de-caixa", label: "Fluxo de Caixa" },
      { id: "diagnostico-financeiro", label: "Diagnóstico Financeiro" },
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
    <aside
      className="sidebar-nav-scroll fixed left-0 z-40 flex flex-col bg-navy overflow-y-auto overflow-x-hidden"
      style={{
        top: "var(--header-height)",
        width: "var(--sidebar-width)",
        height: "calc(100vh - var(--header-height))",
        maxHeight: "calc(100vh - var(--header-height))",
        paddingTop: 24,
        paddingBottom: 24,
        overscrollBehavior: "contain",
      }}
    >
      <nav>
        {navGroups.map((group) => (
          <div key={group.title}>
            <span className="sidebar-group-label">{group.title}</span>
            <ul>
              {group.items.map((item) => {
                const isActive = activeSection === item.id
                return (
                  <li key={item.id}>
                    {isActive ? (
                      <button
                        type="button"
                        onClick={() => onSectionChange(item.id)}
                        className="sidebar-item-active"
                      >
                        <span>{item.label}</span>
                        <ChevronRight className="h-4 w-4 shrink-0" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSectionChange(item.id)}
                        className="sidebar-item"
                      >
                        {item.label}
                      </button>
                    )}
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
