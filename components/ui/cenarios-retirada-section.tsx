"use client"

import { CenarioSecaoBox } from "@/components/ui/cenario-secao-box"
import { EstrategiaRetiradaAposentadoria } from "@/components/ui/estrategia-retirada-aposentadoria"
import { useDadosCenarios } from "@/lib/use-dados-cenarios"
import { cn } from "@/lib/utils"

type DisplayMode = "nominal" | "real"

export interface CenariosRetiradaSectionProps {
  displayMode?: DisplayMode
  className?: string
}

export function CenariosRetiradaSection({ displayMode = "real", className }: CenariosRetiradaSectionProps) {
  const dados = useDadosCenarios()

  return (
    <CenarioSecaoBox
      title="Estratégia de retirada na aposentadoria"
      description="Acumulação / preservação / consumo — escolhe-se a retirada mensal; a rentabilidade é independente."
      className={cn(className)}
    >
      <EstrategiaRetiradaAposentadoria
        hideHeader
        premissasCompletas={dados.premissasCompletas}
        objetivosEngine={dados.objetivosEngine}
        passivos={dados.passivos}
        rentabilidadeLiquidaPct={dados.rentabilidadeLiquidaDeBruta(dados.cenarioModerado)}
        displayMode={displayMode}
        inflacaoGlobal={dados.inflacaoGlobal}
        idadeAtualCalculada={dados.idadeAtualCalculada}
        projecaoModerada={dados.projecaoModerada}
        aliquotaIR={dados.aliquotaIR}
        fmtFull={dados.fmtFull}
        formatarMoeda={dados.formatarMoeda}
      />
    </CenarioSecaoBox>
  )
}
