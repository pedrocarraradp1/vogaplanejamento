"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { PlanningHeader } from "@/components/planning-header"
import { AdminMetricas } from "@/components/sections/admin-metricas"
import { useIsAdmin } from "@/hooks/use-is-admin"
import { ADMIN_SECTION_ID } from "@/lib/profile-role"

export default function AdminPage() {
  const router = useRouter()
  const { isAdmin, loading } = useIsAdmin()

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/clientes")
    }
  }, [isAdmin, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Carregando…
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Redirecionando…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PlanningHeader showMoedaToggle={false} showSalvar={false} autosave={false} />
      <Sidebar
        activeSection={ADMIN_SECTION_ID}
        isAdmin
        onSectionChange={(section) => {
          if (section !== ADMIN_SECTION_ID) router.push("/dashboard")
        }}
      />
      <main
        className="flex-1 bg-background min-h-[calc(100vh-var(--header-height))]"
        style={{
          marginLeft: "var(--sidebar-width)",
          marginTop: "var(--header-height)",
          padding: "40px 48px",
        }}
      >
        <AdminMetricas />
      </main>
    </div>
  )
}
