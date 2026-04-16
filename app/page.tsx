/**
 * Rota "/" — redirecionamento por perfil é feito no middleware (advisor → /dashboard, cliente → /meu-diagnostico).
 */
export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
      Redirecionando…
    </div>
  )
}
