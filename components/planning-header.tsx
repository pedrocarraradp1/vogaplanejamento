"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"
import { usePlano } from "@/lib/plano-context"
import { SalvarSimulacaoModal } from "@/components/simulacoes/salvar-simulacao-modal"

function ToggleMoeda() {
  const { state, setMoeda } = usePlano()
  const moeda = state.moeda ?? "BRL"

  return (
    <div className="flex items-center gap-1">
      {(["BRL", "USD"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMoeda(m)}
          className="btn-header-outline"
          style={moeda === m ? { background: "rgba(255,255,255,0.1)" } : undefined}
        >
          {m === "BRL" ? "R$" : "US$"}
        </button>
      ))}
    </div>
  )
}

type PlanningHeaderProps = {
  voltarHref?: string
  breadcrumb?: ReactNode
  showMoedaToggle?: boolean
  showSalvar?: boolean
}

export function PlanningHeader({
  voltarHref = "/clientes",
  breadcrumb,
  showMoedaToggle = true,
  showSalvar = true,
}: PlanningHeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-navy px-8"
      style={{ height: "var(--header-height)" }}
    >
      <Link href="/clientes" className="shrink-0">
        <Image
          src="/logo-voga.png"
          alt="Voga"
          width={120}
          height={32}
          className="h-8 w-auto brightness-0 invert"
          priority
        />
      </Link>

      <div className="flex items-center gap-3 shrink-0">
        <Link href={voltarHref} className="btn-header-outline">
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar
        </Link>
        {breadcrumb}
        {showMoedaToggle && <ToggleMoeda />}
        {showSalvar && <SalvarSimulacaoModal />}
      </div>
    </header>
  )
}

export function PlanningBreadcrumb() {
  const { simulacaoMeta, state } = usePlano()
  if (!simulacaoMeta.clienteId || !simulacaoMeta.nomeCenario) return null
  const nome = state.dadosPessoais.nome?.trim() || "Cliente"
  return (
    <Link
      href={`/clientes/${simulacaoMeta.clienteId}`}
      className="hidden sm:inline-flex btn-header-outline text-[12px]"
    >
      ← {nome} · {simulacaoMeta.nomeCenario}
    </Link>
  )
}
