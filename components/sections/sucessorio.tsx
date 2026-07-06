"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { usePlano } from "@/lib/plano-context"
import { getSaldoDevedorPassivo } from "@/lib/patrimonio-utils"
import { calcularInventario } from "@/lib/engine"
import { MAG_PRODUTO_META, taxaFaixaEtaria } from "@/lib/mag/produtos"

const UFS_BR = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const

function extrairProdutosMag(json: unknown): { codigo: string; label: string }[] | null {
  if (Array.isArray(json)) {
    const rows = json
      .map((row: Record<string, unknown>) => {
        const codigo = row.codigoModeloProposta ?? row.codigo
        if (codigo == null || codigo === "") return null
        const nome = row.nome ?? row.descricao ?? String(codigo)
        return { codigo: String(codigo), label: `${codigo} — ${nome}` }
      })
      .filter(Boolean) as { codigo: string; label: string }[]
    return rows.length ? rows : null
  }
  if (json && typeof json === "object") {
    const o = json as Record<string, unknown>
    for (const key of ["modelos", "data", "resultado", "itens"]) {
      const sub = o[key]
      const parsed = extrairProdutosMag(sub)
      if (parsed) return parsed
    }
  }
  return null
}

function premioPorEstimativa(capital: number, idade: number, codigoProduto: string) {
  const mult = MAG_PRODUTO_META[codigoProduto]?.mult ?? 1
  return capital * taxaFaixaEtaria(idade) * mult
}

interface SucessorioProps {
  onNavigate: (section: string) => void
}

