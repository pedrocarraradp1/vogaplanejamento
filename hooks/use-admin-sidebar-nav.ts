"use client"

import { useRouter } from "next/navigation"
import { useIsAdmin } from "@/hooks/use-is-admin"
import { ADMIN_SECTION_ID } from "@/lib/profile-role"

export function useAdminSidebarNav(setActiveSection: (section: string) => void) {
  const router = useRouter()
  const { isAdmin } = useIsAdmin()

  function onSectionChange(section: string) {
    if (section === ADMIN_SECTION_ID) {
      router.push("/admin")
      return
    }
    setActiveSection(section)
  }

  return { isAdmin, onSectionChange }
}
