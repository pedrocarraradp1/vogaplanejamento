"use client"

import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer"
import type { Ativo, DadosPessoais, Passivo } from "@/lib/plano-context"
import {
  getParcelaMensalPassivo,
  getSaldoDevedorPassivo,
  labelSubcategoriaLiquido,
  normalizeAtivoDescricao,
  normalizeAtivoTipo,
  type TipoAtivoSlug,
} from "@/lib/patrimonio-utils"

const NAVY = "#012137"
const ACCENT = "#4B759B"
const GREEN = "#00954F"
const RED = "#C0392B"
const GRAY = "#9A9B9B"
const LIGHTBG = "#F4F6FA"
const BORDER = "#E0E4EA"
const AMBER = "#E67E22"

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#1a1a1a", backgroundColor: "white" },

  capa: { backgroundColor: NAVY, padding: "28 40 20", marginBottom: 0 },
  capaTitulo: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "white", marginBottom: 3 },
  capaSub: { fontSize: 10, color: "#C8E2F5", marginBottom: 14 },
  capaMeta: { flexDirection: "row", gap: 24 },
  capaMetaItem: { fontSize: 8, color: "#9BC4E2" },
  capaLinha: { height: 2.5, backgroundColor: ACCENT, marginTop: 16 },

  page_content: { padding: "20 40" },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottomWidth: 1.5,
    borderBottomColor: ACCENT,
    paddingBottom: 3,
    marginTop: 16,
    marginBottom: 10,
  },

  kpiGrid: { flexDirection: "row", gap: 8, marginBottom: 16 },
  kpi: { flex: 1, backgroundColor: LIGHTBG, borderRadius: 5, padding: "10 12" },
  kpiLabel: {
    fontSize: 7,
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  kpiValG: { fontSize: 14, fontFamily: "Helvetica-Bold", color: GREEN },
  kpiValB: { fontSize: 14, fontFamily: "Helvetica-Bold", color: ACCENT },
  kpiValR: { fontSize: 14, fontFamily: "Helvetica-Bold", color: RED },
  kpiSub: { fontSize: 7, color: GRAY, marginTop: 2 },

  indGrid: { flexDirection: "row", gap: 8, marginBottom: 16 },
  ind: {
    flex: 1,
    borderRadius: 5,
    padding: "8 10",
    backgroundColor: LIGHTBG,
    borderLeftWidth: 3,
  },
  indLbl: {
    fontSize: 7,
    color: GRAY,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  indValG: { fontSize: 13, fontFamily: "Helvetica-Bold", color: GREEN },
  indValA: { fontSize: 13, fontFamily: "Helvetica-Bold", color: AMBER },
  indValR: { fontSize: 13, fontFamily: "Helvetica-Bold", color: RED },
  indSt: { fontSize: 7, color: GRAY, marginTop: 1 },

  balancoCols: { flexDirection: "row", gap: 14, marginBottom: 16 },
  balancoCol: { flex: 1 },
  colHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "7 10",
    borderRadius: 4,
  },
  colHeaderAtivo: { backgroundColor: ACCENT },
  colHeaderPass: { backgroundColor: RED },
  colHeaderText: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "white" },

  grupoHd: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "4 10",
    backgroundColor: "#EEF3F8",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  grupoHdText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: ACCENT },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "4 10 4 18",
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F2F5",
  },
  rowName: { fontSize: 9, color: "#1a1a1a" },
  rowSub: { fontSize: 7.5, color: GRAY, marginTop: 1 },
  rowVal: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  rowValR: { fontSize: 9, fontFamily: "Helvetica-Bold", color: RED },
  rowValR2: { fontSize: 7.5, color: RED, marginTop: 1, textAlign: "right" },

  totalRow: { flexDirection: "row", justifyContent: "space-between", padding: "6 10", borderTopWidth: 2 },
  totalAtivo: { borderTopColor: ACCENT, backgroundColor: "#EEF3F8" },
  totalPass: { borderTopColor: RED, backgroundColor: "#FDEAEA" },
  totalText: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  totalTextA: { color: ACCENT },
  totalTextR: { color: RED },

  plBox: {
    backgroundColor: "#E8F5EE",
    borderWidth: 1.5,
    borderColor: "#C3E6D0",
    borderRadius: 5,
    padding: "8 10",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  plLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: GREEN },
  plSub: { fontSize: 7.5, color: "#3B6D11", marginTop: 2 },
  plVal: { fontSize: 16, fontFamily: "Helvetica-Bold", color: GREEN },

  checkBox: {
    backgroundColor: "#F7F8FA",
    borderWidth: 0.5,
    borderColor: BORDER,
    borderRadius: 4,
    padding: "6 10",
    marginTop: 6,
  },
  checkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F2F5",
  },
  checkLast: { borderBottomWidth: 0, fontFamily: "Helvetica-Bold", color: GREEN },
  checkText: { fontSize: 8, color: GRAY },
  checkVal: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },

  table: { marginBottom: 14 },
  tableHead: { flexDirection: "row", backgroundColor: ACCENT, padding: "5 10" },
  tableHeadT: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "white", flex: 1 },
  tableRow: {
    flexDirection: "row",
    padding: "5 10",
    borderBottomWidth: 0.5,
    borderBottomColor: BORDER,
  },
  tableRowAlt: { backgroundColor: LIGHTBG },
  tableTotal: {
    flexDirection: "row",
    padding: "6 10",
    backgroundColor: "#EEF3F8",
    borderTopWidth: 1.5,
    borderTopColor: ACCENT,
  },
  tableCell: { fontSize: 8.5, color: "#1a1a1a", flex: 1 },
  tableCellR: { fontSize: 8.5, color: "#1a1a1a", flex: 1, textAlign: "right" },
  tableCellB: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#1a1a1a", flex: 1 },

  disclaimer: {
    fontSize: 7.5,
    color: GRAY,
    lineHeight: 1.5,
    marginTop: 14,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    paddingTop: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: NAVY,
    padding: "5 40",
  },
  footerText: { fontSize: 7.5, color: "#9BC4E2" },
})

