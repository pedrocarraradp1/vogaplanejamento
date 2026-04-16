"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { usePlano } from "@/lib/plano-context"
import { calcularInventario } from "@/lib/engine"

interface SucessorioProps {
  onNavigate: (section: string) => void
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

export function Sucessorio({ onNavigate }: SucessorioProps) {
  const { state, setSucessao, getPatrimonioLiquido } = usePlano()
  const { sucessao, dadosPessoais, ativos, passivos } = state

  const totalPassivosInv = useMemo(
    () => passivos.reduce((s, p) => s + (p.valor || 0), 0),
    [passivos]
  )

  const plInventario = sucessao.plEditavel > 0 ? sucessao.plEditavel : getPatrimonioLiquido()
  const regimeInventario =
    sucessao.regimeSucessao || dadosPessoais.regime || "Comunhão Parcial de Bens"

  const inventario = useMemo(
    () =>
      calcularInventario(
        plInventario,
        regimeInventario,
        sucessao.herdeiros,
        sucessao.itcmd,
        sucessao.honorarios,
        sucessao.cartoriais,
        ativos,
        totalPassivosInv,
      ),
    [
      plInventario,
      regimeInventario,
      sucessao.herdeiros,
      sucessao.itcmd,
      sucessao.honorarios,
      sucessao.cartoriais,
      ativos,
      totalPassivosInv,
    ]
  )

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

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-foreground">
            Prévia — Inventário sucessório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-4 text-muted-foreground">
            <span>Valor da herança (estimado)</span>
            <span className="font-medium text-foreground tabular-nums">{fmt(inventario.heranca)}</span>
          </div>
          <div className="flex justify-between gap-4 text-muted-foreground">
            <span>Custo total previsto (sobre a herança)</span>
            <span className="font-medium text-foreground tabular-nums">{fmt(inventario.custoTotal)}</span>
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
