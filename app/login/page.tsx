"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Mode = "login" | "signup"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function onSubmitLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signError) {
        setError(signError.message)
        return
      }
      router.replace("/")
      router.refresh()
    } catch {
      setError("Não foi possível entrar. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  async function onSubmitSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (signUpError) {
        setError(signUpError.message)
        return
      }
      setSuccess("Conta criada! Faça login.")
      setMode("login")
      setPassword("")
      setConfirmPassword("")
    } catch {
      setError("Não foi possível criar a conta. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-4 text-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {mode === "login" ? "Entrar" : "Criar conta"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Voga Planejamento Financeiro
            </p>
          </div>

          <div
            className="flex rounded-lg border border-border/80 p-0.5 bg-secondary"
            role="tablist"
            aria-label="Modo de acesso"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={cn(
                "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                mode === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setMode("login")
                setConfirmPassword("")
                setError(null)
                setSuccess(null)
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={cn(
                "flex-1 rounded-md py-2 text-sm font-medium transition-colors",
                mode === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setMode("signup")
                setError(null)
                setSuccess(null)
              }}
            >
              Criar conta
            </button>
          </div>
        </div>

        {mode === "login" ? (
          <form onSubmit={onSubmitLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-login">E-mail</Label>
              <Input
                id="email-login"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-login">Senha</Label>
              <Input
                id="password-login"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {success ? (
              <p className="text-sm text-[#1066DA]" role="status">
                {success}
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </Button>
          </form>
        ) : (
          <form onSubmit={onSubmitSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-signup">E-mail</Label>
              <Input
                id="email-signup"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-signup">Senha</Label>
              <Input
                id="password-signup"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Criando conta…" : "Criar conta"}
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
