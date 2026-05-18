"use client"

import { useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight } from "lucide-react"
import { usePlano } from "@/lib/plano-context"

interface DadosPessoaisProps {
  onNavigate: (section: string) => void
}

export function DadosPessoais({ onNavigate }: DadosPessoaisProps) {
  const { state, setDadosPessoais } = usePlano()
  const { dadosPessoais } = state
  const moeda = state.moeda ?? "BRL"

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
    const poupanca = dadosPessoais.renda - dadosPessoais.despesa
    const percentual = dadosPessoais.renda > 0 ? (poupanca / dadosPessoais.renda) * 100 : 0
    return { valor: poupanca, percentual }
  }, [dadosPessoais.renda, dadosPessoais.despesa])

  const formatCurrency = (value: number) => {
    if (value === 0) return ""
    return value.toLocaleString(moeda === "USD" ? "en-US" : "pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const parseCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    return parseFloat(numbers) / 100 || 0
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-primary">
          <span className="text-muted-foreground">—</span>
          <span>Novo Plano</span>
        </div>
        <h1 className="text-3xl font-semibold text-foreground">
          Dados <span className="text-[#2D6DF5]">Pessoais</span>
        </h1>
        <p className="text-muted-foreground">
          Informações básicas para o diagnóstico financeiro personalizado
        </p>
      </div>

      {/* Card 1 - Identificação */}
      <div className="space-y-4">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Identificação
        </span>
        <div className="rounded-xl bg-card border border-border p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome Completo */}
            <div className="space-y-2">
              <Label 
                htmlFor="nome" 
                className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                Nome Completo
              </Label>
              <Input
                id="nome"
                value={dadosPessoais.nome}
                onChange={(e) => setDadosPessoais({ nome: e.target.value })}
                placeholder="Nome do cliente"
                className="h-11 bg-[#131929] border-[rgba(255,255,255,0.14)] text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Nome do Cônjuge - aparece apenas quando Estado Civil = Casado(a) */}
            <div 
              className={`space-y-2 transition-all duration-300 ease-in-out ${
                isCasado 
                  ? "opacity-100 max-h-24 translate-y-0" 
                  : "opacity-0 max-h-0 overflow-hidden -translate-y-2 pointer-events-none"
              }`}
            >
              <Label 
                htmlFor="conjuge" 
                className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                Nome do Cônjuge
              </Label>
              <Input
                id="conjuge"
                value={dadosPessoais.conjuge}
                onChange={(e) => setDadosPessoais({ conjuge: e.target.value })}
                placeholder="Nome do cônjuge"
                className="h-11 bg-[#131929] border-[rgba(255,255,255,0.14)] text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Profissão */}
            <div className="space-y-2">
              <Label 
                htmlFor="profissao" 
                className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
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
                      <SelectTrigger className="h-11 bg-[#131929] border-[rgba(255,255,255,0.14)] text-foreground focus:border-primary focus:ring-1 focus:ring-primary/30">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
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
                        className="h-11 bg-[#131929] border-[rgba(255,255,255,0.14)] text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
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
                className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                Data de Nascimento
              </Label>
              <Input
                id="dataNascimento"
                type="date"
                value={dadosPessoais.nascimento}
                onChange={(e) => setDadosPessoais({ nascimento: e.target.value })}
                className="h-11 bg-[#131929] border-[rgba(255,255,255,0.14)] text-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>

            {/* Estado Civil */}
            <div className="space-y-2">
              <Label 
                htmlFor="estadoCivil" 
                className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                Estado Civil
              </Label>
              <Select
                value={dadosPessoais.estadoCivil || "solteiro"}
                onValueChange={(value) => {
                  setDadosPessoais({ estadoCivil: value })
                  // Limpa o campo de cônjuge se não for casado
                  if (value !== "casado") {
                    setDadosPessoais({ conjuge: "" })
                  }
                }}
              >
                <SelectTrigger className="h-11 bg-[#131929] border-[rgba(255,255,255,0.14)] text-foreground focus:border-primary focus:ring-1 focus:ring-primary/30">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
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
                className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                Regime de Bens
              </Label>
              <Select
                value={dadosPessoais.regime || "Comunhão Parcial de Bens"}
                onValueChange={(value) => setDadosPessoais({ regime: value })}
              >
                <SelectTrigger className="h-11 bg-[#131929] border-[rgba(255,255,255,0.14)] text-foreground focus:border-primary focus:ring-1 focus:ring-primary/30">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
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
                className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
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
                  className="h-11 bg-[#131929] border-[rgba(255,255,255,0.14)] text-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
                >
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Feminino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Número de Filhos */}
            <div className="space-y-2">
              <Label 
                htmlFor="filhos" 
                className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
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
                className="h-11 bg-[#131929] border-[rgba(255,255,255,0.14)] text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filhos — detalhes (dinâmico) */}
      {(dadosPessoais.filhos?.length ?? 0) > 0 && (
        <div className="space-y-4">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Filhos
          </span>
          <div className="rounded-xl bg-card border border-border p-6 space-y-6">
            {(dadosPessoais.filhos ?? []).map((filho, idx) => (
              <div key={idx} className="space-y-4">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Filho {idx + 1}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor={`filho-nome-${idx}`}
                      className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
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
                      className="h-11 bg-[#131929] border-[rgba(255,255,255,0.14)] text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor={`filho-nasc-${idx}`}
                      className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
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
                      className="h-11 bg-[#131929] border-[rgba(255,255,255,0.14)] text-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card 2 - Fluxo de Caixa Mensal */}
      <div className="space-y-4">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Fluxo de Caixa Mensal
        </span>
        <div className="rounded-xl bg-card border border-border p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Renda Mensal */}
            <div className="space-y-2">
              <Label 
                htmlFor="rendaMensal" 
                className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                Renda Mensal (R$)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  R$
                </span>
                <Input
                  id="rendaMensal"
                  value={formatCurrency(dadosPessoais.renda)}
                  onChange={(e) => setDadosPessoais({ renda: parseCurrency(e.target.value) })}
                  placeholder="0,00"
                  className="h-11 pl-10 bg-[#131929] border-[rgba(255,255,255,0.14)] text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>

            {/* Despesa Mensal */}
            <div className="space-y-2">
              <Label 
                htmlFor="despesaMensal" 
                className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                Despesa Mensal (R$)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  R$
                </span>
                <Input
                  id="despesaMensal"
                  value={formatCurrency(dadosPessoais.despesa)}
                  onChange={(e) => setDadosPessoais({ despesa: parseCurrency(e.target.value) })}
                  placeholder="0,00"
                  className="h-11 pl-10 bg-[#131929] border-[rgba(255,255,255,0.14)] text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Barra de Capacidade de Poupança */}
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
            <p className="text-emerald-400 text-sm font-medium">
              Capacidade de poupança mensal:{" "}
              <span className="font-semibold">
                {moeda === "USD" ? "US$" : "R$"}{" "}
                {capacidadePoupanca.valor.toLocaleString(moeda === "USD" ? "en-US" : "pt-BR", { minimumFractionDigits: 2 })}
              </span>{" "}
              <span className="text-emerald-400/80">
                ({capacidadePoupanca.percentual.toFixed(0)}% da renda)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex justify-start pt-4">
        <Button 
          onClick={() => onNavigate("patrimonio")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          Próximo
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
