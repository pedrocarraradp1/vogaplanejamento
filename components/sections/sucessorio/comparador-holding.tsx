"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ArrowLeft, ArrowRight, FileDown, Plus, Trash2 } from "lucide-react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { InputMoeda } from "@/components/ui/input-moeda"
import { KpiCard, KpiGrid } from "@/components/ui/kpi-card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CHART_TOOLTIP_PROPS } from "@/lib/chart-tooltip"
import { usePlano, type Ativo } from "@/lib/plano-context"
import { usePlanoReadOnly } from "@/lib/plano-readonly-context"
import { receitaMensalAtual } from "@/lib/renda-utils"
import {
  calcularComparadorHolding,
  imoveisDeAtivos,
  type ComparadorHolding,
} from "@/lib/sucessorio/holding"
import { ITCMD_POR_UF, type UfBrasil } from "@/lib/sucessorio/itcmd-uf"
import {
  DEFAULT_SUCESSAO_HOLDING,
  hidratarHolding,
  type ImovelHolding,
  type SucessaoHolding,
} from "@/lib/sucessorio/tipos"
import { VOGA } from "@/lib/voga-tokens"

const UFS = Object.keys(ITCMD_POR_UF) as UfBrasil[]
const PASSOS = ["Imóveis", "Renda", "Estrutura", "Resultado"] as const

