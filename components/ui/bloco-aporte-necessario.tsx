"use client"

import { Check, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const PAINEL_BG = "#F5F5F5"

export interface BlocoAporteDados {
  invalido: boolean
  aporteNecessario: number
  alvo: number
  alvoInvalidoMsg?: string
}

interface BlocoAporteNecessarioProps {
  titulo: string
  subtitulo: string
  corDestaque: string
  dados: BlocoAporteDados
  aporteAtual: number
  formatarMoedaCompleta: (valor: number) => string
  textoFolga: string
  textoFalta: string
  corFolgaFundo?: string
  corFolgaTexto?: string
}

export function BlocoAporteNecessario({
  titulo,
  subtitulo,
  corDestaque,
  dados,
  aporteAtual,
  formatarMoedaCompleta,
  textoFolga,
  textoFalta,
  corFolgaFundo = "#D0E0F0",
  corFolgaTexto,
}: BlocoAporteNecessarioProps) {
  const gap = aporteAtual - dados.aporteNecessario
  const maiorAporte = Math.max(aporteAtual, dados.aporteNecessario, 1)
  const suficiente = gap >= 0
  const textoCor = corFolgaTexto ?? corDestaque

  return (
    <Card className="form-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium text-foreground">{titulo}</CardTitle>
        <p className="text-sm text-muted-foreground">{subtitulo}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
            <p className="text-xs text-muted-foreground mb-1">Aporte necessário</p>
            <p className="text-[30px] leading-none font-bold" style={{ color: corDestaque }}>
              {dados.invalido ? "—" : formatarMoedaCompleta(dados.aporteNecessario)}
            </p>
          </div>
          <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
            <p className="text-xs text-muted-foreground mb-1">Aporte atual</p>
            <p className="text-[30px] leading-none font-bold text-foreground">
              {formatarMoedaCompleta(aporteAtual)}
            </p>
          </div>
        </div>

        <div style={{ background: PAINEL_BG, borderRadius: 12, padding: "16px" }}>
          <p className="text-xs text-muted-foreground mb-4">Comparativo mensal</p>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm font-medium text-foreground">Necessário</span>
                <span className="text-sm tabular-nums text-foreground">
                  {dados.invalido ? "—" : formatarMoedaCompleta(dados.aporteNecessario)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-white/80 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(dados.aporteNecessario / maiorAporte) * 100}%`,
                    background: corDestaque,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-sm font-medium text-foreground">Atual</span>
                <span className="text-sm tabular-nums text-foreground">
                  {formatarMoedaCompleta(aporteAtual)}
                </span>
              </div>
              <div className="h-3 rounded-full bg-white/80 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(aporteAtual / maiorAporte) * 100}%`,
                    background: "#01121E",
                  }}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Alvo: {formatarMoedaCompleta(dados.alvo)}
            {dados.invalido && dados.alvoInvalidoMsg ? ` · ${dados.alvoInvalidoMsg}` : ""}
          </p>
        </div>

        <div
          style={{
            borderRadius: 12,
            padding: "16px",
            background: suficiente ? corFolgaFundo : "#FBEAEA",
            color: suficiente ? textoCor : "var(--voga-alerta-texto)",
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{
                background: suficiente ? corDestaque : "var(--voga-alerta)",
                color: "#FFFFFF",
              }}
            >
              {suficiente ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="text-[26px] leading-tight font-bold">
                {suficiente
                  ? `+${formatarMoedaCompleta(gap)}/mês de folga`
                  : `Faltam ${formatarMoedaCompleta(Math.abs(gap))}/mês`}
              </p>
              <p className="text-sm mt-2 opacity-90">{suficiente ? textoFolga : textoFalta}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
