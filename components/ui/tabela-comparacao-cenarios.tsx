"use client"

import type { CSSProperties } from "react"

/**
 * Tabela "Comparação de Resultados" dos cenários Conservador / Moderado / Agressivo.
 *
 * Não usar a classe CSS `.field-label` em `<th>`/`<td>`: ela força `display: block`,
 * o que empilha os cabeçalhos na vertical em vez de colunas horizontais.
 */
export type ColunaComparacaoCenario = {
  key: string
  nome: string
}

export type LinhaComparacaoCenario = {
  label: string
  values: string[]
}

export function TabelaComparacaoCenarios({
  colunas,
  linhas,
}: {
  colunas: ColunaComparacaoCenario[]
  linhas: LinhaComparacaoCenario[]
}) {
  const thBase: CSSProperties = {
    fontSize: 12,
    color: "var(--text-label)",
    fontWeight: 500,
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="w-full"
        style={{ borderCollapse: "collapse", tableLayout: "fixed" }}
      >
        <thead>
          <tr className="border-b border-border">
            <th className="py-3 px-4 text-left" style={thBase}>
              Métrica
            </th>
            {colunas.map((c) => (
              <th key={c.key} className="py-3 px-4 text-right" style={thBase}>
                {c.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((row) => (
            <tr key={row.label} className="border-b border-border last:border-b-0">
              <td className="py-3 px-4 text-sm text-muted-foreground">{row.label}</td>
              {row.values.map((v, i) => (
                <td
                  key={`${row.label}-${colunas[i]?.key ?? i}`}
                  className="py-3 px-4 text-right text-sm text-foreground tabular-nums"
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
