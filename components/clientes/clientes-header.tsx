import Image from "next/image"
import Link from "next/link"
import { Plus } from "lucide-react"

type ClientesHeaderProps = {
  voltarHref: string
  novoCenarioHref: string
}

export function ClientesHeader({ voltarHref, novoCenarioHref }: ClientesHeaderProps) {
  return (
    <header className="h-16 bg-navy border-b border-border">
      <div className="mx-auto max-w-[1200px] h-full px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href={voltarHref} className="btn-ghost-nav shrink-0">
            ← Voltar
          </Link>
          <Link href="/clientes" className="shrink-0">
            <Image
              src="/logo-voga.png"
              alt="Voga"
              width={120}
              height={40}
              className="h-8 w-auto brightness-0 invert"
            />
          </Link>
        </div>
        <Link href={novoCenarioHref} className="shrink-0">
          <span className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4" />
            Novo Cenário
          </span>
        </Link>
      </div>
    </header>
  )
}
