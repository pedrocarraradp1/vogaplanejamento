"use client"

import { BarraComparativa } from "@/components/ui/consultoria/barra-comparativa"
import { CartaoEstrategia } from "@/components/ui/consultoria/cartao-estrategia"
import { ChecklistFase } from "@/components/ui/consultoria/checklist-fase"
import { NumeroHeroi } from "@/components/ui/consultoria/numero-heroi"
import type { Parecer } from "@/lib/sucessorio/consultoria"

export function PassoRecomendacao({
  parecer,
  moeda,
  locked,
  publico,
  concluidas,
  onToggleAcao,
}: {
  parecer: Parecer
  moeda: "BRL" | "USD"
  locked: boolean
  publico: boolean
  concluidas: string[]
  onToggleAcao: (id: string) => void
}) {
  const top = parecer.recomendacao.ranqueadas[0]
  const elegiveis = parecer.recomendacao.ranqueadas.filter((e) => e.elegivel)
  const manter = elegiveis.find((e) => e.id === "manter")
  const barrasFonte = publico
    ? [top, manter].filter(Boolean)
    : elegiveis
  const barras = (barrasFonte as typeof elegiveis).map((e) => ({
    id: e.id,
    nome: e.nome,
    valor: e.economia - (publico ? 0 : e.custo),
    recomendada: e.id === top?.id,
    zero: e.id === "manter",
  }))
  if (!barras.some((b) => b.id === "manter") && manter) {
    barras.push({ id: "manter", nome: manter.nome, valor: 0, recomendada: false, zero: true })
  } else if (!barras.some((b) => b.zero)) {
    barras.push({ id: "manter", nome: "Manter como está", valor: 0, recomendada: false, zero: true })
  }

  return (
    <div className="consultoria-enter space-y-16">
      {top && (
        <section
          className="consultoria-surface"
          style={{ padding: 36, borderColor: "var(--voga-brasilia)", borderWidth: 2 }}
        >
          <p className="consultoria-rotulo">Estratégia recomendada</p>
          <h2 className="consultoria-h1" style={{ margin: "12px 0 8px" }}>
            {top.nome}
          </h2>
          <p className="consultoria-corpo" style={{ color: "var(--consultoria-neutro)", maxWidth: 640 }}>
            {top.pros[0]}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
            <NumeroHeroi rotulo="Economia estimada" valor={top.economia} moeda={moeda} tamanho="md" tom="azul" />
            {!publico && (
              <NumeroHeroi rotulo="Custo de implementar" valor={top.custo} moeda={moeda} tamanho="md" />
            )}
            {!publico &&
              (top.paybackAnos != null ? (
                <NumeroHeroi rotulo="Payback" valor={top.paybackAnos} sufixo="anos" tamanho="md" />
              ) : (
                <div>
                  <p className="consultoria-rotulo">Payback</p>
                  <p className="consultoria-h1">—</p>
                </div>
              ))}
          </div>
        </section>
      )}

      <section>
        <p className="consultoria-rotulo mb-6">Economia líquida</p>
        <BarraComparativa itens={barras} moeda={moeda} />
      </section>

      <section className="consultoria-carrossel">
        {(publico ? elegiveis.slice(0, 1) : elegiveis).map((e) => (
          <CartaoEstrategia
            key={e.id}
            estrategia={e}
            moeda={moeda}
            recomendada={e.id === top?.id}
            publico={publico}
          />
        ))}
      </section>

      <section>
        <p className="consultoria-rotulo mb-6">Plano de ação</p>
        <ChecklistFase itens={parecer.planoAcao} concluidas={concluidas} locked={locked} onToggle={onToggleAcao} />
      </section>
    </div>
  )
}
