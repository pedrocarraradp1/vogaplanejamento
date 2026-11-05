"use client"

export const ITENS_SIMULACAO = [
  "Espólio por estado",
  "Custo do inventário",
  "Reforma do ITCMD",
  "Comparador de holding",
  "Exposição internacional",
  "Liquidez do espólio",
] as const

export const TOTAL_CHECKS_SIMULACAO = ITENS_SIMULACAO.length

export function PassoSimulacoes({ concluidos }: { concluidos: number }) {
  return (
    <div className="consultoria-enter flex flex-col items-center py-16 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-voga.png" alt="Voga" width={120} height={36} className="consultoria-pulse mb-12" />
      <p className="consultoria-rotulo mb-2">Analisando</p>
      <h2 className="consultoria-h1 mb-12">Os números do plano, sem atalho</h2>
      <ul className="space-y-4 text-left">
        {ITENS_SIMULACAO.map((label, i) => {
          const ok = i < concluidos
          return (
            <li key={label} className="flex items-center gap-3 consultoria-corpo">
              <span
                className="consultoria-check"
                style={{ background: ok ? "var(--consultoria-ok)" : "#E5EAF1", color: ok ? "#fff" : "transparent" }}
              >
                ✓
              </span>
              <span style={{ color: ok ? "var(--consultoria-ok)" : "var(--consultoria-neutro)" }}>{label}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
