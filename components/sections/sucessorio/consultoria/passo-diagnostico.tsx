"use client"

import { useMemo, useState } from "react"
import { CartaoRisco } from "@/components/ui/consultoria/cartao-risco"
import { GaugeScore } from "@/components/ui/consultoria/gauge-score"
import { LinhaDoTempoPatrimonio, type SegPatrimonio } from "@/components/ui/consultoria/linha-do-tempo-patrimonio"
import { NumeroHeroi } from "@/components/ui/consultoria/numero-heroi"
import type { Parecer } from "@/lib/sucessorio/consultoria"
import { fmtMoeda } from "./format"

export function PassoDiagnostico({ parecer, moeda }: { parecer: Parecer; moeda: "BRL" | "USD" }) {
  const [modo, setModo] = useState<"hoje" | "plano">("hoje")
  const inv = parecer.simulacoes.inventario
  const top = parecer.recomendacao.ranqueadas[0]
  const patrimonio = inv.patrimonio || parecer.simulacoes.espolio.patrimonio
  const pct = patrimonio > 0 ? (inv.total / patrimonio) * 100 : 0
  const segmentos = useMemo((): SegPatrimonio[] => {
    const fator =
      modo === "plano" && inv.total > 0 && top
        ? Math.max(0, 1 - top.economia / inv.total)
        : 1
    const itcmd = inv.itcmd * fator
    const honorarios = inv.honorarios * fator
    const custas = inv.custas * fator
    const multa = inv.multa * fator
    const custos = itcmd + honorarios + custas + multa
    return [
      { id: "itcmd", label: "ITCMD", valor: itcmd, cor: "#D64545" },
      { id: "hon", label: "Honorários", valor: honorarios, cor: "#E0A100" },
      { id: "cus", label: "Custas", valor: custas, cor: "#5B9BFF" },
      { id: "mul", label: "Multa", valor: multa, cor: "#4B759B" },
      { id: "sobra", label: "O que sobra", valor: Math.max(0, patrimonio - custos), cor: "#1F9D6A" },
    ]
  }, [modo, inv, top, patrimonio])

  return (
    <div className="consultoria-enter">
      <div className="consultoria-grid consultoria-bloco">
        <div className="consultoria-col-5 consultoria-surface" style={{ padding: 28 }}>
          <p className="consultoria-rotulo mb-4">Score de exposição</p>
          <GaugeScore score={parecer.diagnostico.score} nivel={parecer.diagnostico.nivel} />
        </div>
        <div className="consultoria-col-7 consultoria-surface" style={{ padding: 28 }}>
          <NumeroHeroi
            rotulo="Custo do inventário se nada for feito"
            valor={inv.total}
            moeda={moeda}
            hint={`Seus herdeiros receberiam ${fmtMoeda(inv.liquidoHerdeiros, moeda)}. O patrimônio ficaria indisponível durante o inventário.`}
            ajuda={`${pct.toFixed(1).replace(".", ",")} % do patrimônio.`}
          />
          <p className="consultoria-rotulo mt-4">{pct.toFixed(1).replace(".", ",")} % do patrimônio</p>
        </div>
      </div>

      <div className="consultoria-bloco">
        <LinhaDoTempoPatrimonio
          segmentos={segmentos}
          total={patrimonio}
          moeda={moeda}
          modo={modo}
          onModo={setModo}
        />
      </div>

      <div className="consultoria-grid">
        {parecer.diagnostico.riscos.map((r) => (
          <div key={r.id} className="consultoria-col-6">
            <CartaoRisco
              frente={r.frente}
              titulo={r.titulo}
              impacto={r.impactoReais}
              seNadaForFeito={r.seNadaForFeito}
              memoria={`${r.oQueSustenta} · ${r.fonte}`}
              urgencia={r.urgencia}
              moeda={moeda}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
