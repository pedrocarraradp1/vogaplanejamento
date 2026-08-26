/**
 * Papéis em `public.profiles.role`.
 * A CHECK constraint (migration admin) aceita advisor | cliente | admin.
 */
export type ProfileRole = "advisor" | "cliente" | "admin"

export const ADMIN_SECTION_ID = "admin"

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin"
}

export function isClienteRole(role: string | null | undefined): boolean {
  return role === "cliente"
}

export function normalizeProfileRole(role: string | null | undefined): ProfileRole | null {
  if (role === "admin" || role === "cliente" || role === "advisor") return role
  return null
}
