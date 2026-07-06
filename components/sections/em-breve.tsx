"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight, Construction } from "lucide-react"

interface EmBreveProps {
  grupo: string
  titulo: string
  descricao?: string
  onNavigate: (section: string) => void
  prevSection?: string
  nextSection?: string
}

export function EmBreve({
  grupo,
  titulo,
  descricao = "Esta seção está em desenvolvimento e estará disponível em breve.",
  onNavigate,
  prevSection,
  nextSection,
}: EmBreveProps) {
  const tituloParts = titulo.split(" ")
  const destaque = tituloParts.pop() ?? titulo
  const prefixo = tituloParts.join(" ")

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{grupo}</p>
        <h1 className="text-3xl font-semibold text-foreground">
          {prefixo ? (
            <>
              {prefixo}{" "}
              <span className="text-primary">{destaque}</span>
            </>
          ) : (
            <span className="text-primary">{destaque}</span>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </div>

      <div className="rounded-xl bg-card border border-border p-12 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Construction className="w-7 h-7 text-primary" />
        </div>
        <p className="text-lg font-medium text-foreground">Em breve</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Estamos preparando esta funcionalidade para complementar o seu planejamento financeiro.
        </p>
      </div>

      {(prevSection || nextSection) && (
        <div className="flex items-center gap-3 pt-4">
          {prevSection && (
            <Button
              variant="outline"
              onClick={() => onNavigate(prevSection)}
              className="border-border text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          {nextSection && (
            <Button
              onClick={() => onNavigate(nextSection)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
