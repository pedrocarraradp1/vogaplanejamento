"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, X, ArrowLeft, ArrowRight, Pencil, Star, StickyNote } from "lucide-react"
import { usePlano, type Objetivo } from "@/lib/plano-context"

interface ObjetivosProps {
  onNavigate: (section: string) => void
}

const OBJETIVOS_PREDEFINIDOS = [
  "Compra de Imóvel Residencial",
  "Compra de Imóvel para Investimento",
  "Compra de Veículo",
  "Viagem Internacional",
  "Viagem Nacional",
  "Educação dos Filhos",
  "Faculdade / Pós-graduação",
  "Casamento",
  "Reforma / Decoração",
  "Abertura de Empresa / Negócio",
  "Reserva de Emergência",
  "Independência Financeira",
  "Troca de Veículo",
] as const

export function Objetivos({ onNavigate }: ObjetivosProps) {
  const { state, setObjetivos } = usePlano()
  const { objetivos, premissas } = state
  const moeda = state.moeda ?? "BRL"
  const prazoTotal = Math.max(0, Number(premissas.prazo) || 0)

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingObjetivo, setEditingObjetivo] = useState<Objetivo | null>(null)
  const [form, setForm] = useState<Omit<Objetivo, "id">>({
    descricao: "",
    prazoAnos: 0,
    valor: 0,
    recorrente: false,
    frequenciaAnos: 0,
    duracaoTipo: "total",
    duracaoAnos: 0,
    observacoes: "",
  })

  const formatCurrency = (value: number) => {
    if (!value) return ""
    return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
      style: "currency",
      currency: moeda === "USD" ? "USD" : "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const parseCurrency = (value: string) => {
    const numbers = value.replace(/\D/g, "")
    return parseInt(numbers, 10) || 0
  }

  const openAddObjetivo = () => {
    setEditingObjetivo(null)
    setForm({
      descricao: "",
      prazoAnos: 0,
      valor: 0,
      recorrente: false,
      frequenciaAnos: 0,
      duracaoTipo: "total",
      duracaoAnos: 0,
      observacoes: "",
    })
    setModalOpen(true)
  }

  const openEditObjetivo = (objetivo: Objetivo) => {
    setEditingObjetivo(objetivo)
    setForm({
      descricao: objetivo.descricao,
      prazoAnos: objetivo.prazoAnos,
      valor: objetivo.valor,
      recorrente: objetivo.recorrente,
      frequenciaAnos: objetivo.frequenciaAnos,
      duracaoTipo: objetivo.duracaoTipo ?? "total",
      duracaoAnos: objetivo.duracaoTipo === "personalizado" ? (objetivo.duracaoAnos || 1) : 0,
      observacoes: objetivo.observacoes ?? "",
    })
    setModalOpen(true)
  }

  const saveObjetivo = () => {
    if (editingObjetivo) {
      setObjetivos(
        objetivos.map((o) =>
          o.id === editingObjetivo.id ? { ...o, ...form } : o
        )
      )
    } else {
      setObjetivos([
        ...objetivos,
        { id: Date.now().toString(), ...form },
      ])
    }
    setModalOpen(false)
  }

  const removeObjetivo = (id: string) => {
    setObjetivos(objetivos.filter((o) => o.id !== id))
  }

  const handleRecorrenteChange = (value: string) => {
    const isRecorrente = value === "sim"
    setForm({
      ...form,
      recorrente: isRecorrente,
      frequenciaAnos: isRecorrente ? form.frequenciaAnos || 1 : 0,
      duracaoTipo: isRecorrente ? (form.duracaoTipo ?? "total") : "total",
      duracaoAnos: isRecorrente
        ? (form.duracaoTipo === "personalizado" ? (form.duracaoAnos || 1) : 0)
        : 0,
    })
  }

  const totalEstimadoObjetivo = (o: Objetivo) => {
    const prazoAnos = Math.max(0, Number(o.prazoAnos) || 0)
    const valor = Math.max(0, Number(o.valor) || 0)
    if (valor === 0) return 0

    // Se começa depois do fim da simulação, não impacta
    if (prazoAnos > prazoTotal) return 0

    if (!o.recorrente) return valor

    const freq = Math.max(0, Number(o.frequenciaAnos) || 0)
    if (freq === 0) return 0

    const duracaoTipo = o.duracaoTipo ?? "total"
    const duracaoAnos = Math.max(0, Number(o.duracaoAnos) || 0)
    const anoFimExclusive =
      duracaoTipo === "total"
        ? prazoTotal + 1
        : prazoAnos + duracaoAnos

    const fim = Math.min(prazoTotal + 1, anoFimExclusive)
    if (fim <= prazoAnos) return 0

    let count = 0
    for (let t = prazoAnos; t < fim; t += freq) count++
    return count * valor
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground mb-1">Cadastro</p>
        <h1 className="text-2xl font-semibold text-foreground">
          Objetivos <span className="text-primary">Financeiros</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Metas de vida e grandes despesas planejadas pelo cliente
        </p>
      </div>

      {/* Card Metas e Objetivos */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Metas e Objetivos
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={openAddObjetivo}
            className="border border-dashed border-muted-foreground/50 text-muted-foreground hover:text-foreground hover:border-foreground"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Objetivo
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {objetivos.map((objetivo) => (
            <div
              key={objetivo.id}
              className="flex items-center gap-4 p-4 bg-[#0D1220] rounded-xl border border-white/5"
            >
              {/* Ícone estrela */}
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Star className="w-5 h-5" />
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">{objetivo.descricao || "Sem descrição"}</p>
                <p className="text-sm text-muted-foreground">
                  Em {objetivo.prazoAnos} {objetivo.prazoAnos === 1 ? "ano" : "anos"}
                  {objetivo.recorrente && objetivo.frequenciaAnos > 0 && (
                    <>
                      {" "}
                      · Recorrente · A cada {objetivo.frequenciaAnos} {objetivo.frequenciaAnos === 1 ? "ano" : "anos"}
                      {objetivo.duracaoTipo === "personalizado" && (
                        <> · Dura {objetivo.duracaoAnos} {objetivo.duracaoAnos === 1 ? "ano" : "anos"}</>
                      )}
                      {" "}
                      · Total estimado: {formatCurrency(totalEstimadoObjetivo(objetivo))}
                    </>
                  )}
                </p>
              </div>
              
              {/* Valor */}
              <p className="text-emerald-400 font-semibold text-right shrink-0">
                {formatCurrency(objetivo.valor)}
              </p>

              {/* Nota (quando preenchido) */}
              {!!(objetivo.observacoes ?? "").trim() && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5"
                      aria-label="Ver observações"
                    >
                      <StickyNote className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent sideOffset={8} className="max-w-[320px] whitespace-pre-wrap">
                    {(objetivo.observacoes ?? "").trim()}
                  </TooltipContent>
                </Tooltip>
              )}
              
              {/* Ações */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditObjetivo(objetivo)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeObjetivo(objetivo.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {objetivos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum objetivo cadastrado. Clique em &quot;+ Adicionar Objetivo&quot; para começar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Botões de navegação */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => onNavigate("patrimonio")}
          className="border-border text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button 
          onClick={() => onNavigate("projecao")}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Próximo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Modal Objetivo */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-[#131929] border-white/[0.18] rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingObjetivo ? "Editar Objetivo" : "Adicionar Objetivo"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Cadastre uma meta ou grande despesa planejada
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Descrição
              </label>
              {(() => {
                const descricaoAtual = (form.descricao ?? "").trim()
                const isPredefinido = (OBJETIVOS_PREDEFINIDOS as readonly string[]).includes(descricaoAtual)
                const selectValue = isPredefinido ? descricaoAtual : "Outros"
                const otherValue = isPredefinido ? "" : descricaoAtual

                return (
                  <div className="space-y-2">
                    <Select
                      value={selectValue}
                      onValueChange={(value) => {
                        if (value === "Outros") {
                          setForm({ ...form, descricao: isPredefinido ? "" : descricaoAtual })
                          return
                        }
                        setForm({ ...form, descricao: value })
                      }}
                    >
                      <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#131929] border-white/10">
                        {OBJETIVOS_PREDEFINIDOS.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                        <SelectItem value="Outros">Outros</SelectItem>
                      </SelectContent>
                    </Select>

                    {selectValue === "Outros" && (
                      <Input
                        value={otherValue}
                        onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                        placeholder="Descreva o objetivo..."
                        className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
                      />
                    )}
                  </div>
                )
              })()}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Prazo (anos)
                </label>
                <Input
                  type="number"
                  value={form.prazoAnos || ""}
                  onChange={(e) => setForm({ ...form, prazoAnos: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Valor Estimado (R$)
                </label>
                <Input
                  value={form.valor ? formatCurrency(form.valor) : ""}
                  onChange={(e) => setForm({ ...form, valor: parseCurrency(e.target.value) })}
                  placeholder="0,00"
                  className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Recorrente?
              </label>
              <Select
                value={form.recorrente ? "sim" : "nao"}
                onValueChange={handleRecorrenteChange}
              >
                <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#131929] border-white/10">
                  <SelectItem value="nao">Não — acontece uma vez</SelectItem>
                  <SelectItem value="sim">Sim — repete periodicamente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campo "Repetir a cada" com animação */}
            <div
              className={`space-y-2 transition-all duration-300 ease-in-out ${
                form.recorrente
                  ? "opacity-100 max-h-24 translate-y-0"
                  : "opacity-0 max-h-0 -translate-y-2 overflow-hidden"
              }`}
            >
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Repetir a cada (anos)
              </label>
              <Input
                type="number"
                value={form.frequenciaAnos || ""}
                onChange={(e) => setForm({ ...form, frequenciaAnos: parseInt(e.target.value) || 0 })}
                placeholder="1"
                className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Campos de duração (somente recorrente) */}
            <div
              className={`space-y-4 transition-all duration-300 ease-in-out ${
                form.recorrente
                  ? "opacity-100 max-h-96 translate-y-0"
                  : "opacity-0 max-h-0 -translate-y-2 overflow-hidden"
              }`}
            >
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Duração
                </label>
                <Select
                  value={form.duracaoTipo}
                  onValueChange={(v) => {
                    const duracaoTipo = (v === "personalizado" ? "personalizado" : "total") as "total" | "personalizado"
                    setForm((prev) => ({
                      ...prev,
                      duracaoTipo,
                      duracaoAnos: duracaoTipo === "personalizado" ? (prev.duracaoAnos || 1) : 0,
                    }))
                  }}
                >
                  <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131929] border-white/10">
                    <SelectItem value="total">Todo o período</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div
                className={`space-y-2 transition-all duration-300 ease-in-out ${
                  form.recorrente && form.duracaoTipo === "personalizado"
                    ? "opacity-100 max-h-24 translate-y-0"
                    : "opacity-0 max-h-0 -translate-y-2 overflow-hidden"
                }`}
              >
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Por quantos anos?
                </label>
                <Input
                  type="number"
                  value={form.duracaoAnos || ""}
                  onChange={(e) => setForm({ ...form, duracaoAnos: parseInt(e.target.value) || 0 })}
                  placeholder="Ex: 4"
                  className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="space-y-2 pt-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Observações
              </label>
              <Textarea
                rows={3}
                value={form.observacoes ?? ""}
                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                placeholder="Descreva detalhes do objetivo, premissas, prioridade..."
                className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground resize-y"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setModalOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveObjetivo}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {editingObjetivo ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
