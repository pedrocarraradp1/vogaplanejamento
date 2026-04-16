"use client"

import { useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { ContentArea } from "@/components/content-area"
import { PlanoProvider } from "@/lib/plano-context"

export default function DashboardPage() {
  const [activeSection, setActiveSection] = useState("dados-pessoais")

  return (
    <PlanoProvider>
      <div className="min-h-screen bg-background">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <ContentArea
          activeSection={activeSection}
          onNavigate={setActiveSection}
        />
      </div>
    </PlanoProvider>
  )
}
