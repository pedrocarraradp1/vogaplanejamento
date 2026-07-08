"use client"

import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

interface ControlesSimulacaoProps {
  rentabilidadeBruta: number
  rentabilidadeRealEquivalente: number
  inflacaoPct: number
  despesaMensal: number
  aporteMensal: number
  retiradaMensal: number
  idadeAposentadoria: number
  formatarMoedaCompleta: (valor: number) => string
  onRentabilidadeBrutaChange: (valor: number) => void
  onDespesaMensalChange: (valor: number) => void
  onRetiradaMensalChange: (valor: number) => void
  onIdadeAposentadoriaChange: (valor: number) => void
}

function BlocoSlider({
  label,
  valor,
  min,
  max,
  step,
  onChange,
  legenda,
}: {
  label: string
  valor: number
  min: number
  max: number
  step: number
  onChange: (valor: number) => void
  legenda?: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <Label className="field-label">{label}</Label>
        <span className="text-sm font-semibold text-foreground tabular-nums">{legenda ?? valor}</span>
      </div>
      <Slider
        value={[valor]}
        min={min}
        max={max}
        step={step}
        onValueChange={(values) => onChange(values[0] ?? valor)}
      />
    </div>
  )
}

export function ControlesSimulacao({
  rentabilidadeBruta,
  rentabilidadeRealEquivalente,
  inflacaoPct,
  despesaMensal,
  aporteMensal,
  retiradaMensal,
  idadeAposentadoria,
  formatarMoedaCompleta,
  onRentabilidadeBrutaChange,
  onDespesaMensalChange,
  onRetiradaMensalChange,
  onIdadeAposentadoriaChange,
}: ControlesSimulacaoProps) {
  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-4">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1">
          <BlocoSlider
            label="Rentabilidade bruta (% a.a.)"
            valor={rentabilidadeBruta}
            min={0}
            max={20}
            step={0.5}
            legenda={`${rentabilidadeBruta.toFixed(1).replace(".", ",")}%`}
            onChange={onRentabilidadeBrutaChange}
          />
          <p className="text-xs text-muted-foreground">
            ≈ {rentabilidadeRealEquivalente.toFixed(1).replace(".", ",")}% real, com inflação de{" "}
            {inflacaoPct.toFixed(1).replace(".", ",")}%
          </p>
        </div>

        <div className="space-y-3">
          <BlocoSlider
            label="Despesa mensal"
            valor={despesaMensal}
            min={0}
            max={300000}
            step={500}
            legenda={formatarMoedaCompleta(despesaMensal)}
            onChange={onDespesaMensalChange}
          />
          <p className="text-xs text-muted-foreground">
            Aporte: <span className="font-medium text-foreground">{formatarMoedaCompleta(aporteMensal)}</span>
          </p>
        </div>

        <BlocoSlider
          label="Retirada mensal desejada"
          valor={retiradaMensal}
          min={0}
          max={300000}
          step={500}
          legenda={formatarMoedaCompleta(retiradaMensal)}
          onChange={onRetiradaMensalChange}
        />

        <BlocoSlider
          label="Idade de aposentadoria"
          valor={idadeAposentadoria}
          min={30}
          max={90}
          step={1}
          legenda={`${idadeAposentadoria} anos`}
          onChange={onIdadeAposentadoriaChange}
        />
      </div>
    </div>
  )
}
