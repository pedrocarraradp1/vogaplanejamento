import React from "react"

interface DashboardPDFProps {
  dadosPessoais: { nome: string; nascimento: string; renda: number; despesa: number }
  kpis: { patrimonioApos: number; patrimonioAposReal: number; rendaMensalReal: number; idadeLF: number | null; taxaPoupanca: number }
  inventario: {
    patrimonioComum: number
    patrimonioHeranca: number
    meacao: number
    heranca: number
    porHerdeiro: number
    custoITCMD: number
    custoHon: number
    custoCart: number
    custoTotal: number
    percentualCusto: number
  }
  sucessao: { plEditavel: number; itcmd: number; honorarios: number; cartoriais: number; herdeiros: number }
  patrimonioTotal: number
  protecao: { custoVida: number; anosCob: number; eduFilhos: number; dividasPend: number }
  capitalSeguravel: number
  projecaoDetalhada: Array<{ idade: number; saldoNominal: number; saldoReal: number; rendaMensalReal: number; isAposentado: boolean }>
  projecaoCompleta: Array<{ idade: number; saldoNominal: number; saldoReal: number; isAposentado: boolean }>
  premissas: { rendimento: number; inflacao: number; idadeApos: number; retiradaMensal: number }
  idadeAtual: number
  aporteM: number
  moeda: "BRL" | "USD"
}

const f = (moeda: "BRL" | "USD", v: number) =>
  new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", { style: "currency", currency: moeda === "USD" ? "USD" : "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

