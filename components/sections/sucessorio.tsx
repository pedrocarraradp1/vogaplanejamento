"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { usePlano } from "@/lib/plano-context"

interface SucessorioProps {
  onNavigate: (section: string) => void
}

export function Sucessorio({ onNavigate }: SucessorioProps) {
  const { state, setSucessao } = usePlano()
  const { sucessao } = state

  const formatCurrency = (value: number) => {
    if (!value) return ""
    return new Intl.NumberFormat("pt-BR").format(value)
  }

  const parseCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "")
    return parseInt(numericValue, 10) || 0
  }

  const handleProximo = () => {
    onNavigate("protecao")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Planejamento</p>
        <h1 className="text-2xl font-semibold text-foreground">
          Planejamento <span className="text-primary">Sucessório</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Estrutura de transmissão patrimonial, custos de inventário e proteção familiar
        </p>
      </div>

      {/* Card 1 - Parâmetros do Inventário */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">
            Parâmetros do Inventário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Alíquota ITCMD (%)
              </Label>
              <Input
                type="number"
                value={sucessao.itcmd || ""}
                onChange={(e) => setSucessao({ itcmd: parseFloat(e.target.value) || 0 })}
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground">
                Varia de 2% a 8% conforme o estado. DF: 4%
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Honorários Advocatícios (%)
              </Label>
              <Input
                type="number"
                value={sucessao.honorarios || ""}
                onChange={(e) => setSucessao({ honorarios: parseFloat(e.target.value) || 0 })}
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Custos Cartoriais (%)
              </Label>
              <Input
                type="number"
                value={sucessao.cartoriais || ""}
                onChange={(e) => setSucessao({ cartoriais: parseFloat(e.target.value) || 0 })}
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Número de Herdeiros
              </Label>
              <Input
                type="number"
                value={sucessao.herdeiros || ""}
                onChange={(e) => setSucessao({ herdeiros: parseInt(e.target.value) || 0 })}
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 - Proteção Financeira */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">
            Proteção Financeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Custo de Vida Mensal (R$)
              </Label>
              <Input
                value={formatCurrency(sucessao.custoVida)}
                onChange={(e) => setSucessao({ custoVida: parseCurrency(e.target.value) })}
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Anos de Cobertura Desejada
              </Label>
              <Input
                type="number"
                value={sucessao.anosCob || ""}
                onChange={(e) => setSucessao({ anosCob: parseInt(e.target.value) || 0 })}
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Educação dos Filhos (R$)
              </Label>
              <Input
                value={formatCurrency(sucessao.eduFilhos)}
                onChange={(e) => setSucessao({ eduFilhos: parseCurrency(e.target.value) })}
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Dívidas Pendentes (R$)
              </Label>
              <Input
                value={formatCurrency(sucessao.dividasPend)}
                onChange={(e) => setSucessao({ dividasPend: parseCurrency(e.target.value) })}
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => onNavigate("projecao")}
          className="border-border text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button 
          onClick={handleProximo}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Próximo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