const GRUPOS: { label: string; tipo: TipoAtivoSlug }[] = [
  { label: "Ativos Líquidos", tipo: "ativo_liquido" },
  { label: "Previdência", tipo: "previdencia" },
  { label: "Imobilizado", tipo: "imobilizado" },
  { label: "Participações Societárias", tipo: "participacao_societaria" },
]

const COMPOSICAO_GRUPOS: { label: string; tipo: TipoAtivoSlug }[] = [
  { label: "Imobilizado", tipo: "imobilizado" },
  { label: "Ativos Líquidos", tipo: "ativo_liquido" },
  { label: "Previdência", tipo: "previdencia" },
  { label: "Participações Societárias", tipo: "participacao_societaria" },
]

export interface BalancoPDFIndicadores {
  totalAtivos: number
  totalPassivos: number
  pl: number
  reservaMeses: number
  metaReservaMeses: number
  comprometimento: number
  liquidez: number
  alavancagem: number
  totalAtivoLiquido: number
}

export interface BalancoPDFProps {
  dadosPessoais: DadosPessoais
  ativos: Ativo[]
  passivos: Passivo[]
  indicadores: BalancoPDFIndicadores
  moeda?: string
}

function makeFmt(moeda: string) {
  return (v: number) =>
    new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: moeda === "USD" ? "USD" : "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v)
}

function pct(v: number, t: number) {
  return t > 0 ? `${((v / t) * 100).toFixed(1)}%` : "0%"
}

function labelAtivoPdf(ativo: Ativo, grupoLabel: string): string {
  const tipo = normalizeAtivoTipo(ativo.tipo, ativo.descricao)
  const sub = (ativo.subcategoria ?? "").trim()
  if (tipo === "ativo_liquido" && sub) return labelSubcategoriaLiquido(sub)
  return normalizeAtivoDescricao(ativo.descricao) || grupoLabel
}