const fk = (moeda: "BRL" | "USD", v: number) => {
  const prefix = moeda === "USD" ? "US$ " : "R$ "
  if (Math.abs(v) >= 1_000_000) return `${prefix}${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000)     return `${prefix}${(v / 1_000).toFixed(0)}K`
  return `${prefix}${v.toFixed(0)}`
}

export function DashboardPDF({
  dadosPessoais, kpis, inventario, sucessao, patrimonioTotal, protecao,
  capitalSeguravel, projecaoDetalhada, projecaoCompleta, premissas, idadeAtual, aporteM,
  moeda,
}: DashboardPDFProps) {
  const bg    = "#080C18"
  const bg2   = "#0D1220"
  const white = "#E8EBF2"
  const muted = "#8E96AC"
  const blue  = "var(--accent)"
  const green = "#1066DA"
  const amber = "#1066DA"
  const red   = "#B33A3A"
  const border = "1px solid rgba(255,255,255,0.08)"

  const card = (children: React.ReactNode, extra?: React.CSSProperties) => (
    <div style={{ backgroundColor: bg2, border, borderRadius: 12, padding: 20, marginBottom: 12, ...extra }}>
      {children}
    </div>
  )

  const rowItem = (l: string, v: string, color?: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: border }}>
      <span style={{ fontSize: 12, color: muted }}>{l}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: color || white }}>{v}</span>
    </div>
  )

  // ── Gráfico SVG ───────────────────────────────────────────────────────────
  const svgW  = 836
  const svgH  = 200
  const padL  = 64
  const padR = 32  // era 16
  const padT  = 20
  const padB  = 32
  const chartW = svgW - padL - padR
  const chartH = svgH - padT - padB

  const dados  = Array.isArray(projecaoCompleta) ? projecaoCompleta : []
  const pontos = dados.filter((_, i) => i % 5 === 0 || i === dados.length - 1)
  const maxVal = Math.max(...pontos.map(p => Math.abs(p.saldoNominal)), 1)
  const barW   = Math.max(4, chartW / Math.max(pontos.length, 1) - 2)

  const xScale    = (i: number) => padL + (i / Math.max(pontos.length - 1, 1)) * chartW
  const yPos      = (v: number) => v >= 0 ? padT + chartH - (Math.min(Math.abs(v) / maxVal, 1)) * chartH : padT + chartH
  const barHeight = (v: number) => (Math.min(Math.abs(v) / maxVal, 1)) * chartH

  const yLabels   = [0, 0.25, 0.5, 0.75, 1].map(r => ({ v: maxVal * r, y: padT + chartH - r * chartH }))
  const aposIdx   = pontos.findIndex(p => p.isAposentado)
  const aposX     = aposIdx >= 0 ? xScale(aposIdx) : null

  return (
    <div style={{ backgroundColor: bg, color: white, fontFamily: "Arial, sans-serif", padding: 32, width: 900 }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Diagnóstico Financeiro</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
          Diagnóstico <span style={{ color: blue }}>{dadosPessoais.nome || "do Cliente"}</span>
        </div>
        <div style={{ fontSize: 12, color: muted }}>
          Gerado em {new Date().toLocaleDateString("pt-BR")} · Projeção Padrão
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[
          { l: "PATRIMÔNIO NA APOSENTADORIA", v: fk(moeda, kpis.patrimonioApos), sub: `${fk(moeda, kpis.patrimonioAposReal)} em valor real`, c: blue, bg: "rgba(30,92,230,0.08)", b: "1px solid rgba(30,92,230,0.3)" },
          { l: "RENDA MENSAL REAL",            v: f(moeda, kpis.rendaMensalReal),  sub: `Com ${premissas.rendimento}% a.a.`,              c: green, bg: "rgba(16,102,218,0.08)", b: "1px solid rgba(16,102,218,0.3)" },
          { l: "LIBERDADE FINANCEIRA",         v: kpis.idadeLF ? `${kpis.idadeLF} anos` : "—", sub: kpis.idadeLF ? `Em ${kpis.idadeLF - idadeAtual} anos` : "—", c: amber, bg: bg2, b: border },
          { l: "TAXA DE POUPANÇA",             v: `${kpis.taxaPoupanca}%`,  sub: `${f(moeda, aporteM)} / mês`,                            c: white, bg: bg2, b: border },
        ].map(kpi => (
          <div key={kpi.l} style={{ backgroundColor: kpi.bg, border: kpi.b, borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: muted, textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 6 }}>{kpi.l}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: kpi.c, marginBottom: 4 }}>{kpi.v}</div>
            <div style={{ fontSize: 11, color: muted }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      {card(<>
        <div style={{ fontSize: 14, fontWeight: 700, color: white, marginBottom: 12 }}>Evolução Patrimonial</div>
        <svg width={svgW} height={svgH}>
          {yLabels.map(({ v, y }) => (
            <g key={y}>
              <line x1={padL} y1={y} x2={svgW - padR} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={9} fill={muted}>{fk(moeda, v)}</text>
            </g>
          ))}
          {pontos.map((p, i) => (
            <rect key={p.idade}
              x={xScale(i) - barW / 2} y={yPos(p.saldoNominal)}
              width={barW} height={barHeight(p.saldoNominal)}
              fill={p.saldoNominal >= 0 ? "rgba(30,92,230,0.6)" : "rgba(240,75,75,0.5)"}
              rx={2} />
          ))}
          {aposX !== null && (
            <>
              <line x1={aposX} y1={padT} x2={aposX} y2={padT + chartH} stroke={amber} strokeWidth={1.5} strokeDasharray="5 4" />
              <text x={aposX + 4} y={padT + 12} fontSize={9} fill={amber}>Aposentadoria</text>
            </>
          )}
          {pontos.map((p, i) => (
            <text key={`l-${p.idade}`} x={xScale(i)} y={svgH - 4} textAnchor="middle" fontSize={9} fill={muted}>{p.idade}</text>
          ))}
          <line x1={padL} y1={padT + chartH} x2={svgW - padR} y2={padT + chartH} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        </svg>
      </>)}

      {/* Planejamento Sucessório */}
      {card(<>
        <div style={{ fontSize: 14, fontWeight: 700, color: white, marginBottom: 16 }}>Planejamento Sucessório</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase" as const, marginBottom: 10 }}>Distribuição Patrimonial</div>
            {rowItem("Patrimônio Total", f(moeda, patrimonioTotal))}
            {rowItem("Meação (cônjuge)", f(moeda, inventario.meacao))}
            {rowItem("Valor da Herança", f(moeda, inventario.heranca))}
            {rowItem("Herdeiros", String(sucessao.herdeiros))}
            {rowItem("Por Herdeiro", f(moeda, inventario.porHerdeiro), green)}
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase" as const, marginBottom: 10 }}>Custos do Inventário</div>
            {rowItem(`ITCMD (${sucessao.itcmd}%)`, f(moeda, inventario.custoITCMD))}
            {rowItem(`Honorários (${sucessao.honorarios}%)`, f(moeda, inventario.custoHon))}
            {rowItem(`Cartório (${sucessao.cartoriais}%)`, f(moeda, inventario.custoCart))}
            {rowItem("Custo Total", f(moeda, inventario.custoTotal), red)}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ fontSize: 12, color: muted }}>% do Patrimônio</span>
              <span style={{ fontSize: 11, fontWeight: 600, backgroundColor: "rgba(16,102,218,0.12)", color: amber, padding: "2px 8px", borderRadius: 4 }}>{inventario.percentualCusto}%</span>
            </div>
          </div>
        </div>
        <div style={{ backgroundColor: "rgba(30,92,230,0.1)", border: "1px solid rgba(30,92,230,0.3)", borderRadius: 10, padding: 16, marginTop: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: blue, textTransform: "uppercase" as const, marginBottom: 6 }}>Capital Segurável Recomendado</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: white, marginBottom: 4 }}>{f(moeda, capitalSeguravel)}</div>
          <div style={{ fontSize: 11, color: muted }}>
            {protecao.anosCob} anos de custo de vida ({f(moeda, protecao.custoVida * 12 * protecao.anosCob)}) + Educação ({f(moeda, protecao.eduFilhos)}) + Dívidas ({f(moeda, protecao.dividasPend)})
          </div>
        </div>
      </>)}

      {/* Projeção Detalhada */}
      {card(<>
        <div style={{ fontSize: 14, fontWeight: 700, color: white, marginBottom: 16 }}>Projeção Detalhada</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: border }}>
              {["Idade","Patrimônio Nominal","Patrimônio Real","Renda Mensal Real","Fase"].map(h => (
                <th key={h} style={{ textAlign: (h === "Idade" ? "left" : h === "Fase" ? "center" : "right") as any, padding: "8px 10px", fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projecaoDetalhada.map(r => (
              <tr key={r.idade} style={{ borderBottom: border }}>
                <td style={{ padding: "8px 10px", fontSize: 15, fontWeight: 700, color: white }}>{r.idade}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, fontWeight: 600, color: r.saldoNominal >= 0 ? green : red }}>{f(moeda, r.saldoNominal)}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, fontWeight: 600, color: r.saldoReal >= 0 ? green : red }}>{f(moeda, r.saldoReal)}</td>
                <td style={{ padding: "8px 10px", textAlign: "right", fontSize: 12, color: muted }}>{r.rendaMensalReal > 0 ? f(moeda, r.rendaMensalReal) : "—"}</td>
                <td style={{ padding: "8px 10px", textAlign: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20, backgroundColor: r.isAposentado ? "rgba(16,102,218,0.12)" : "rgba(16,102,218,0.15)", color: r.isAposentado ? amber : green }}>
                    {r.isAposentado ? "Aposentadoria" : "Acumulação"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </>)}

      <div style={{ fontSize: 10, color: muted, marginTop: 8 }}>
        * ITCMD varia conforme o estado (2% a 8%). Recomenda-se consultar advogado especializado.
      </div>
    </div>
  )
}
