"use client"

import { useEffect, useState } from "react"
import { createClient, type ProfileRole } from "@/lib/supabase"
import { isAdminRole, normalizeProfileRole } from "@/lib/profile-role"

type ProfileRoleState = {
  role: ProfileRole | null
  isAdmin: boolean
  loading: boolean
}

/**
 * Lê `profiles.role` do usuário autenticado (mesma fonte do middleware).
 */
export function useProfileRole(): ProfileRoleState {
  const [role, setRole] = useState<ProfileRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth?.user) {
          if (!cancelled) {
            setRole(null)
            setLoading(false)
          }
          return
        }
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", auth.user.id)
          .maybeSingle()
        if (!cancelled) {
          setRole(normalizeProfileRole(data?.role ?? null))
        }
      } catch {
        if (!cancelled) setRole(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { role, isAdmin: isAdminRole(role), loading }
}

export function useIsAdmin() {
  const { isAdmin, loading } = useProfileRole()
  return { isAdmin, loading }
}
