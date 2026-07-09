"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { InputMoeda } from "@/components/ui/input-moeda"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import {
  ArrowRight,
  Briefcase,
  Home,
  Handshake,
  CircleDollarSign,
  Pencil,
  Trash2,
  Plus,
  Car,
  UtensilsCrossed,
  GraduationCap,
  HeartPulse,
  Sparkles,
  Landmark,
  type LucideIcon,
} from "lucide-react"
import { usePlano } from "@/lib/plano-context"
import type { FonteRenda, TipoFonteRenda, PrazoFonteRenda, DespesaItem, CategoriaDespesa } from "@/lib/plano-context"
import {
  criarFonteRenda,
  getFontesRenda,
  labelPrazoFonte,
  receitaMensalAtual,
  TIPOS_FONTE_RENDA,
} from "@/lib/renda-utils"
import {
  criarDespesa,
  getDespesas,
  despesaMensalAtual,
  labelDespesa,
  CATEGORIAS_DESPESA,
  DESCRICOES_DESPESA_PADRAO,
} from "@/lib/despesa-utils"

interface DadosPessoaisProps {
  onNavigate: (section: string) => void
  readOnly?: boolean
}

const ICONES_FONTE: Record<TipoFonteRenda, LucideIcon> = {
  salario: Briefcase,
  aluguel: Home,
  venda_participacao: Handshake,
  outros: CircleDollarSign,
}

const ICONES_DESPESA: Record<CategoriaDespesa, LucideIcon> = {
  Moradia: Home,
  Transporte: Car,
  Alimentação: UtensilsCrossed,
  Educação: GraduationCap,
  Saúde: HeartPulse,
  Lazer: Sparkles,
  "Financiamento/Empréstimo": Landmark,
  Outros: CircleDollarSign,
}

const MESES = [
  { v: 1, l: "Janeiro" },
  { v: 2, l: "Fevereiro" },
  { v: 3, l: "Março" },
  { v: 4, l: "Abril" },
  { v: 5, l: "Maio" },
  { v: 6, l: "Junho" },
  { v: 7, l: "Julho" },
  { v: 8, l: "Agosto" },
  { v: 9, l: "Setembro" },
  { v: 10, l: "Outubro" },
  { v: 11, l: "Novembro" },
  { v: 12, l: "Dezembro" },
]

