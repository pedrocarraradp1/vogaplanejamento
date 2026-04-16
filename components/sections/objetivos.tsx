"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { Plus, X, ArrowLeft, ArrowRight, Pencil, Star } from "lucide-react"
import { usePlano, type Objetivo } from "@/lib/plano-context"

interface ObjetivosProps {
  onNavigate: (section: string) => void
}

export function Objetivos({ onNavigate }: ObjetivosProps) {
  const { state, setObjetivos } = usePlano()
  const { objetivos } = state

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [editingObjetivo, setEditingObjetivo] = useState<Objetivo | null>(null)
  const [form, setForm] = useState<Omit<Objetivo, "id">>({
    descricao: "",
    prazo: 0,
    valor: 0,
    recorrente: false,
    aCada: 0,
  })

  const formatCurrency = (value: number) => {
    if (!value) return ""
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
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
      prazo: 0,
      valor: 0,
      recorrente: false,
      aCada: 0,
    })
    setModalOpen(true)
  }

  const openEditObjetivo = (objetivo: Objetivo) => {
    setEditingObjetivo(objetivo)
    setForm({
      descricao: objetivo.descricao,
      prazo: objetivo.prazo,
      valor: objetivo.valor,
      recorrente: objetivo.recorrente,
      aCada: objetivo.aCada,
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
      aCada: isRecorrente ? form.aCada || 1 : 0,
    })
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
                  Em {objetivo.prazo} {objetivo.prazo === 1 ? "ano" : "anos"}
                  {objetivo.recorrente && objetivo.aCada > 0 && (
                    <> · Recorrente a cada {objetivo.aCada} {objetivo.aCada === 1 ? "ano" : "anos"}</>
                  )}
                </p>
              </div>
              
              {/* Valor */}
              <p className="text-emerald-400 font-semibold text-right shrink-0">
                {formatCurrency(objetivo.valor)}
              </p>
              
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
              <Input
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Compra de Imóvel, Viagem, Veículo..."
                className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Prazo (anos)
                </label>
                <Input
                  type="number"
                  value={form.prazo || ""}
                  onChange={(e) => setForm({ ...form, prazo: parseInt(e.target.value) || 0 })}
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
                value={form.aCada || ""}
                onChange={(e) => setForm({ ...form, aCada: parseInt(e.target.value) || 0 })}
                placeholder="1"
                className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
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
