"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { usePlano } from "@/lib/plano-context"
import { calcularInventario } from "@/lib/engine"

interface SucessorioProps {
  onNavigate: (section: string) => void
}

export function Sucessorio({ onNavigate }: SucessorioProps) {
  const { state, setSucessao, getPatrimonioLiquido } = usePlano()
  const { sucessao, dadosPessoais, ativos, passivos } = state
  const moeda = state.moeda ?? "BRL"

  const fmt = (v: number) =>
    new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: moeda === "USD" ? "USD" : "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v)

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

  const quinhaoPorHerdeiro = useMemo(() => Math.max(0, inventario.porHerdeiro || 0), [inventario.porHerdeiro])

  const itcmdDFProgressivo = useMemo(() => {
    const base = quinhaoPorHerdeiro
    if (base <= 1_000_000) return 4
    if (base <= 2_000_000) return 5
    if (base <= 3_000_000) return 6
    return 8
  }, [quinhaoPorHerdeiro])

  const [itcmdModo, setItcmdModo] = useState<"DF" | "SP" | "MG" | "RJ" | "RS" | "OUTROS">(() => {
    const atual = sucessao.itcmd ?? 0
    if (atual === itcmdDFProgressivo) return "DF"
    if (atual === 4) return "SP"
    if (atual === 5) return "MG"
    if (atual === 8) return "RJ"
    if (atual === 6) return "RS"
    return "OUTROS"
  })

  useEffect(() => {
    if (itcmdModo === "DF") {
      setSucessao({ itcmd: itcmdDFProgressivo })
    }
  }, [itcmdModo, itcmdDFProgressivo, setSucessao])

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
                ITCMD
              </Label>
              <div className="space-y-2">
                <Select
                  value={itcmdModo}
                  onValueChange={(value) => {
                    const v = value as typeof itcmdModo
                    setItcmdModo(v)
                    if (v === "DF") return setSucessao({ itcmd: itcmdDFProgressivo })
                    if (v === "SP") return setSucessao({ itcmd: 4 })
                    if (v === "MG") return setSucessao({ itcmd: 5 })
                    if (v === "RJ") return setSucessao({ itcmd: 8 })
                    if (v === "RS") return setSucessao({ itcmd: 6 })
                    // OUTROS: mantém valor atual e permite editar no input abaixo
                  }}
                >
                  <SelectTrigger className="bg-[#131929] border-white/10 text-foreground focus:border-primary focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="DF">DF — Progressivo (4% a 8%)</SelectItem>
                    <SelectItem value="SP">SP — 4%</SelectItem>
                    <SelectItem value="MG">MG — 5%</SelectItem>
                    <SelectItem value="RJ">RJ — 8%</SelectItem>
                    <SelectItem value="RS">RS — 6%</SelectItem>
                    <SelectItem value="OUTROS">Outros — inserir alíquota</SelectItem>
                  </SelectContent>
                </Select>

                {itcmdModo === "OUTROS" && (
                  <Input
                    type="number"
                    value={sucessao.itcmd || ""}
                    onChange={(e) => setSucessao({ itcmd: parseFloat(e.target.value) || 0 })}
                    className="bg-[#131929] border-white/10 text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Ex: 4"
                  />
                )}

                {itcmdModo === "DF" && (
                  <p className="text-xs text-muted-foreground">
                    Alíquota calculada: {itcmdDFProgressivo}% por herdeiro (quinhão de {fmt(quinhaoPorHerdeiro)})
                  </p>
                )}
              </div>
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
