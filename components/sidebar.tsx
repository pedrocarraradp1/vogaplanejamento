"use client"

import { ChevronRight } from "lucide-react"
import { navGroupsForSession } from "@/lib/navegacao-plano"

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  /** `public` = apenas abas do link compartilhado com o cliente */
  variant?: "full" | "public"
  /** Só então a aba Admin aparece no menu. */
  isAdmin?: boolean
}

export function Sidebar({
  activeSection,
  onSectionChange,
  variant = "full",
  isAdmin = false,
}: SidebarProps) {
  const navGroups = navGroupsForSession({ variant, isAdmin })

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
