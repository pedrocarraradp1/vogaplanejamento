"use client"

import { useMemo, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { DashboardPDF } from "./dashboard-pdf"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Download, TrendingUp, DollarSign, Clock, PiggyBank } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts"
import { usePlano } from "@/lib/plano-context"
import {
  calcularProjecao, calcularKPIs, calcularInventario, calcularProtecao,
  type ProjecaoAno,
} from "@/lib/engine"

interface DashboardProps {
  onNavigate: (section: string) => void
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { state, getPatrimonioLiquido, getAporteMensal, getIdadeAtual } = usePlano()
  const { dadosPessoais, objetivos, premissas, sucessao, protecao } = state

  const [viewMode, setViewMode] = useState<"nominal" | "real">("nominal")
  const [exportando, setExportando] = useState(false)

  const saldoInicial = getPatrimonioLiquido()
  const aporteM      = getAporteMensal()
  const idadeAtual   = getIdadeAtual()

  const premissasCompletas = useMemo(() => ({
    ...premissas, saldoInicial, aporteM, idadeAtual,
  }), [premissas, saldoInicial, aporteM, idadeAtual])

  const objetivosEngine = useMemo(() =>
    objetivos.map(o => ({ id: o.id, descricao: o.descricao, prazo: o.prazo, valor: o.valor, recorrente: o.recorrente, aCada: o.aCada }))
  , [objetivos])

  const projecao = useMemo(() =>
    calcularProjecao(premissasCompletas, objetivosEngine, state.passivos)
  , [premissasCompletas, objetivosEngine, state.passivos])

  const kpis = useMemo(() =>
    calcularKPIs(projecao, premissasCompletas, dadosPessoais.renda, dadosPessoais.despesa)
  , [projecao, premissasCompletas, dadosPessoais.renda, dadosPessoais.despesa])

  const inventario = useMemo(() =>
    calcularInventario(sucessao.plEditavel, sucessao.regimeSucessao, sucessao.herdeiros, sucessao.itcmd, sucessao.honorarios, sucessao.cartoriais)
  , [sucessao])

  const protecaoResult = useMemo(() =>
    calcularProtecao(protecao.custoVida, protecao.anosCob, protecao.eduFilhos, protecao.dividasPend, saldoInicial, premissas.rendimento)
  , [protecao, saldoInicial, premissas.rendimento])

  const dadosGrafico = useMemo(() =>
    projecao
      .filter((_, i) => i % 5 === 0 || i === projecao.length - 1)
      .map(p => ({ ...p, valor: viewMode === "nominal" ? p.saldoNominal : p.saldoReal }))
  , [projecao, viewMode])

  const projecaoDetalhada = useMemo(() =>
    projecao.filter((_, i) => i % 5 === 0)
  , [projecao])

