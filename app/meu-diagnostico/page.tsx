"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import type { PlanoState } from "@/lib/plano-context"
import { MeuDiagnosticoView } from "@/components/meu-diagnostico-view"
import { Button } from "@/components/ui/button"

function isPlanoState(x: unknown): x is PlanoState {
  return (
    typeof x === "object" &&
    x !== null &&
    "dadosPessoais" in x &&
    "premissas" in x
  )
}

export default function MeuDiagnosticoPage() {
  const [state, setState] = useState<PlanoState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) {
          if (!cancelled) setError("Sessão inválida.")
          return
        }
        const { data: row, error: rowErr } = await supabase
          .from("clientes")
          .select("dados")
          .eq("id", user.id)
          .maybeSingle()

        if (rowErr) {
          if (!cancelled) setError(rowErr.message)
          return
        }

        const raw = row?.dados
        if (raw && isPlanoState(raw)) {
          if (!cancelled) setState(raw)
        } else {
          if (!cancelled) setState(null)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Carregando diagnóstico…
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" onClick={() => signOut()}>
          Sair
        </Button>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-10 py-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            Sair
          </Button>
        </header>
        <main className="px-10 py-16 max-w-lg mx-auto text-center space-y-2">
          <h1 className="text-lg font-semibold">Nenhum plano disponível</h1>
          <p className="text-sm text-muted-foreground">
            Seu assessor ainda não publicou um diagnóstico para você. Quando estiver pronto, os dados aparecerão aqui.
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-10 py-4 flex justify-between items-center">
        <span className="text-sm font-medium text-foreground">Meu diagnóstico</span>
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          Sair
        </Button>
      </header>
      <main className="px-10 py-10">
        <MeuDiagnosticoView state={state} />
      </main>
    </div>
  )
}