export function Sucessorio({ onNavigate }: SucessorioProps) {
  const { state, setSucessao, setDadosPessoais, getPatrimonioTotalConsolidado, getIdadeAtual } = usePlano()
  const { sucessao, dadosPessoais, ativos, passivos } = state
  const moeda = state.moeda ?? "BRL"

  const fmt = (v: number) =>
    new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: moeda === "USD" ? "USD" : "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v)

  const totalPassivosInv = useMemo(
    () => passivos.reduce((s, p) => s + getSaldoDevedorPassivo(p), 0),
    [passivos]
  )

  const patrimonioTotalConsolidado = getPatrimonioTotalConsolidado()
  const plInventario = sucessao.plEditavel > 0 ? sucessao.plEditavel : patrimonioTotalConsolidado
  const regimeInventario =
    sucessao.regimeSucessao || dadosPessoais.regime || "Comunhão Parcial de Bens"

  const inventario = useMemo(
    () =>
      calcularInventario(
        plInventario,
        regimeInventario,
        sucessao.herdeiros,
        sucessao.itcmd,
        sucessao.honorarios,
        sucessao.cartoriais,
        ativos,
        totalPassivosInv,
      ),
    [
      plInventario,
      regimeInventario,
      sucessao.herdeiros,
      sucessao.itcmd,
      sucessao.honorarios,
      sucessao.cartoriais,
      ativos,
      totalPassivosInv,
    ]
  )

  const quinhaoPorHerdeiro = useMemo(() => Math.max(0, inventario.porHerdeiro || 0), [inventario.porHerdeiro])

  const itcmdDFProgressivo = useMemo(() => {
    const base = quinhaoPorHerdeiro
    if (base <= 1_000_000) return 4
    if (base <= 2_000_000) return 5
    if (base <= 3_000_000) return 6
    return 8
  }, [quinhaoPorHerdeiro])

  const [itcmdModo, setItcmdModo] = useState<"DF" | "SP" | "MG" | "RJ" | "RS" | "OUTROS">(() => {
    const atual = sucessao.itcmd ?? 0
    if (atual === itcmdDFProgressivo) return "DF"
    if (atual === 4) return "SP"
    if (atual === 5) return "MG"
    if (atual === 8) return "RJ"
    if (atual === 6) return "RS"
    return "OUTROS"
  })

  useEffect(() => {
    if (itcmdModo === "DF") {
      setSucessao({ itcmd: itcmdDFProgressivo })
    }
  }, [itcmdModo, itcmdDFProgressivo, setSucessao])

  const produtosPadrao = useMemo(
    () =>
      Object.entries(MAG_PRODUTO_META).map(([codigo, v]) => ({
        codigo,
        label: `${codigo} — ${v.nome}`,
      })),
    [],
  )

  const [opcoesProduto, setOpcoesProduto] = useState(produtosPadrao)
  const [produtoSelecionado, setProdutoSelecionado] = useState("")
  const [capitalSegurado, setCapitalSegurado] = useState<number>(500_000)
  const [premioMensal, setPremioMensal] = useState<number | null>(null)
  const [premioAnual, setPremioAnual] = useState<number | null>(null)
  const [fontePremio, setFontePremio] = useState<"mag_api" | "estimativa">("estimativa")
  const [loadingPremio, setLoadingPremio] = useState(false)

  useEffect(() => {
    fetch("/api/mag/produtos")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const lista = extrairProdutosMag(data)
        if (lista?.length) setOpcoesProduto(lista)
      })
      .catch(() => {})
  }, [])

  const buscarPremioMAG = useCallback(async () => {
    if (!produtoSelecionado || capitalSegurado <= 0) {
      setPremioMensal(null)
      setPremioAnual(null)
      setFontePremio("estimativa")
      return
    }

    const idadeRef = getIdadeAtual() || 35

    const aplicarEstimativa = () => {
      const pm = premioPorEstimativa(capitalSegurado, idadeRef, produtoSelecionado)
      setPremioMensal(pm)
      setPremioAnual(pm * 12)
      setFontePremio("estimativa")
    }

    if (!dadosPessoais.nascimento) {
      aplicarEstimativa()
      return
    }

    setLoadingPremio(true)
    try {
      const meta = MAG_PRODUTO_META[produtoSelecionado]
      const anospag = meta?.anospag ?? 10

      const res = await fetch("/api/mag/simulacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataNascimento: dadosPessoais.nascimento,
          sexoId: dadosPessoais.sexo === "M" ? 1 : 2,
          renda: dadosPessoais.renda,
          uf: dadosPessoais.uf || "SP",
          codigoModeloProposta: produtoSelecionado,
          capitalSegurado,
          anospag,
        }),
      })

      const data = await res.json()

      if (res.ok && typeof data.premioMensal === "number" && data.premioMensal > 0) {
        setPremioMensal(data.premioMensal)
        setPremioAnual(typeof data.premioAnual === "number" ? data.premioAnual : data.premioMensal * 12)
        setFontePremio("mag_api")
        return
      }

      aplicarEstimativa()
    } catch {
      aplicarEstimativa()
    } finally {
      setLoadingPremio(false)
    }
  }, [
    produtoSelecionado,
    capitalSegurado,
    dadosPessoais.nascimento,
    dadosPessoais.sexo,
    dadosPessoais.renda,
    dadosPessoais.uf,
    getIdadeAtual,
  ])

  useEffect(() => {
    void buscarPremioMAG()
  }, [buscarPremioMAG])

  const handleProximo = () => {
    onNavigate("dashboard")
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Planejamento</p>
        <h1 className="text-2xl font-semibold text-foreground">
          Planejamento <span className="text-primary">Sucessório</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Estrutura de transmissão patrimonial, custos de inventário e proteção familiar
        </p>
      </div>

      {/* Card 1 - Parâmetros do Inventário */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">
            Parâmetros do Inventário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                ITCMD
              </Label>
              <div className="space-y-2">
                <Select
                  value={itcmdModo}
                  onValueChange={(value) => {
                    const v = value as typeof itcmdModo
                    setItcmdModo(v)
                    if (v === "DF") return setSucessao({ itcmd: itcmdDFProgressivo })
                    if (v === "SP") return setSucessao({ itcmd: 4 })
                    if (v === "MG") return setSucessao({ itcmd: 5 })
                    if (v === "RJ") return setSucessao({ itcmd: 8 })
                    if (v === "RS") return setSucessao({ itcmd: 6 })
                    // OUTROS: mantém valor atual e permite editar no input abaixo
                  }}
                >
                  <SelectTrigger className="bg-card border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="DF">DF — Progressivo (4% a 8%)</SelectItem>
                    <SelectItem value="SP">SP — 4%</SelectItem>
                    <SelectItem value="MG">MG — 5%</SelectItem>
                    <SelectItem value="RJ">RJ — 8%</SelectItem>
                    <SelectItem value="RS">RS — 6%</SelectItem>
                    <SelectItem value="OUTROS">Outros — inserir alíquota</SelectItem>
                  </SelectContent>
                </Select>

                {itcmdModo === "OUTROS" && (
                  <Input
                    type="number"
                    value={sucessao.itcmd || ""}
                    onChange={(e) => setSucessao({ itcmd: parseFloat(e.target.value) || 0 })}
                    className="bg-card border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Ex: 4"
                  />
                )}

                {itcmdModo === "DF" && (
                  <p className="text-xs text-muted-foreground">
                    Alíquota calculada: {itcmdDFProgressivo}% por herdeiro (quinhão de {fmt(quinhaoPorHerdeiro)})
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Honorários Advocatícios (%)
              </Label>
              <Input
                type="number"
                value={sucessao.honorarios || ""}
                onChange={(e) => setSucessao({ honorarios: parseFloat(e.target.value) || 0 })}
                className="bg-card border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Custos Cartoriais (%)
              </Label>
              <Input
                type="number"
                value={sucessao.cartoriais || ""}
                onChange={(e) => setSucessao({ cartoriais: parseFloat(e.target.value) || 0 })}
                className="bg-card border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Número de Herdeiros
              </Label>
              <Input
                type="number"
                value={sucessao.herdeiros || ""}
                onChange={(e) => setSucessao({ herdeiros: parseInt(e.target.value) || 0 })}
                className="bg-card border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-foreground">
            Prévia — Inventário sucessório
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-4 text-muted-foreground">
            <span>Patrimônio Total</span>
            <span className="font-medium text-foreground tabular-nums">{fmt(plInventario)}</span>
          </div>
          <div className="flex justify-between gap-4 text-muted-foreground">
            <span>Meação (cônjuge)</span>
            <span className="font-medium text-foreground tabular-nums">{fmt(inventario.meacao)}</span>
          </div>
          <div className="flex justify-between gap-4 text-muted-foreground">
            <span>Valor da herança (estimado)</span>
            <span className="font-medium text-foreground tabular-nums">{fmt(inventario.heranca)}</span>
          </div>
          <div className="flex justify-between gap-4 text-muted-foreground">
            <span>Custo total previsto (sobre a herança)</span>
            <span className="font-medium text-foreground tabular-nums">{fmt(inventario.custoTotal)}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">
            Comparador de seguro de vida (MAG)
          </CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Cotação integrada à API MAG quando configurada; caso contrário usa estimativa por faixa etária.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Produto</Label>
              <Select
                value={produtoSelecionado}
                onValueChange={setProdutoSelecionado}
              >
                <SelectTrigger className="bg-card border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-72">
                  {opcoesProduto.map((p) => (
                    <SelectItem key={p.codigo} value={p.codigo}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Capital segurado</Label>
              <Input
                type="number"
                min={0}
                step={1000}
                value={capitalSegurado || ""}
                onChange={(e) => setCapitalSegurado(parseFloat(e.target.value) || 0)}
                className="bg-card border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Sexo (simulação)</Label>
              <Select
                value={
                  dadosPessoais.sexo === "M" || dadosPessoais.sexo === "F"
                    ? dadosPessoais.sexo
                    : "M"
                }
                onValueChange={(v) => setDadosPessoais({ sexo: v as "M" | "F" })}
              >
                <SelectTrigger className="bg-card border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">UF</Label>
              <Select
                value={dadosPessoais.uf || "SP"}
                onValueChange={(v) => setDadosPessoais({ uf: v })}
              >
                <SelectTrigger className="bg-card border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border max-h-60">
                  {UFS_BR.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <span className="text-sm text-muted-foreground">Prêmio mensal estimado</span>
              <div className="flex items-center gap-2 flex-wrap">
                {fontePremio === "mag_api" ? (
                  <Badge
                    variant="secondary"
                    className="border-transparent bg-blue-600 text-white hover:bg-blue-600"
                  >
                    Cotação MAG
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="border-transparent bg-zinc-600 text-zinc-100 hover:bg-zinc-600"
                  >
                    Estimativa
                  </Badge>
                )}
                {loadingPremio && (
                  <span className="text-xs text-muted-foreground">Calculando…</span>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6">
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {premioMensal != null ? fmt(premioMensal) : "—"}
                <span className="text-sm font-normal text-muted-foreground"> /mês</span>
              </p>
              {premioAnual != null && (
                <p className="text-sm text-muted-foreground tabular-nums">
                  ~ {fmt(premioAnual)} /ano
                </p>
              )}
            </div>
            {!dadosPessoais.nascimento && produtoSelecionado && (
              <p className="text-xs text-amber-600/90">
                Informe a data de nascimento em Dados pessoais para habilitar a cotação MAG; enquanto isso, o valor é estimativa.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-4">
        <Button
          variant="outline"
          onClick={() => onNavigate("simulador-seguros")}
          className="border-border text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button 
          onClick={handleProximo}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Próximo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
