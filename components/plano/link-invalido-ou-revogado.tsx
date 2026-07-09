import { Link2Off } from "lucide-react"

export function LinkInvalidoOuRevogado() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Link2Off className="w-8 h-8 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold text-foreground mb-2">Link inválido ou revogado</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        Este link de visualização não está mais disponível. Solicite um novo link ao seu assessor
        financeiro.
      </p>
    </div>
  )
}