function novoId() {
  return `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function ComparadorHolding({
  onGerarRelatorio,
  gerandoPdf,
}: {
  onGerarRelatorio?: (resultado: ComparadorHolding) => void
  gerandoPdf?: boolean
}) {
  const { state, setSucessao, setAtivos } = usePlano()
  const locked = usePlanoReadOnly()
  const moeda = state.moeda === "USD" ? "USD" : "BRL"
  const holding = hidratarHolding(state.sucessao.holding)
  const [passo, setPasso] = useState(0)

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
        style: "currency",
        currency: moeda,
        maximumFractionDigits: 0,
      }),
    [moeda],
  )

  const holdingEfetivo = useMemo((): SucessaoHolding => {
    if (holding.preenchidoDoPlano || holding.imoveis.length > 0) return holding
    const fontes = state.dadosPessoais.fontesRenda ?? []
    const outrosMensal = fontes
      .filter((f) => f.tipo !== "aluguel")
      .reduce((s, f) => s + (Number(f.valorMensal) || 0), 0)
    const fallbackRenda = receitaMensalAtual(fontes) || state.dadosPessoais.renda || 0
    return {
      ...holding,
      imoveis: imoveisDeAtivos(state.ativos),
      outrosRendimentosAnuais: holding.outrosRendimentosAnuais || outrosMensal * 12 || fallbackRenda * 12,
      herdeiros: holding.herdeiros || state.dadosPessoais.filhos?.length || state.sucessao.herdeiros || 0,
      ufDomicilio: holding.ufDomicilio || state.dadosPessoais.uf || "SP",
      regimeBens:
        holding.regimeBens ||
        state.sucessao.regimeSucessao ||
        state.dadosPessoais.regime ||
        "Comunhão Parcial de Bens",
    }
  }, [holding, state.ativos, state.dadosPessoais, state.sucessao.herdeiros, state.sucessao.regimeSucessao])

  useEffect(() => {
    if (locked || holding.preenchidoDoPlano) return
    setSucessao({ holding: { ...holdingEfetivo, preenchidoDoPlano: true } })
  }, [locked, holding.preenchidoDoPlano, holdingEfetivo, setSucessao])

  const patch = (parcial: Partial<SucessaoHolding>) => {
    if (locked) return
    setSucessao({ holding: { ...holdingEfetivo, preenchidoDoPlano: true, ...parcial } })
  }

  const atualizarImovel = (id: string, parcial: Partial<ImovelHolding>) => {
    if (locked) return
    const imoveis = holdingEfetivo.imoveis.map((i) => (i.id === id ? { ...i, ...parcial } : i))
    patch({ imoveis })
    const alvo = imoveis.find((i) => i.id === id)
    if (!alvo?.ativoId) return
    setAtivos(
      state.ativos.map((a) => {
        if (a.id !== alvo.ativoId) return a
        const next: Ativo = { ...a }
        if (parcial.valorMercado != null) next.valor = parcial.valorMercado
        if (parcial.valorIrpf != null) next.valorIrpf = parcial.valorIrpf
        if (parcial.aluguelMensal != null) next.aluguelMensal = parcial.aluguelMensal
        if (parcial.uf != null) next.uf = parcial.uf
        if (parcial.municipio != null) next.municipio = parcial.municipio
        if (parcial.tipo != null) next.tipoImovel = parcial.tipo
        return next
      }),
    )
  }

  const resultado = useMemo(() => calcularComparadorHolding(holdingEfetivo), [holdingEfetivo])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Pessoa física vs. holding patrimonial — {holdingEfetivo.imoveis.length} imóvel(is)
        </p>
        {onGerarRelatorio && !locked ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="no-print"
            disabled={gerandoPdf}
            onClick={() => onGerarRelatorio(resultado)}
          >
            <FileDown className="h-4 w-4 mr-1.5" />
            {gerandoPdf ? "Gerando…" : "Gerar relatório"}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {PASSOS.map((label, i) => (
          <Button
            key={label}
            type="button"
            size="sm"
            variant={passo === i ? "default" : "outline"}
            onClick={() => setPasso(i)}
          >
            {i + 1}. {label}
          </Button>
        ))}
      </div>

      {passo === 0 && (
        <PassoImoveis
          holding={holdingEfetivo}
          locked={locked}
          moeda={moeda}
          onPatch={patch}
          onUpdate={atualizarImovel}
        />
      )}
      {passo === 1 && <PassoRenda holding={holdingEfetivo} locked={locked} moeda={moeda} onPatch={patch} />}
      {passo === 2 && <PassoEstrutura holding={holdingEfetivo} locked={locked} moeda={moeda} onPatch={patch} />}
      {passo === 3 && <PassoResultado resultado={resultado} fmt={fmt} moeda={moeda} />}

      <div className="flex justify-between">
        <Button type="button" variant="ghost" disabled={passo === 0} onClick={() => setPasso((p) => p - 1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>
        <Button type="button" disabled={passo === PASSOS.length - 1} onClick={() => setPasso((p) => p + 1)}>
          Próximo
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

function PassoImoveis({
  holding,
  locked,
  moeda,
  onPatch,
  onUpdate,
}: {
  holding: SucessaoHolding
  locked: boolean
  moeda: "BRL" | "USD"
  onPatch: (p: Partial<SucessaoHolding>) => void
  onUpdate: (id: string, p: Partial<ImovelHolding>) => void
}) {
  return (
    <div className="space-y-4">
      {holding.imoveis.map((im, idx) => (
        <Card key={im.id} className="form-card">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-medium">{im.descricao || `Imóvel ${idx + 1}`}</CardTitle>
            {!locked && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => onPatch({ imoveis: holding.imoveis.filter((x) => x.id !== im.id) })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Campo label="Descrição">
              <Input
                value={im.descricao}
                disabled={locked}
                onChange={(e) => onUpdate(im.id, { descricao: e.target.value })}
                className="form-card"
              />
            </Campo>
            <Campo label="Valor de mercado">
              <InputMoeda
                value={im.valorMercado}
                moeda={moeda}
                onChange={(v) => onUpdate(im.id, { valorMercado: v })}
                className="form-card"
              />
            </Campo>
            <Campo label="Valor declarado no IRPF">
              <InputMoeda
                value={im.valorIrpf}
                moeda={moeda}
                onChange={(v) => onUpdate(im.id, { valorIrpf: v })}
                className="form-card"
              />
            </Campo>
            <Campo label="Aluguel mensal">
              <InputMoeda
                value={im.aluguelMensal}
                moeda={moeda}
                onChange={(v) => onUpdate(im.id, { aluguelMensal: v })}
                className="form-card"
              />
            </Campo>
            <Campo label="Tipo">
              <Select
                value={im.tipo}
                disabled={locked}
                onValueChange={(v) => onUpdate(im.id, { tipo: v as ImovelHolding["tipo"] })}
              >
                <SelectTrigger className="form-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residencial">Residencial</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="UF">
              <Select value={im.uf || undefined} disabled={locked} onValueChange={(v) => onUpdate(im.id, { uf: v })}>
                <SelectTrigger className="form-card">
                  <SelectValue placeholder="UF" />
                </SelectTrigger>
                <SelectContent>
                  {UFS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Município">
              <Input
                value={im.municipio}
                disabled={locked}
                onChange={(e) => onUpdate(im.id, { municipio: e.target.value })}
                className="form-card"
              />
            </Campo>
          </CardContent>
        </Card>
      ))}
      {!locked && (
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onPatch({
              imoveis: [
                ...holding.imoveis,
                {
                  id: novoId(),
                  descricao: `Imóvel ${holding.imoveis.length + 1}`,
                  valorMercado: 0,
                  valorIrpf: 0,
                  aluguelMensal: 0,
                  tipo: "residencial",
                  uf: holding.ufDomicilio || "SP",
                  municipio: "",
                },
              ],
            })
          }
        >
          <Plus className="h-4 w-4 mr-1" />
          Incluir imóvel
        </Button>
      )}
    </div>
  )
}

function PassoRenda({
  holding,
  locked,
  moeda,
  onPatch,
}: {
  holding: SucessaoHolding
  locked: boolean
  moeda: "BRL" | "USD"
  onPatch: (p: Partial<SucessaoHolding>) => void
}) {
  return (
    <Card className="form-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Renda e domicílio</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Campo label="Despesas dedutíveis mensais (IPTU, condomínio, adm.)">
          <InputMoeda
            value={holding.despesasDedutiveisMensais}
            moeda={moeda}
            onChange={(v) => onPatch({ despesasDedutiveisMensais: v })}
            className="form-card"
          />
        </Campo>
        <Campo label="Outros rendimentos tributáveis anuais">
          <InputMoeda
            value={holding.outrosRendimentosAnuais}
            moeda={moeda}
            onChange={(v) => onPatch({ outrosRendimentosAnuais: v })}
            className="form-card"
          />
        </Campo>
        <Campo label="Número de herdeiros">
          <Input
            type="number"
            min={0}
            value={holding.herdeiros || ""}
            disabled={locked}
            onChange={(e) => onPatch({ herdeiros: Number(e.target.value) || 0 })}
            className="form-card"
          />
        </Campo>
        <Campo label="UF do domicílio">
          <Select
            value={holding.ufDomicilio}
            disabled={locked}
            onValueChange={(v) => onPatch({ ufDomicilio: v })}
          >
            <SelectTrigger className="form-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UFS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>
        <Campo label="Regime de bens">
          <Input
            value={holding.regimeBens}
            disabled={locked}
            onChange={(e) => onPatch({ regimeBens: e.target.value })}
            className="form-card"
          />
        </Campo>
      </CardContent>
    </Card>
  )
}

function PassoEstrutura({
  holding,
  locked,
  moeda,
  onPatch,
}: {
  holding: SucessaoHolding
  locked: boolean
  moeda: "BRL" | "USD"
  onPatch: (p: Partial<SucessaoHolding>) => void
}) {
  return (
    <div className="space-y-4">
      <Card className="form-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Holding</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label="Custo mensal da estrutura">
            <InputMoeda value={holding.custoMensal} moeda={moeda} onChange={(v) => onPatch({ custoMensal: v })} className="form-card" />
          </Campo>
          <Campo label="Custo de abertura">
            <InputMoeda value={holding.custoAbertura} moeda={moeda} onChange={(v) => onPatch({ custoAbertura: v })} className="form-card" />
          </Campo>
          <Campo label="Alíquota de ITBI do município (%)">
            <Input
              type="number"
              step="0.1"
              disabled={locked}
              value={holding.aliquotaItbi * 100}
              onChange={(e) => onPatch({ aliquotaItbi: (Number(e.target.value) || 0) / 100 })}
              className="form-card"
            />
          </Campo>
          <Campo label="Integralização">
            <Select
              value={holding.integralizacao}
              disabled={locked}
              onValueChange={(v) => onPatch({ integralizacao: v as SucessaoHolding["integralizacao"] })}
            >
              <SelectTrigger className="form-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custo">Pelo custo (IRPF)</SelectItem>
                <SelectItem value="mercado">Pelo valor de mercado</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Distribuição de lucros">
            <Select
              value={holding.distribuicao}
              disabled={locked}
              onValueChange={(v) =>
                onPatch({
                  distribuicao: v as SucessaoHolding["distribuicao"],
                  percentualDistribuicao: v === "parcial" ? holding.percentualDistribuicao || 0.5 : 1,
                })
              }
            >
              <SelectTrigger className="form-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="total">Total</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
              </SelectContent>
            </Select>
          </Campo>
          {holding.distribuicao === "parcial" && (
            <Campo label="% distribuído">
              <Input
                type="number"
                disabled={locked}
                value={Math.round(holding.percentualDistribuicao * 100)}
                onChange={(e) => onPatch({ percentualDistribuicao: (Number(e.target.value) || 0) / 100 })}
                className="form-card"
              />
            </Campo>
          )}
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label>ITBI só sobre o excedente (Tema 796)</Label>
            <Switch
              checked={holding.itbiSobreExcedente}
              disabled={locked}
              onCheckedChange={(v) => onPatch({ itbiSobreExcedente: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label>Aplicar imunidade de ITBI</Label>
            <Switch checked={holding.imunidadeItbi} disabled={locked} onCheckedChange={(v) => onPatch({ imunidadeItbi: v })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 md:col-span-2">
            <Label>Doação das quotas em vida com usufruto</Label>
            <Switch checked={holding.doacaoUsufruto} disabled={locked} onCheckedChange={(v) => onPatch({ doacaoUsufruto: v })} />
          </div>
        </CardContent>
      </Card>

      <Card className="form-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Premissas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Horizonte (anos)">
            <Input
              type="number"
              min={1}
              disabled={locked}
              value={holding.horizonteAnos}
              onChange={(e) => onPatch({ horizonteAnos: Number(e.target.value) || 1 })}
              className="form-card"
            />
          </Campo>
          <Campo label="Reajuste anual do aluguel (%)">
            <Input
              type="number"
              step="0.1"
              disabled={locked}
              value={holding.reajusteAluguel * 100}
              onChange={(e) => onPatch({ reajusteAluguel: (Number(e.target.value) || 0) / 100 })}
              className="form-card"
            />
          </Campo>
          <Campo label="Taxa de desconto (%)">
            <Input
              type="number"
              step="0.1"
              disabled={locked}
              value={holding.taxaDesconto * 100}
              onChange={(e) => onPatch({ taxaDesconto: (Number(e.target.value) || 0) / 100 })}
              className="form-card"
            />
          </Campo>
          <Campo label="Ano de início">
            <Input
              type="number"
              disabled={locked}
              value={holding.anoInicio}
              onChange={(e) => onPatch({ anoInicio: Number(e.target.value) || 2026 })}
              className="form-card"
            />
          </Campo>
          <Campo label="CBS estimada (%)">
            <Input
              type="number"
              step="0.1"
              disabled={locked}
              value={holding.aliquotaCbs * 100}
              onChange={(e) => onPatch({ aliquotaCbs: (Number(e.target.value) || 0) / 100 })}
              className="form-card"
            />
          </Campo>
          <Campo label="IBS estimado cheio (%)">
            <Input
              type="number"
              step="0.1"
              disabled={locked}
              value={holding.aliquotaIbs * 100}
              onChange={(e) => onPatch({ aliquotaIbs: (Number(e.target.value) || 0) / 100 })}
              className="form-card"
            />
          </Campo>
          <Campo label="Redução IBS/CBS na locação (%)">
            <Input
              type="number"
              disabled={locked}
              value={holding.reducaoIbsCbsLocacao * 100}
              onChange={(e) => onPatch({ reducaoIbsCbsLocacao: (Number(e.target.value) || 0) / 100 })}
              className="form-card"
            />
          </Campo>
          <Campo label="Fração da nua-propriedade">
            <Input
              type="number"
              step="0.01"
              disabled={locked}
              value={holding.fatorNuaPropriedade}
              onChange={(e) => onPatch({ fatorNuaPropriedade: Number(e.target.value) || 0 })}
              className="form-card"
            />
          </Campo>
        </CardContent>
      </Card>
    </div>
  )
}

function PassoResultado({
  resultado,
  fmt,
  moeda,
}: {
  resultado: ComparadorHolding
  fmt: Intl.NumberFormat
  moeda: "BRL" | "USD"
}) {
  const y1 = resultado.anos[0]
  const dados = resultado.anos.map((a) => ({
    ano: String(a.ano),
    PF: Math.round(a.pfCarga),
    Holding: Math.round(a.holdingCarga),
    cbs: a.cbsAtivo,
    ibs: a.ibsFator,
  }))

  return (
    <div className="space-y-6">
      <Card className="form-card border-primary/30">
        <CardContent className="pt-6 space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Veredito</p>
          <p className="text-2xl font-medium text-foreground">{resultado.veredito.frase}</p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
            {resultado.veredito.motivos.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <KpiGrid>
        <KpiCard label="Carga PF (1º ano)" value={fmt.format(y1?.pfCarga ?? 0)} hint={y1 ? String(y1.ano) : ""} />
        <KpiCard label="Carga holding (1º ano)" value={fmt.format(y1?.holdingCarga ?? 0)} />
        <KpiCard label="Economia no 1º ano" value={fmt.format(y1?.economia ?? 0)} />
        <KpiCard label="Economia acumulada" value={fmt.format(resultado.economiaAnos)} />
        <KpiCard label={`VPL a ${moeda}`} value={fmt.format(resultado.vpl)} hint="Já desconta o custo de entrada" />
        <KpiCard
          label="Payback"
          value={
            resultado.paybackDentro
              ? `${resultado.paybackAnos} anos e ${resultado.paybackMeses} meses`
              : "Além do horizonte"
          }
        />
      </KpiGrid>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <MiniConta titulo="1. Renda anual" a={fmt.format(y1?.pfCarga ?? 0)} b={fmt.format(y1?.holdingCarga ?? 0)} />
        <MiniConta titulo="2. Custo de entrada" a="—" b={fmt.format(resultado.entrada.total)} extra={`ITBI ${fmt.format(resultado.entrada.itbi)}`} />
        <MiniConta
          titulo="3. Sucessão"
          a={fmt.format(resultado.sucessao.inventario.total)}
          b={fmt.format(resultado.sucessao.custoHoldingSucessao)}
          extra={`Doação ${fmt.format(resultado.sucessao.doacao.imposto)}`}
        />
        <MiniConta titulo="4. Consolidado" a={fmt.format(resultado.economiaAnos)} b={fmt.format(resultado.vpl)} extra="Acumulado / VPL" />
      </div>

      <Card className="form-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Carga anual PF vs. holding</CardTitle>
        </CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dados} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={VOGA.gelo} />
              <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt.format(Number(v))} width={80} />
              <Tooltip
                {...CHART_TOOLTIP_PROPS}
                formatter={(value) => fmt.format(Number(value ?? 0))}
              />
              <Legend />
              {resultado.anos
                .filter((a) => a.cbsAtivo)
                .slice(0, 1)
                .map((a) => (
                  <ReferenceLine key="cbs" x={String(a.ano)} stroke={VOGA.nota} label="CBS" />
                ))}
              {resultado.anos
                .filter((a) => a.ibsFator >= 1)
                .slice(0, 1)
                .map((a) => (
                  <ReferenceLine key="ibs" x={String(a.ano)} stroke={VOGA.alerta} label="IBS cheio" />
                ))}
              <Line type="monotone" dataKey="PF" stroke={VOGA.alerta} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Holding" stroke={VOGA.brasilia} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Accordion type="single" collapsible>
        <AccordionItem value="tabela">
          <AccordionTrigger>Tabela ano a ano</AccordionTrigger>
          <AccordionContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3">Ano</th>
                    <th className="py-2 pr-3">PF</th>
                    <th className="py-2 pr-3">Holding</th>
                    <th className="py-2 pr-3">Economia</th>
                    <th className="py-2 pr-3">Acumulada</th>
                    <th className="py-2">IVA</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.anos.map((a) => (
                    <tr key={a.ano} className="border-b border-border/60">
                      <td className="py-2 pr-3">{a.ano}</td>
                      <td className="py-2 pr-3">{fmt.format(a.pfCarga)}</td>
                      <td className="py-2 pr-3">{fmt.format(a.holdingCarga)}</td>
                      <td className="py-2 pr-3">{fmt.format(a.economia)}</td>
                      <td className="py-2 pr-3">{fmt.format(a.economiaAcumulada)}</td>
                      <td className="py-2">
                        {a.cbsAtivo ? (
                          <Badge variant="outline">{a.ibsFator >= 1 ? "CBS+IBS" : "CBS"}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {resultado.pfContribuinteIva && (
        <p className="text-sm text-muted-foreground">
          A PF entra como contribuinte de IBS/CBS (mais de 3 imóveis alugados e receita acima de R$ 240 mil/ano).
        </p>
      )}

      <Card className="form-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Pontos de atenção</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-2">
            {resultado.pontosAtencao.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

function MiniConta({ titulo, a, b, extra }: { titulo: string; a: string; b: string; extra?: string }) {
  return (
    <Card className="form-card">
      <CardContent className="pt-4 space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{titulo}</p>
        <p className="text-sm">PF {a}</p>
        <p className="text-sm">Holding {b}</p>
        {extra ? <p className="text-xs text-muted-foreground">{extra}</p> : null}
      </CardContent>
    </Card>
  )
}

function Campo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="field-label">{label}</Label>
      {children}
    </div>
  )
}