function passivosComSaldo(passivos: Passivo[]) {
  return passivos
    .map((p) => ({
      passivo: p,
      saldo: getSaldoDevedorPassivo(p),
      parcela: getParcelaMensalPassivo(p),
    }))
    .filter((x) => x.saldo > 0)
}

function subtituloPassivo(p: Passivo): string {
  const inst = (p.instituicao ?? "").trim()
  const taxa = Number(p.taxaJurosMensal) || 0
  const prazo = Number(p.prazoRestanteMeses) || 0
  return [
    inst || null,
    taxa > 0 ? `${taxa.toFixed(2)}% a.m.` : null,
    prazo > 0 ? `${prazo} meses restantes` : null,
  ]
    .filter(Boolean)
    .join(" · ")
}

function itensPorTipo(ativos: Ativo[], tipo: TipoAtivoSlug) {
  return ativos.filter(
    (a) => normalizeAtivoTipo(a.tipo, a.descricao) === tipo && (Number(a.valor) || 0) > 0,
  )
}

export function BalancoPDF({ dadosPessoais, ativos, passivos, indicadores, moeda = "BRL" }: BalancoPDFProps) {
  const {
    totalAtivos,
    totalPassivos,
    pl,
    reservaMeses,
    metaReservaMeses,
    comprometimento,
    liquidez,
    alavancagem,
  } = indicadores

  const fmt = makeFmt(moeda)
  const dataRef = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  const nomCliente = dadosPessoais?.nome || "Cliente"
  const passivosLista = passivosComSaldo(passivos)
  const reservaLabel = `${reservaMeses.toFixed(1)} meses`

  return (
    <Document title={`Balanço Patrimonial — ${nomCliente}`} author="Voga">
      <Page size="A4" style={styles.page}>
        <View style={styles.capa}>
          <Text style={styles.capaTitulo}>BALANÇO PATRIMONIAL</Text>
          <Text style={styles.capaSub}>Demonstrativo completo de ativos e passivos</Text>
          <View style={styles.capaMeta}>
            <Text style={styles.capaMetaItem}>Cliente: {nomCliente}</Text>
            <Text style={styles.capaMetaItem}>Data: {dataRef}</Text>
            <Text style={styles.capaMetaItem}>Classificação: Confidencial</Text>
          </View>
          <View style={styles.capaLinha} />
        </View>

        <View style={styles.page_content}>
          <Text style={styles.sectionTitle}>Resumo Executivo</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>Patrimônio Líquido</Text>
              <Text style={styles.kpiValG}>{fmt(pl)}</Text>
              <Text style={styles.kpiSub}>Ativos − Passivos</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>Ativos Totais</Text>
              <Text style={styles.kpiValB}>{fmt(totalAtivos)}</Text>
              <Text style={styles.kpiSub}>{ativos.length} itens</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>Passivos Totais</Text>
              <Text style={styles.kpiValR}>{fmt(totalPassivos)}</Text>
              <Text style={styles.kpiSub}>{passivos.length} financiamentos</Text>
            </View>
            <View style={styles.kpi}>
              <Text style={styles.kpiLabel}>Reserva Emergência</Text>
              <Text style={styles.kpiValG}>{reservaLabel}</Text>
              <Text style={styles.kpiSub}>Meta: {metaReservaMeses} meses</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Indicadores de Saúde Financeira</Text>
          <View style={styles.indGrid}>
            <View
              style={[
                styles.ind,
                { borderLeftColor: reservaMeses >= metaReservaMeses ? GREEN : reservaMeses >= metaReservaMeses / 2 ? AMBER : RED },
              ]}
            >
              <Text style={styles.indLbl}>Reserva emergência</Text>
              <Text style={reservaMeses >= metaReservaMeses ? styles.indValG : styles.indValA}>
                {reservaLabel}
              </Text>
              <Text style={styles.indSt}>Meta: {metaReservaMeses} meses</Text>
            </View>
            <View
              style={[
                styles.ind,
                {
                  borderLeftColor:
                    comprometimento <= 20 ? GREEN : comprometimento <= 30 ? AMBER : RED,
                },
              ]}
            >
              <Text style={styles.indLbl}>Comprometimento</Text>
              <Text style={comprometimento <= 20 ? styles.indValG : styles.indValA}>
                {comprometimento.toFixed(1)}%
              </Text>
              <Text style={styles.indSt}>Limite: 30%</Text>
            </View>
            <View
              style={[
                styles.ind,
                { borderLeftColor: liquidez >= 1.5 ? GREEN : liquidez >= 1 ? AMBER : RED },
              ]}
            >
              <Text style={styles.indLbl}>Índice de liquidez</Text>
              <Text style={liquidez >= 1.5 ? styles.indValG : styles.indValA}>
                {liquidez.toFixed(2)}×
              </Text>
              <Text style={styles.indSt}>Mínimo: 1,0×</Text>
            </View>
            <View
              style={[
                styles.ind,
                { borderLeftColor: alavancagem <= 20 ? GREEN : alavancagem <= 30 ? AMBER : RED },
              ]}
            >
              <Text style={styles.indLbl}>Alavancagem</Text>
              <Text style={alavancagem <= 20 ? styles.indValG : styles.indValA}>
                {alavancagem.toFixed(1)}%
              </Text>
              <Text style={styles.indSt}>Referência: {"<"} 30%</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Balanço Patrimonial — Demonstrativo</Text>
          <View style={styles.balancoCols}>
            <View style={styles.balancoCol}>
              <View style={[styles.colHeader, styles.colHeaderAtivo]}>
                <Text style={styles.colHeaderText}>ATIVO</Text>
                <Text style={styles.colHeaderText}>{fmt(totalAtivos)}</Text>
              </View>
              {GRUPOS.map((g) => {
                const itens = itensPorTipo(ativos, g.tipo)
                if (itens.length === 0) return null
                const total = itens.reduce((s, a) => s + (Number(a.valor) || 0), 0)
                return (
                  <View key={g.tipo}>
                    <View style={styles.grupoHd}>
                      <Text style={styles.grupoHdText}>{g.label}</Text>
                      <Text style={styles.grupoHdText}>{fmt(total)}</Text>
                    </View>
                    {itens.map((a) => (
                      <View key={a.id} style={styles.row}>
                        <View>
                          <Text style={styles.rowName}>{labelAtivoPdf(a, g.label)}</Text>
                          {(a.instituicao ?? "").trim() ? (
                            <Text style={styles.rowSub}>{a.instituicao}</Text>
                          ) : null}
                        </View>
                        <Text style={styles.rowVal}>{fmt(Number(a.valor) || 0)}</Text>
                      </View>
                    ))}
                  </View>
                )
              })}
              <View style={[styles.totalRow, styles.totalAtivo]}>
                <Text style={[styles.totalText, styles.totalTextA]}>Total do Ativo</Text>
                <Text style={[styles.totalText, styles.totalTextA]}>{fmt(totalAtivos)}</Text>
              </View>
            </View>

            <View style={styles.balancoCol}>
              <View style={[styles.colHeader, styles.colHeaderPass]}>
                <Text style={styles.colHeaderText}>PASSIVO</Text>
                <Text style={styles.colHeaderText}>{fmt(totalPassivos)}</Text>
              </View>
              {passivosLista.length === 0 ? (
                <View style={styles.row}>
                  <Text style={styles.rowSub}>Nenhum passivo cadastrado</Text>
                </View>
              ) : (
                passivosLista.map(({ passivo: p, saldo, parcela }) => (
                  <View key={p.id} style={styles.row}>
                    <View>
                      <Text style={styles.rowName}>{p.descricao?.trim() || p.categoria}</Text>
                      <Text style={styles.rowSub}>{subtituloPassivo(p)}</Text>
                    </View>
                    <View>
                      <Text style={styles.rowValR}>{fmt(saldo)}</Text>
                      {parcela > 0 ? (
                        <Text style={styles.rowValR2}>{fmt(parcela)}/mês</Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
              <View style={[styles.totalRow, styles.totalPass]}>
                <Text style={[styles.totalText, styles.totalTextR]}>Total do Passivo</Text>
                <Text style={[styles.totalText, styles.totalTextR]}>{fmt(totalPassivos)}</Text>
              </View>
              <View style={styles.plBox}>
                <View>
                  <Text style={styles.plLabel}>Patrimônio Líquido</Text>
                  <Text style={styles.plSub}>{pct(pl, totalAtivos)} dos ativos</Text>
                </View>
                <Text style={styles.plVal}>{fmt(pl)}</Text>
              </View>
              <View style={styles.checkBox}>
                <View style={styles.checkRow}>
                  <Text style={styles.checkText}>Total do ativo</Text>
                  <Text style={styles.checkVal}>{fmt(totalAtivos)}</Text>
                </View>
                <View style={styles.checkRow}>
                  <Text style={styles.checkText}>Total do passivo</Text>
                  <Text style={[styles.checkVal, { color: RED }]}>{fmt(totalPassivos)}</Text>
                </View>
                <View style={[styles.checkRow, styles.checkLast]}>
                  <Text style={styles.checkText}>Passivo + PL</Text>
                  <Text style={[styles.checkVal, { color: GREEN }]}>{fmt(totalAtivos)} ✓</Text>
                </View>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Composição da Carteira</Text>
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={styles.tableHeadT}>Grupo</Text>
              <Text style={[styles.tableHeadT, { textAlign: "right" }]}>Valor</Text>
              <Text style={[styles.tableHeadT, { textAlign: "right" }]}>% do Total</Text>
            </View>
            {COMPOSICAO_GRUPOS.map((g, i) => {
              const itens = itensPorTipo(ativos, g.tipo)
              if (itens.length === 0) return null
              const total = itens.reduce((s, a) => s + (Number(a.valor) || 0), 0)
              return (
                <View key={g.tipo} style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}>
                  <Text style={styles.tableCell}>{g.label}</Text>
                  <Text style={styles.tableCellR}>{fmt(total)}</Text>
                  <Text style={styles.tableCellR}>{pct(total, totalAtivos)}</Text>
                </View>
              )
            })}
            <View style={styles.tableTotal}>
              <Text style={styles.tableCellB}>Total</Text>
              <Text style={[styles.tableCellB, { textAlign: "right" }]}>{fmt(totalAtivos)}</Text>
              <Text style={[styles.tableCellB, { textAlign: "right" }]}>100,0%</Text>
            </View>
          </View>

          <Text style={styles.disclaimer}>
            Este balanço foi elaborado com base nas informações fornecidas pelo cliente e reflete a
            posição patrimonial em {dataRef}. Os valores de imóveis e veículos são estimativas de
            mercado e podem variar. Este documento é de uso exclusivo do cliente e do assessor e não
            constitui recomendação de investimento. Voga | BTG Pactual — Planejamento Financeiro
            Pessoal.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Voga | BTG Pactual | Confidencial</Text>
          <Text style={styles.footerText}>{nomCliente} — Balanço Patrimonial</Text>
          <Text style={styles.footerText}>{dataRef}</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadBalancoPDF(props: BalancoPDFProps) {
  const blob = await pdf(<BalancoPDF {...props} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  const safeName = (props.dadosPessoais?.nome || "Cliente").replace(/\s+/g, "_")
  a.download = `Balanco_Patrimonial_${safeName}_${new Date().getFullYear()}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