export function DadosPessoais({ onNavigate }: DadosPessoaisProps) {
  const { state, setDadosPessoais, setFontesRenda, setDespesas } = usePlano()
  const { dadosPessoais } = state
  const moeda = state.moeda ?? "BRL"

  const fontesRenda = useMemo(() => getFontesRenda(dadosPessoais), [dadosPessoais])
  const despesas = useMemo(() => getDespesas(dadosPessoais), [dadosPessoais])
  const receitaTotal = useMemo(() => receitaMensalAtual(fontesRenda), [fontesRenda])
  const despesaTotal = useMemo(() => despesaMensalAtual(despesas), [despesas])

  const [modalFonteOpen, setModalFonteOpen] = useState(false)
  const [editingFonte, setEditingFonte] = useState<FonteRenda | null>(null)
  const [formFonte, setFormFonte] = useState<FonteRenda>(() => criarFonteRenda())

  const [modalDespesaOpen, setModalDespesaOpen] = useState(false)
  const [editingDespesa, setEditingDespesa] = useState<DespesaItem | null>(null)
  const [formDespesa, setFormDespesa] = useState<DespesaItem>(() => criarDespesa())

  const abrirNovaFonte = () => {
    setEditingFonte(null)
    setFormFonte(criarFonteRenda())
    setModalFonteOpen(true)
  }

  const abrirEditarFonte = (fonte: FonteRenda) => {
    setEditingFonte(fonte)
    setFormFonte({ ...fonte, prazo: { ...fonte.prazo } })
    setModalFonteOpen(true)
  }

  const salvarFonte = () => {
    const next = editingFonte
      ? fontesRenda.map((f) => (f.id === editingFonte.id ? formFonte : f))
      : [...fontesRenda, formFonte]
    setFontesRenda(next)
    setModalFonteOpen(false)
  }

  const removerFonte = (id: string) => {
    setFontesRenda(fontesRenda.filter((f) => f.id !== id))
  }

  const abrirNovaDespesa = () => {
    setEditingDespesa(null)
    setFormDespesa(criarDespesa())
    setModalDespesaOpen(true)
  }

  const abrirEditarDespesa = (despesa: DespesaItem) => {
    setEditingDespesa(despesa)
    setFormDespesa({ ...despesa })
    setModalDespesaOpen(true)
  }

  const salvarDespesa = () => {
    const next = editingDespesa
      ? despesas.map((d) => (d.id === editingDespesa.id ? formDespesa : d))
      : [...despesas, formDespesa]
    setDespesas(next)
    setModalDespesaOpen(false)
  }

  const removerDespesa = (id: string) => {
    setDespesas(despesas.filter((d) => d.id !== id))
  }

  const setPrazoFonte = (prazo: PrazoFonteRenda) => {
    setFormFonte((f) => ({ ...f, prazo }))
  }

  const PROFISSOES_PRINCIPAIS = useMemo(
    () => [
      "Médico(a)",
      "Advogado(a)",
      "Engenheiro(a)",
      "Empresário(a)",
      "Servidor(a) Público(a)",
      "Professor(a)",
      "Arquiteto(a)",
      "Dentista",
      "Contador(a)",
      "Administrador(a)",
      "Consultor(a)",
    ],
    [],
  )

  const isCasado = dadosPessoais.estadoCivil === "casado"

  const capacidadePoupanca = useMemo(() => {
    const poupanca = receitaTotal - despesaTotal
    const percentual = receitaTotal > 0 ? (poupanca / receitaTotal) * 100 : 0
    return { valor: poupanca, percentual }
  }, [receitaTotal, despesaTotal])

  const cardStyle = {
    background: "var(--surface)",
    borderRadius: 8,
    padding: "20px 24px",
    marginBottom: 16,
  } as const

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <p className="page-breadcrumb">Novo Plano</p>
        <h1 className="page-title">
          Dados <span className="text-primary">Pessoais</span>
        </h1>
        <p className="page-subtitle">
          Informações básicas para o diagnóstico financeiro personalizado
        </p>
      </div>

      {/* Card 1 - Identificação */}
      <div className="space-y-4">
        <span className="field-label">
          Identificação
        </span>
        <div style={cardStyle}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome Completo */}
            <div className="space-y-2">
              <Label 
                htmlFor="nome" 
                className="field-label"
              >
                Nome Completo
              </Label>
              <Input
                id="nome"
                value={dadosPessoais.nome}
                onChange={(e) => setDadosPessoais({ nome: e.target.value })}
                placeholder="Nome do cliente"
                className="form-input placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* CPF */}
            <div className="space-y-2">
              <Label
                htmlFor="cpf"
                className="field-label"
              >
                CPF
              </Label>
              <Input
                id="cpf"
                inputMode="numeric"
                maxLength={14}
                value={
                  ((dadosPessoais.cpf ?? "").replace(/\D/g, "")).replace(
                    /^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/,
                    (_m, a, b, c, d) =>
                      [a, b, c].filter(Boolean).join(".") + (d ? `-${d}` : ""),
                  )
                }
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 11)
                  setDadosPessoais({ cpf: digits })
                }}
                placeholder="000.000.000-00"
                className="form-input placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30 tabular-nums"
              />
            </div>

            {/* Nome do Cônjuge - aparece quando Casado(a) ou União Estável */}
            <div 
              className={`space-y-2 transition-all duration-300 ease-in-out ${
                isCasado 
                  ? "opacity-100 max-h-32 translate-y-0" 
                  : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pointer-events-none"
              }`}
            >
              <Label 
                htmlFor="conjuge" 
                className="field-label"
              >
                Nome do Cônjuge
              </Label>
              <Input
                id="conjuge"
                value={dadosPessoais.conjuge}
                onChange={(e) => setDadosPessoais({ conjuge: e.target.value })}
                placeholder="Nome do cônjuge"
                className="form-input placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Profissão */}
            <div className="space-y-2">
              <Label 
                htmlFor="profissao" 
                className="field-label"
              >
                Profissão
              </Label>
              {(() => {
                const profissaoAtual = (dadosPessoais.profissao ?? "").trim()
                const isProfissaoPrincipal = PROFISSOES_PRINCIPAIS.includes(profissaoAtual)
                const selectValue = isProfissaoPrincipal ? profissaoAtual : "Outros"
                const otherValue = isProfissaoPrincipal ? "" : profissaoAtual

                return (
                  <div className="space-y-2">
                    <Select
                      value={selectValue}
                      onValueChange={(value) => {
                        if (value === "Outros") {
                          setDadosPessoais({ profissao: isProfissaoPrincipal ? "" : profissaoAtual })
                          return
                        }
                        setDadosPessoais({ profissao: value })
                      }}
                    >
                      <SelectTrigger className="form-input focus:border-primary focus:ring-1 focus:ring-primary/30">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="form-card">
                        {PROFISSOES_PRINCIPAIS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>

                    {selectValue === "Outros" && (
                      <Input
                        id="profissao"
                        value={otherValue}
                        onChange={(e) => setDadosPessoais({ profissao: e.target.value })}
                        placeholder="Digite sua profissão"
                        className="form-input placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
                      />
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Data de Nascimento */}
            <div className="space-y-2">
              <Label 
                htmlFor="dataNascimento" 
                className="field-label"
              >
                Data de Nascimento
              </Label>
              <Input
                id="dataNascimento"
                type="date"
                value={dadosPessoais.nascimento}
                onChange={(e) => setDadosPessoais({ nascimento: e.target.value })}
                className="form-input focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Estado Civil */}
            <div className="space-y-2">
              <Label 
                htmlFor="estadoCivil" 
                className="field-label"
              >
                Estado Civil
              </Label>
              <Select
                value={dadosPessoais.estadoCivil || "solteiro"}
                onValueChange={(value) => {
                  setDadosPessoais({ estadoCivil: value })
                  if (value !== "casado") {
                    setDadosPessoais({ conjuge: "" })
                  }
                }}
              >
                <SelectTrigger className="form-input focus:border-primary focus:ring-1 focus:ring-primary/30">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="form-card">
                  <SelectItem value="casado">Casado(a)</SelectItem>
                  <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                  <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                  <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Regime de Bens */}
            <div className="space-y-2">
              <Label 
                htmlFor="regimeBens" 
                className="field-label"
              >
                Regime de Bens
              </Label>
              <Select
                value={dadosPessoais.regime || "Comunhão Parcial de Bens"}
                onValueChange={(value) => setDadosPessoais({ regime: value })}
              >
                <SelectTrigger className="form-input focus:border-primary focus:ring-1 focus:ring-primary/30">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="form-card">
                  <SelectItem value="Comunhão Parcial de Bens">Comunhão Parcial de Bens</SelectItem>
                  <SelectItem value="Comunhão Universal de Bens">Comunhão Universal de Bens</SelectItem>
                  <SelectItem value="Separação Total de Bens">Separação Total de Bens</SelectItem>
                  <SelectItem value="Participação Final nos Aquestos">Participação Final nos Aquestos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sexo */}
            <div className="space-y-2">
              <Label
                htmlFor="sexo"
                className="field-label"
              >
                Sexo
              </Label>
              <Select
                value={
                  dadosPessoais.sexo === "M" || dadosPessoais.sexo === "F"
                    ? dadosPessoais.sexo
                    : "M"
                }
                onValueChange={(value) => setDadosPessoais({ sexo: value as "M" | "F" })}
              >
                <SelectTrigger
                  id="sexo"
                  className="form-input focus:border-primary focus:ring-1 focus:ring-primary/30"
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="form-card">
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Número de Filhos */}
            <div className="space-y-2">
              <Label 
                htmlFor="filhos" 
                className="field-label"
              >
                Número de Filhos
              </Label>
              <Input
                id="filhos"
                type="number"
                min={0}
                value={(dadosPessoais.filhos?.length ?? 0) || ""}
                onChange={(e) => {
                  const nextCount = Math.max(0, parseInt(e.target.value) || 0)
                  const cur = Array.isArray(dadosPessoais.filhos) ? dadosPessoais.filhos : []
                  if (nextCount === cur.length) return
                  if (nextCount > cur.length) {
                    const added = Array.from({ length: nextCount - cur.length }, () => ({ nome: "", dataNascimento: "" }))
                    setDadosPessoais({ filhos: [...cur, ...added] })
                    return
                  }
                  setDadosPessoais({ filhos: cur.slice(0, nextCount) })
                }}
                placeholder="0"
                className="form-input placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filhos — detalhes (dinâmico) */}
      {(dadosPessoais.filhos?.length ?? 0) > 0 && (
        <div className="space-y-4">
          <span className="field-label">
            Filhos
          </span>
          <div style={cardStyle} className="space-y-6">
            {(dadosPessoais.filhos ?? []).map((filho, idx) => (
              <div key={idx} className="space-y-4">
                <p className="field-label">
                  Filho {idx + 1}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`filho-nome-${idx}`}
                      className="field-label"
                    >
                      Nome Completo
                    </Label>
                    <Input
                      id={`filho-nome-${idx}`}
                      value={filho?.nome ?? ""}
                      onChange={(e) => {
                        const cur = Array.isArray(dadosPessoais.filhos) ? [...dadosPessoais.filhos] : []
                        cur[idx] = { ...(cur[idx] ?? { nome: "", dataNascimento: "" }), nome: e.target.value }
                        setDadosPessoais({ filhos: cur })
                      }}
                      placeholder="Nome do filho"
                      className="form-input placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor={`filho-nasc-${idx}`}
                      className="field-label"
                    >
                      Data de Nascimento
                    </Label>
                    <Input
                      id={`filho-nasc-${idx}`}
                      type="date"
                      value={filho?.dataNascimento ?? ""}
                      onChange={(e) => {
                        const cur = Array.isArray(dadosPessoais.filhos) ? [...dadosPessoais.filhos] : []
                        cur[idx] = { ...(cur[idx] ?? { nome: "", dataNascimento: "" }), dataNascimento: e.target.value }
                        setDadosPessoais({ filhos: cur })
                      }}
                      className="form-input focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receitas e Despesas */}
      <div className="space-y-4">
        <span className="field-label">Receitas</span>
        <div style={cardStyle}>
          {fontesRenda.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-3">Nenhuma fonte de renda cadastrada.</p>
          ) : (
            <ul className="space-y-2 mb-3">
              {fontesRenda.map((fonte) => {
                const Icon = ICONES_FONTE[fonte.tipo]
                const tipoLabel = TIPOS_FONTE_RENDA[fonte.tipo].label
                return (
                  <li
                    key={fonte.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {(fonte.descricao || tipoLabel).trim()}
                      </p>
                      <p className="text-xs text-muted-foreground">{tipoLabel}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {labelPrazoFonte(fonte.prazo)}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {moeda === "USD" ? "US$" : "R$"}{" "}
                      {fonte.valorMensal.toLocaleString(moeda === "USD" ? "en-US" : "pt-BR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => abrirEditarFonte(fonte)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removerFonte(fonte.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={abrirNovaFonte}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar fonte de renda
          </Button>
        </div>

        <span className="field-label">Despesas</span>
        <div style={cardStyle}>
          {despesas.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-3">Nenhuma despesa cadastrada.</p>
          ) : (
            <ul className="space-y-2 mb-3">
              {despesas.map((despesa) => {
                const Icon = ICONES_DESPESA[despesa.categoria]
                return (
                  <li
                    key={despesa.id}
                    className="flex items-center gap-3 rounded-lg border border-border/50 bg-background px-3 py-2.5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {(despesa.descricao || despesa.categoria).trim()}
                      </p>
                      <p className="text-xs text-muted-foreground">{despesa.categoria}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        despesa.temporaria
                          ? "bg-amber-100 text-amber-800"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {despesa.temporaria ? "Temporária" : "Contínua"}
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                      {moeda === "USD" ? "US$" : "R$"}{" "}
                      {despesa.valor.toLocaleString(moeda === "USD" ? "en-US" : "pt-BR", {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => abrirEditarDespesa(despesa)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removerDespesa(despesa.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full border-dashed"
            onClick={abrirNovaDespesa}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar despesa
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className="rounded-lg border border-border/50 px-4 py-3 flex items-center justify-between"
            style={{ background: "var(--surface)" }}
          >
            <span className="text-sm font-medium text-foreground">Receita mensal total</span>
            <span className="text-base font-bold tabular-nums text-primary">
              {moeda === "USD" ? "US$" : "R$"}{" "}
              {receitaTotal.toLocaleString(moeda === "USD" ? "en-US" : "pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div
            className="rounded-lg border border-border/50 px-4 py-3 flex items-center justify-between"
            style={{ background: "var(--surface)" }}
          >
            <span className="text-sm font-medium text-foreground">Despesa mensal total</span>
            <span className="text-base font-bold tabular-nums text-foreground">
              {moeda === "USD" ? "US$" : "R$"}{" "}
              {despesaTotal.toLocaleString(moeda === "USD" ? "en-US" : "pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        <div className="savings-badge w-full">
            <p className="text-white text-sm font-medium">
              Capacidade de poupança mensal:{" "}
              <span className="font-semibold">
                {moeda === "USD" ? "US$" : "R$"}{" "}
                {capacidadePoupanca.valor.toLocaleString(moeda === "USD" ? "en-US" : "pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </span>{" "}
              <span className="text-white/80">
                ({capacidadePoupanca.percentual.toFixed(0)}% da renda)
              </span>
            </p>
          </div>
      </div>

      <Dialog open={modalFonteOpen} onOpenChange={setModalFonteOpen}>
        <DialogContent className="form-card rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingFonte ? "Editar fonte de renda" : "Nova fonte de renda"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Informe tipo, valor e vigência da receita
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="field-label">Tipo</Label>
              <Select
                value={formFonte.tipo}
                onValueChange={(v) => {
                  const tipo = v as TipoFonteRenda
                  setFormFonte((f) => ({
                    ...f,
                    tipo,
                    descricao: f.descricao === TIPOS_FONTE_RENDA[f.tipo].descricaoPadrao
                      ? TIPOS_FONTE_RENDA[tipo].descricaoPadrao
                      : f.descricao,
                  }))
                }}
              >
                <SelectTrigger className="form-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TIPOS_FONTE_RENDA) as TipoFonteRenda[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {TIPOS_FONTE_RENDA[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="field-label">Descrição</Label>
              <Input
                value={formFonte.descricao}
                onChange={(e) => setFormFonte((f) => ({ ...f, descricao: e.target.value }))}
                className="form-input"
                placeholder={TIPOS_FONTE_RENDA[formFonte.tipo].descricaoPadrao}
              />
            </div>

            <div className="space-y-2">
              <Label className="field-label">Valor mensal (R$)</Label>
              <InputMoeda
                value={formFonte.valorMensal}
                onChange={(valorMensal) => setFormFonte((f) => ({ ...f, valorMensal }))}
                moeda={moeda === "USD" ? "USD" : "BRL"}
                className="form-input"
                placeholder="0,00"
              />
            </div>

            <div className="space-y-2">
              <Label className="field-label">Prazo</Label>
              <div className="grid grid-cols-1 gap-2">
                {(
                  [
                    { id: "continua", label: "Contínua", desc: "Sem data de término" },
                    { id: "ate_data", label: "Até uma data", desc: "Encerra em ano/mês" },
                    { id: "evento_unico", label: "Evento único", desc: "Entra uma vez só" },
                  ] as const
                ).map((opt) => {
                  const selected = formFonte.prazo.tipo === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const ano = new Date().getFullYear()
                        if (opt.id === "continua") setPrazoFonte({ tipo: "continua" })
                        else if (opt.id === "ate_data")
                          setPrazoFonte({ tipo: "ate_data", anoFim: ano + 5, mesFim: 12 })
                        else setPrazoFonte({ tipo: "evento_unico", ano, mes: 1 })
                      }}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border/60 hover:border-primary/40"
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {formFonte.prazo.tipo === "ate_data" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="field-label">Mês fim</Label>
                  <Select
                    value={String(formFonte.prazo.mesFim)}
                    onValueChange={(v) =>
                      setPrazoFonte({
                        ...formFonte.prazo,
                        tipo: "ate_data",
                        mesFim: Number(v),
                      })
                    }
                  >
                    <SelectTrigger className="form-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map((m) => (
                        <SelectItem key={m.v} value={String(m.v)}>
                          {m.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="field-label">Ano fim</Label>
                  <Input
                    type="number"
                    min={new Date().getFullYear()}
                    value={formFonte.prazo.anoFim}
                    onChange={(e) =>
                      setPrazoFonte({
                        ...formFonte.prazo,
                        tipo: "ate_data",
                        anoFim: Number(e.target.value) || new Date().getFullYear(),
                      })
                    }
                    className="form-input"
                  />
                </div>
              </div>
            ) : null}

            {formFonte.prazo.tipo === "evento_unico" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="field-label">Mês</Label>
                  <Select
                    value={String(formFonte.prazo.mes)}
                    onValueChange={(v) =>
                      setPrazoFonte({
                        ...formFonte.prazo,
                        tipo: "evento_unico",
                        mes: Number(v),
                      })
                    }
                  >
                    <SelectTrigger className="form-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MESES.map((m) => (
                        <SelectItem key={m.v} value={String(m.v)}>
                          {m.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="field-label">Ano</Label>
                  <Input
                    type="number"
                    min={new Date().getFullYear()}
                    value={formFonte.prazo.ano}
                    onChange={(e) =>
                      setPrazoFonte({
                        ...formFonte.prazo,
                        tipo: "evento_unico",
                        ano: Number(e.target.value) || new Date().getFullYear(),
                      })
                    }
                    className="form-input"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setModalFonteOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={salvarFonte} disabled={formFonte.valorMensal <= 0}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={modalDespesaOpen} onOpenChange={setModalDespesaOpen}>
        <DialogContent className="form-card rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingDespesa ? "Editar despesa" : "Nova despesa"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Informe categoria, valor e se a despesa é temporária
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="field-label">Categoria</Label>
              <Select
                value={formDespesa.categoria}
                onValueChange={(v) => {
                  const categoria = v as CategoriaDespesa
                  setFormDespesa((f) => ({
                    ...f,
                    categoria,
                    descricao:
                      f.descricao === DESCRICOES_DESPESA_PADRAO[f.categoria]
                        ? DESCRICOES_DESPESA_PADRAO[categoria]
                        : f.descricao,
                  }))
                }}
              >
                <SelectTrigger className="form-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_DESPESA.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="field-label">Descrição</Label>
              <Input
                value={formDespesa.descricao}
                onChange={(e) => setFormDespesa((f) => ({ ...f, descricao: e.target.value }))}
                className="form-input"
                placeholder={DESCRICOES_DESPESA_PADRAO[formDespesa.categoria]}
              />
            </div>

            <div className="space-y-2">
              <Label className="field-label">Valor mensal (R$)</Label>
              <InputMoeda
                value={formDespesa.valor}
                onChange={(valor) => setFormDespesa((f) => ({ ...f, valor }))}
                moeda={moeda === "USD" ? "USD" : "BRL"}
                className="form-input"
                placeholder="0,00"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">Despesa temporária?</p>
                <p className="text-xs text-muted-foreground">
                  {formDespesa.temporaria ? labelDespesa(formDespesa) : "Despesa contínua no plano"}
                </p>
              </div>
              <Switch
                checked={formDespesa.temporaria}
                onCheckedChange={(checked) =>
                  setFormDespesa((f) => ({
                    ...f,
                    temporaria: checked,
                    inicioMeses: checked ? (f.inicioMeses ?? 0) : undefined,
                    duracaoMeses: checked ? (f.duracaoMeses ?? 12) : undefined,
                  }))
                }
              />
            </div>

            {formDespesa.temporaria ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="field-label">Começa daqui quantos meses</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formDespesa.inicioMeses ?? 0}
                    onChange={(e) =>
                      setFormDespesa((f) => ({
                        ...f,
                        inicioMeses: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="form-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="field-label">Dura quantos meses</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formDespesa.duracaoMeses ?? 12}
                    onChange={(e) =>
                      setFormDespesa((f) => ({
                        ...f,
                        duracaoMeses: Math.max(1, Number(e.target.value) || 1),
                      }))
                    }
                    className="form-input"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setModalDespesaOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={salvarDespesa} disabled={formDespesa.valor <= 0}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rodapé */}
      <div className="nav-footer">
        <Button onClick={() => onNavigate("patrimonio")} className="btn-next">
          Próximo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
