"use client"

import { Suspense, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ContentArea } from "@/components/content-area"
import { PlanoProvider } from "@/lib/plano-context"
import { AutosaveProvider, useAutosave } from "@/lib/autosave-context"
import { PlanningBreadcrumb, PlanningHeader } from "@/components/planning-header"
import { DraftRestoreBanner } from "@/components/simulacoes/draft-restore-banner"
import { useAdminSidebarNav } from "@/hooks/use-admin-sidebar-nav"

function DocumentosShell() {
  const [activeSection, setActiveSection] = useState("documentos")
  const { isAdmin, onSectionChange } = useAdminSidebarNav(setActiveSection)
  const { draft } = useAutosave()

  return (
    <>
      <PlanningHeader breadcrumb={<PlanningBreadcrumb />} />
      {draft.exists ? (
        <div
          className="relative z-30"
          style={{
            marginLeft: "var(--sidebar-width)",
            paddingTop: "calc(var(--header-height) + 12px)",
            paddingLeft: 48,
            paddingRight: 48,
          }}
        >
          <DraftRestoreBanner
            savedAt={draft.savedAt}
            onRestore={draft.restaurar}
            onDiscard={draft.descartar}
          />
        </div>
      ) : null}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        isAdmin={isAdmin}
      />
      <ContentArea activeSection={activeSection} onNavigate={onSectionChange} />
    </>
  )
}

export default function DocumentosPage() {
  return (
    <PlanoProvider>
      <AutosaveProvider enabled>
        <div className="min-h-screen bg-background">
          <Suspense fallback={null}>
            <DocumentosShell />
          </Suspense>
        </div>
      </AutosaveProvider>
    </PlanoProvider>
  )
}
