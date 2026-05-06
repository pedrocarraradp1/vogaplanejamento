import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

type ClientesHeaderProps = {
  voltarHref: string
  novoCenarioHref: string
}

export function ClientesHeader({ voltarHref, novoCenarioHref }: ClientesHeaderProps) {
  return (
    <header className="h-16 bg-[#080C18] border-b border-white/10">
      <div className="mx-auto max-w-[1200px] h-full px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link href={voltarHref}>
            <Button
              variant="outline"
              className="h-9 shrink-0 border-white/10 bg-[#131929] text-muted-foreground hover:text-foreground hover:bg-white/5"
            >
              ← Voltar
            </Button>
          </Link>
          <Image src="/logo-voga.png" alt="Voga" width={96} height={32} className="h-8 w-auto shrink-0" />
          <span className="text-sm sm:text-[18px] font-medium text-white truncate min-w-0 max-w-[200px] sm:max-w-none">
            Planejamento Financeiro Pessoal
          </span>
        </div>
        <Link href={novoCenarioHref} className="shrink-0">
          <Button className="bg-[#1E5CE6] hover:bg-[#1E5CE6]/90 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Novo Cenário
          </Button>
        </Link>
      </div>
    </header>
  )
}
