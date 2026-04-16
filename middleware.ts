import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const DASHBOARD = "/dashboard"
const MEU_DIAGNOSTICO = "/meu-diagnostico"

function isLoginPath(path: string) {
  return path === "/login" || path.startsWith("/login/")
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  let role: "advisor" | "cliente" | null = null
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    if (profile?.role === "cliente") role = "cliente"
    else role = "advisor"
  }

  const homeForRole = role === "cliente" ? MEU_DIAGNOSTICO : DASHBOARD

  if (!user) {
    if (isLoginPath(path)) return supabaseResponse
    const u = request.nextUrl.clone()
    u.pathname = "/login"
    return NextResponse.redirect(u)
  }

  if (user && isLoginPath(path)) {
    const u = request.nextUrl.clone()
    u.pathname = homeForRole
    return NextResponse.redirect(u)
  }

  if (path === "/" || path === "") {
    const u = request.nextUrl.clone()
    u.pathname = homeForRole
    return NextResponse.redirect(u)
  }

  if (role === "cliente" && path === DASHBOARD) {
    const u = request.nextUrl.clone()
    u.pathname = MEU_DIAGNOSTICO
    return NextResponse.redirect(u)
  }

  if (role === "advisor" && path === MEU_DIAGNOSTICO) {
    const u = request.nextUrl.clone()
    u.pathname = DASHBOARD
    return NextResponse.redirect(u)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
