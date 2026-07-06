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
    <div className="toggle-pill">
      {(["BRL", "USD"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMoeda(m)}
          className={`toggle-pill-item ${moeda === m ? "toggle-pill-item-active" : ""}`}
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
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-navy border-b border-border">
      <div className="h-full flex items-center justify-between gap-4 px-6">
        <Link href="/clientes" className="shrink-0">
          <Image
            src="/logo-voga.png"
            alt="Voga"
            width={120}
            height={40}
            className="h-8 w-auto brightness-0 invert"
            priority
          />
        </Link>

        <div className="flex items-center gap-3 shrink-0">
          <Link href={voltarHref} className="btn-ghost-nav">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          {breadcrumb}
          {showMoedaToggle && <ToggleMoeda />}
          {showSalvar && <SalvarSimulacaoModal />}
        </div>
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
      className="hidden sm:inline-flex text-xs font-medium text-white/70 hover:text-white px-3 py-2 rounded-md border border-white/20"
    >
      ← {nome} · {simulacaoMeta.nomeCenario}
    </Link>
  )
}