  const fmt = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
    if (Math.abs(v) >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`
    return `R$ ${v.toFixed(0)}`
  }
  const fmtFull = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)

  // ── Exportar PDF ──────────────────────────────────────────────────────────
  const exportarPDF = async () => {
    const div = document.createElement("div")
    div.style.cssText = "position:absolute;left:-9999px;top:0;width:964px"
    document.body.appendChild(div)

    let root: Root | null = null
    setExportando(true)

    try {
      root = createRoot(div)
      root.render(
        <DashboardPDF
          dadosPessoais={dadosPessoais}
          kpis={kpis}
          inventario={inventario}
          sucessao={sucessao}
          protecao={protecao}
          capitalSeguravel={protecaoResult.capitalSeguravel}
          projecaoDetalhada={projecaoDetalhada}
          projecaoCompleta={projecao}
          premissas={premissas}
          idadeAtual={idadeAtual}
          aporteM={aporteM}
        />
      )

      // Aguarda 2 frames para o React terminar de renderizar
      await new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )

      const [{ default: html2canvas }, jspdfMod] = await Promise.all([
        import("html2canvas"),
        // @ts-ignore
        import("jspdf/dist/jspdf.es.min.js"),
      ])

      // @ts-ignore
      const JsPDF = (jspdfMod as any).jsPDF ?? (jspdfMod as any).default

      const canvas = await html2canvas(div.firstElementChild as HTMLElement || div, {
        scale: 2,
        backgroundColor: "#080C18",
        logging: false,
        useCORS: true,
      })

      const imgData    = canvas.toDataURL("image/png")
      const pdf        = new JsPDF("p", "mm", "a4")
      const pdfWidth   = pdf.internal.pageSize.getWidth()
      const pdfHeight  = (canvas.height * pdfWidth) / canvas.width
      const pageHeight = pdf.internal.pageSize.getHeight()

      let heightLeft = pdfHeight
      let position   = 0

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position -= pageHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight
      }

      const nome = dadosPessoais.nome?.replace(/\s+/g, "_") || "cliente"
      const data = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")
      pdf.save(`Diagnostico_${nome}_${data}.pdf`)

    } catch (err) {
      console.error("Erro ao exportar PDF:", err)
      alert("Erro ao gerar PDF. Tente novamente.")
    } finally {
      try { root?.unmount() } catch { /* ignorar */ }
      if (div.parentNode) document.body.removeChild(div)
      setExportando(false)
    }
  }

  // ── KPI cards ─────────────────────────────────────────────────────────────
  const kpiCards = [
    { label: "PATRIMÔNIO NA APOSENTADORIA", valor: fmt(kpis.patrimonioApos), subtexto: `${fmt(kpis.patrimonioAposReal)} em valor real`, icon: TrendingUp, cor: "blue" },
    { label: "RENDA MENSAL REAL",           valor: fmtFull(kpis.rendaMensalReal), subtexto: `Com ${premissas.rendimento}% a.a.`, icon: DollarSign, cor: "green" },
    { label: "LIBERDADE FINANCEIRA",        valor: kpis.idadeLF ? `${kpis.idadeLF} anos` : "Não atingida", subtexto: kpis.idadeLF ? `Em ${kpis.idadeLF - idadeAtual} anos` : "Ajuste as premissas", icon: Clock, cor: "yellow" },
    { label: "TAXA DE POUPANÇA",            valor: `${kpis.taxaPoupanca}%`, subtexto: `${fmtFull(aporteM)} / mês`, icon: PiggyBank, cor: "neutral" },
  ]

  const kpiStyle = (cor: string) => ({
    blue:    { bg: "bg-[rgba(30,92,230,0.08)]",  border: "border-[#1E5CE6]/30",             valor: "text-[#1E5CE6]"  },
    green:   { bg: "bg-[rgba(34,199,135,0.08)]", border: "border-[#22C787]/30",             valor: "text-[#22C787]"  },
    yellow:  { bg: "bg-[#0D1220]",               border: "border-[rgba(255,255,255,0.06)]", valor: "text-[#F5A623]"  },
    neutral: { bg: "bg-[#0D1220]",               border: "border-[rgba(255,255,255,0.06)]", valor: "text-foreground" },
  }[cor] ?? { bg: "bg-[#0D1220]", border: "border-[rgba(255,255,255,0.06)]", valor: "text-foreground" })

  return (
    <div className="space-y-6" id="dashboard-content">

      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Diagnóstico Financeiro</p>
        <h1 className="text-2xl font-semibold text-foreground">
          Diagnóstico <span className="text-[#1E5CE6]">{dadosPessoais.nome || "do Cliente"}</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerado em {new Date().toLocaleDateString("pt-BR")} · Projeção Padrão
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(kpi => {
          const s = kpiStyle(kpi.cor)
          return (
            <Card key={kpi.label} className={`${s.bg} ${s.border} border`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</p>
                    <p className={`text-2xl font-bold ${s.valor}`}>{kpi.valor}</p>
                    <p className="text-sm text-muted-foreground">{kpi.subtexto}</p>
                  </div>
                  <div className={`p-2 rounded-lg ${s.bg}`}>
                    <kpi.icon className={`w-5 h-5 ${s.valor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Evolução Patrimonial */}
      <Card className="bg-[#0D1220] border-[rgba(255,255,255,0.06)]">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-foreground text-lg font-medium">Evolução Patrimonial</CardTitle>
          <div className="inline-flex rounded-lg bg-[#131929] p-1">
            {(["nominal","real"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  viewMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                {m === "nominal" ? "Nominal" : "Real"}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosGrafico} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="idade" stroke="#4A5268" tick={{ fill: "#4A5268", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.04)" }} />
                <YAxis stroke="#4A5268" tick={{ fill: "#4A5268", fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={fmt} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#131929", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  labelStyle={{ color: "#ffffff", fontWeight: 600 }}
                  itemStyle={{ color: "#ffffff" }}
                  formatter={(v: number) => [fmtFull(v), viewMode === "nominal" ? "Patrimônio Nominal" : "Patrimônio Real"]}
                  labelFormatter={l => `Idade: ${l} anos`}
                />
                <ReferenceLine x={premissas.idadeApos} stroke="#F5A623" strokeDasharray="5 5"
                  label={{ value: "Aposentadoria", position: "top", fill: "#F5A623", fontSize: 12 }} />
                <Bar dataKey="valor" radius={[2, 2, 0, 0]}>
                  {dadosGrafico.map((entry: ProjecaoAno & { valor: number }, i: number) => (
                    <Cell key={`cell-${i}`} fill={entry.valor >= 0 ? "rgba(30,92,230,0.45)" : "rgba(240,75,75,0.35)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Planejamento Sucessório */}
      <Card className="bg-[#0D1220] border-[rgba(255,255,255,0.06)]">
        <CardHeader>
          <CardTitle className="text-foreground text-lg font-medium">Planejamento Sucessório</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Distribuição Patrimonial</h4>
              {[
                { label: "Patrimônio (simulação)", valor: fmtFull(sucessao.plEditavel) },
                { label: "Meação (cônjuge)",        valor: fmtFull(inventario.meacao) },
                { label: "Valor da Herança",         valor: fmtFull(inventario.heranca) },
                { label: "Herdeiros",                valor: String(sucessao.herdeiros) },
                { label: "Por Herdeiro",             valor: fmtFull(inventario.porHerdeiro), cor: "text-[#22C787]" },
              ].map(item => (
                <div key={item.label} className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.06)]">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-medium ${item.cor ?? "text-foreground"}`}>{item.valor}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Custos do Inventário</h4>
              {[
                { label: `ITCMD (${sucessao.itcmd}%)`,           valor: fmtFull(inventario.custoITCMD) },
                { label: `Honorários (${sucessao.honorarios}%)`, valor: fmtFull(inventario.custoHon) },
                { label: `Cartório (${sucessao.cartoriais}%)`,   valor: fmtFull(inventario.custoCart) },
                { label: "Custo Total",                           valor: fmtFull(inventario.custoTotal), cor: "text-[#EF4444]" },
              ].map(item => (
                <div key={item.label} className="flex justify-between py-2 border-b border-[rgba(255,255,255,0.06)]">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className={`text-sm font-medium ${item.cor ?? "text-foreground"}`}>{item.valor}</span>
                </div>
              ))}
              <div className="flex justify-between py-2">
                <span className="text-sm text-muted-foreground">% do Patrimônio</span>
                <span className="px-2 py-1 bg-[#F5A623]/20 text-[#F5A623] text-xs font-medium rounded">{inventario.percentualCusto}%</span>
              </div>
            </div>
          </div>

          <div className="bg-[#1E5CE6]/10 border border-[#1E5CE6]/30 rounded-xl p-6">
            <p className="text-xs font-medium text-[#1E5CE6] uppercase tracking-wide mb-2">Capital Segurável Recomendado</p>
            <p className="text-3xl font-bold text-white mb-2">{fmtFull(protecaoResult.capitalSeguravel)}</p>
            <p className="text-sm text-muted-foreground">
              {protecao.anosCob} anos de custo de vida ({fmtFull(protecao.custoVida * 12 * protecao.anosCob)})
              + Educação ({fmtFull(protecao.eduFilhos)})
              + Dívidas ({fmtFull(protecao.dividasPend)})
            </p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            * ITCMD varia conforme o estado (2% a 8%). Recomenda-se consultar advogado especializado para estruturação do planejamento sucessório.
          </p>
        </CardContent>
      </Card>

      {/* Projeção Detalhada */}
      <Card className="bg-[#0D1220] border-[rgba(255,255,255,0.06)]">
        <CardHeader>
          <CardTitle className="text-foreground text-lg font-medium">Projeção Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(255,255,255,0.06)]">
                  {["Idade","Patrimônio Nominal","Patrimônio Real","Renda Mensal Real","Fase"].map(h => (
                    <th key={h} className={`py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wide ${h === "Idade" ? "text-left" : h === "Fase" ? "text-center" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projecaoDetalhada.map(row => (
                  <tr key={row.idade} className="border-b border-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.02)]">
                    <td className="py-3 px-4"><span className="text-lg font-semibold text-foreground">{row.idade}</span></td>
                    <td className={`py-3 px-4 text-right text-sm font-medium ${row.saldoNominal >= 0 ? "text-[#22C787]" : "text-[#EF4444]"}`}>{fmtFull(row.saldoNominal)}</td>
                    <td className={`py-3 px-4 text-right text-sm font-medium ${row.saldoReal >= 0 ? "text-[#22C787]" : "text-[#EF4444]"}`}>{fmtFull(row.saldoReal)}</td>
                    <td className="py-3 px-4 text-right text-sm text-muted-foreground">{row.rendaMensalReal > 0 ? fmtFull(row.rendaMensalReal) : "—"}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${row.isAposentado ? "bg-[#F5A623]/20 text-[#F5A623]" : "bg-[#22C787]/20 text-[#22C787]"}`}>
                        {row.isAposentado ? "Aposentadoria" : "Acumulação"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={() => onNavigate("protecao")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />Editar
        </Button>
        <Button onClick={exportarPDF} disabled={exportando}
          className="bg-[#1E5CE6] hover:bg-[#1E5CE6]/90 text-white px-6">
          <Download className="w-4 h-4 mr-2" />
          {exportando ? "Gerando PDF..." : "Exportar PDF"}
        </Button>
      </div>

    </div>
  )
}
