"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { PlanoState } from "@/lib/plano-context"

interface MeuDiagnosticoViewProps {
  state: PlanoState
}

export function MeuDiagnosticoView({ state }: MeuDiagnosticoViewProps) {
  const { dadosPessoais, premissas, kpis, sucessao, protecao } = state
  const moeda = state.moeda ?? "BRL"

  const fmtCurrency = (v: number) =>
    new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: moeda === "USD" ? "USD" : "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v)

  const fmtK = (v: number) => {
    const prefix = moeda === "USD" ? "US$ " : "R$ "
    if (Math.abs(v) >= 1_000_000) return `${prefix}${(v / 1_000_000).toFixed(1)}M`
    if (Math.abs(v) >= 1_000) return `${prefix}${(v / 1_000).toFixed(0)}K`
    return `${prefix}${v.toFixed(0)}`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Diagnóstico compartilhado</p>
        <h1 className="text-2xl font-semibold text-foreground">
          Olá, <span className="text-primary">{dadosPessoais.nome || "Cliente"}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Esta visão é somente leitura, preparada pelo seu assessor. Para dúvidas, fale com o escritório.
        </p>
      </div>

      {kpis ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-primary/30 bg-[rgba(30,92,230,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Patrimônio na aposentadoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{fmtK(kpis.patrimonioApos)}</p>
              <p className="text-xs text-muted-foreground mt-1">{fmtK(kpis.patrimonioAposReal)} em valor real</p>
            </CardContent>
          </Card>
          <Card className="border-[#22C787]/30 bg-[rgba(34,199,135,0.08)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Renda mensal real
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-[#22C787]">{fmtCurrency(kpis.rendaMensalReal)}</p>
              <p className="text-xs text-muted-foreground mt-1">Com {premissas.rendimento}% a.a.</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Os indicadores do plano ainda não foram calculados neste diagnóstico.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados resumidos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Renda mensal</span>
            <p className="font-medium">{fmtCurrency(dadosPessoais.renda)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Despesa mensal</span>
            <p className="font-medium">{fmtCurrency(dadosPessoais.despesa)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Herdeiros (sucessão)</span>
            <p className="font-medium">{sucessao.herdeiros}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Custo de vida (proteção)</span>
            <p className="font-medium">{fmtCurrency(protecao.custoVida)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
