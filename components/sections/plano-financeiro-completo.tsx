"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { ArrowRight, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { usePlano } from "@/lib/plano-context"
import { Patrimonio } from "@/components/sections/patrimonio"
import { Objetivos } from "@/components/sections/objetivos"
import { FluxoDeCaixa } from "@/components/sections/fluxo-de-caixa"
import { Projecao } from "@/components/sections/projecao"
import { Cenarios } from "@/components/sections/cenarios"

interface PlanoFinanceiroCompletoProps {
  onNavigate: (section: string) => void
}

type SecaoId = "patrimonio" | "objetivos" | "fluxo" | "projecao" | "cenarios"

const STORAGE_KEY = "voga-plano-completo-secoes-ocultas"

const SECOES: { id: SecaoId; titulo: string; rota: string }[] = [
  { id: "patrimonio", titulo: "Balanço patrimonial", rota: "patrimonio" },
  { id: "objetivos", titulo: "Objetivos financeiros", rota: "objetivos" },
  { id: "fluxo", titulo: "Fluxo de caixa", rota: "fluxo-de-caixa" },
  { id: "projecao", titulo: "Projeção / aposentadoria", rota: "projecao" },
  { id: "cenarios", titulo: "Cenários", rota: "cenarios" },
]

function lerSecoesOcultas(): Set<SecaoId> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const ids = JSON.parse(raw) as SecaoId[]
    return new Set(ids.filter((id) => SECOES.some((s) => s.id === id)))
  } catch {
    return new Set()
  }
}

function SecaoHeader({
  titulo,
  visivel,
  onToggleVisibilidade,
  onVerDetalhes,
}: {
  titulo: string
  visivel: boolean
  onToggleVisibilidade: () => void
  onVerDetalhes: () => void
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-[16px] font-semibold text-foreground">{titulo}</h2>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={onToggleVisibilidade}
          title={visivel ? "Ocultar seção" : "Mostrar seção"}
          aria-label={visivel ? `Ocultar ${titulo}` : `Mostrar ${titulo}`}
        >
          {visivel ? (
            <>
              <EyeOff className="w-4 h-4 mr-1.5" />
              Ocultar
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-1.5" />
              Mostrar
            </>
          )}
        </Button>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90" onClick={onVerDetalhes}>
          Ver detalhes
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  )
}

function EstadoVazio({ texto = "Nenhum dado cadastrado ainda" }: { texto?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">{texto}</p>
    </div>
  )
}

export function PlanoFinanceiroCompleto({ onNavigate }: PlanoFinanceiroCompletoProps) {
  const { state, getPatrimonioTotalConsolidado } = usePlano()
  const [ocultas, setOcultas] = useState<Set<SecaoId>>(new Set())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setOcultas(lerSecoesOcultas())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ocultas]))
  }, [ocultas, hydrated])

  const toggleSecao = useCallback((id: SecaoId) => {
    setOcultas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const mostrarTodas = useCallback(() => setOcultas(new Set()), [])

  const temPatrimonio = useMemo(() => {
    const pl = getPatrimonioTotalConsolidado()
    const totalPassivos = (state.passivos ?? []).reduce(
      (s, p) => s + (Number(p?.saldoDevedor ?? p?.valor) || 0),
      0,
    )
    const totalAtivos = (state.ativos ?? []).reduce((s, a) => s + (Number(a?.valor) || 0), 0)
    return totalAtivos > 0 || totalPassivos > 0 || pl > 0
  }, [getPatrimonioTotalConsolidado, state.ativos, state.passivos])

  const temObjetivos = (state.objetivos?.length ?? 0) > 0
  const conteudoPorSecao: Record<SecaoId, ReactNode> = {
    patrimonio: temPatrimonio ? (
      <div className="plano-completo-readonly">
        <Patrimonio onNavigate={onNavigate} variant="planoCompleto" />
      </div>
    ) : (
      <EstadoVazio />
    ),
    objetivos: temObjetivos ? (
      <div className="plano-completo-readonly">
        <Objetivos onNavigate={onNavigate} />
      </div>
    ) : (
      <EstadoVazio />
    ),
    fluxo: (
      <div className="plano-completo-readonly">
        <FluxoDeCaixa onNavigate={onNavigate} variant="planoCompleto" />
      </div>
    ),
    projecao: (
      <div className="plano-completo-readonly">
        <Projecao onNavigate={onNavigate} variant="planoCompleto" />
      </div>
    ),
    cenarios: (
      <div className="plano-completo-readonly">
        <Cenarios onNavigate={onNavigate} variant="planoCompleto" />
      </div>
    ),
  }

  const qtdOcultas = ocultas.size

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Planejamento Financeiro</p>
        <h1 className="page-title text-[24px] text-foreground">
          Plano financeiro <span className="text-primary">completo</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Resumo visual em modo leitura. Use &quot;Ocultar&quot; em cada seção para personalizar o que o cliente vê.
        </p>
        {qtdOcultas > 0 && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              {qtdOcultas} {qtdOcultas === 1 ? "seção oculta" : "seções ocultas"}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={mostrarTodas}>
              <Eye className="w-3.5 h-3.5 mr-1.5" />
              Mostrar todas
            </Button>
          </div>
        )}
      </div>

      {SECOES.map((secao, index) => {
        const visivel = !ocultas.has(secao.id)
        const isLast = index === SECOES.length - 1

        return (
          <div
            key={secao.id}
            className={`space-y-4 ${isLast ? "" : "border-b border-border pb-8"}`}
          >
            <SecaoHeader
              titulo={secao.titulo}
              visivel={visivel}
              onToggleVisibilidade={() => toggleSecao(secao.id)}
              onVerDetalhes={() => onNavigate(secao.rota)}
            />
            {visivel ? (
              conteudoPorSecao[secao.id]
            ) : (
              <p className="text-sm text-muted-foreground italic py-2">
                Seção oculta — clique em &quot;Mostrar&quot; para exibir novamente.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
