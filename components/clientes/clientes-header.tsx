import Image from "next/image"
import Link from "next/link"
import { Plus } from "lucide-react"

type ClientesHeaderProps = {
  novoCenarioHref: string
  showAdmin?: boolean
  adminActive?: boolean
}

export function ClientesHeader({
  novoCenarioHref,
  showAdmin = false,
  adminActive = false,
}: ClientesHeaderProps) {
  return (
    <header
      className="flex items-center justify-between bg-navy px-8"
      style={{ height: "var(--header-height)" }}
    >
      <Link href="/clientes" className="shrink-0">
        <Image
          src="/logo-voga.png"
          alt="Voga"
          width={120}
          height={32}
          className="h-8 w-auto brightness-0 invert"
        />
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        {showAdmin ? (
          <Link
            href="/admin"
            className="btn-header-outline"
            style={adminActive ? { background: "rgba(255,255,255,0.1)" } : undefined}
          >
            Admin
          </Link>
        ) : null}
        <Link href={novoCenarioHref} className="btn-header-primary shrink-0">
          <Plus className="w-4 h-4" />
          Novo Cenário
        </Link>
      </div>
    </header>
  )
}
