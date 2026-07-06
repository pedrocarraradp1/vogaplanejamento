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
        <h1 className="page-title text-foreground">
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

      <div className="form-card p-12 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Construction className="w-7 h-7 text-primary" />
        </div>
        <p className="text-lg font-medium text-foreground">Em breve</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Estamos preparando esta funcionalidade para complementar o seu planejamento financeiro.
        </p>
      </div>

      {(prevSection || nextSection) && (
        <div className="nav-footer">
          {prevSection && (
            <Button
              variant="ghost"
              className="btn-back"
              onClick={() => onNavigate(prevSection)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          {nextSection && (
            <Button
              onClick={() => onNavigate(nextSection)}
              className="btn-next"
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
