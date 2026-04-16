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
import { Plus, X, ArrowLeft, ArrowRight, Pencil } from "lucide-react"
import { usePlano, type Ativo, type Passivo } from "@/lib/plano-context"

interface PatrimonioProps {
  onNavigate: (section: string) => void
}

export function Patrimonio({ onNavigate }: PatrimonioProps) {
  const { state, setAtivos, setPassivos, setPremissas } = usePlano()
  const { ativos, passivos } = state

  // Modal Ativo
  const [ativoModalOpen, setAtivoModalOpen] = useState(false)
  const [editingAtivo, setEditingAtivo] = useState<Ativo | null>(null)
  const [ativoForm, setAtivoForm] = useState<Omit<Ativo, "id">>({
    tipo: "",
    descricao: "",
    instituicao: "",
    valor: 0,
  })

  // Modal Passivo
  const [passivoModalOpen, setPassivoModalOpen] = useState(false)
  const [editingPassivo, setEditingPassivo] = useState<Passivo | null>(null)
  const [passivoForm, setPassivoForm] = useState<Omit<Passivo, "id">>({
    tipo: "",
    modelo: "",
    descricao: "",
    valor: 0,
    taxa: 0,
    prazo: 0,
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const parseCurrency = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, "")
    return parseInt(cleaned, 10) || 0
  }

  // Ativo handlers
  const openAddAtivo = () => {
    setEditingAtivo(null)
    setAtivoForm({ tipo: "", descricao: "", instituicao: "", valor: 0 })
    setAtivoModalOpen(true)
  }

  const openEditAtivo = (ativo: Ativo) => {
    setEditingAtivo(ativo)
    setAtivoForm({
      tipo: ativo.tipo,
      descricao: ativo.descricao,
      instituicao: ativo.instituicao,
      valor: ativo.valor,
    })
    setAtivoModalOpen(true)
  }

  const saveAtivo = () => {
    if (editingAtivo) {
      setAtivos(
        ativos.map((a) =>
          a.id === editingAtivo.id ? { ...a, ...ativoForm } : a
        )
      )
    } else {
      setAtivos([
        ...ativos,
        { id: Date.now().toString(), ...ativoForm },
      ])
    }
    setAtivoModalOpen(false)
  }

  const removeAtivo = (id: string) => {
    setAtivos(ativos.filter((a) => a.id !== id))
  }

  // Passivo handlers
  const openAddPassivo = () => {
    setEditingPassivo(null)
    setPassivoForm({ tipo: "", modelo: "", descricao: "", valor: 0, taxa: 0, prazo: 0 })
    setPassivoModalOpen(true)
  }

  const openEditPassivo = (passivo: Passivo) => {
    setEditingPassivo(passivo)
    setPassivoForm({
      tipo: passivo.tipo,
      modelo: passivo.modelo || "",
      descricao: passivo.descricao,
      valor: passivo.valor,
      taxa: passivo.taxa,
      prazo: passivo.prazo,
    })
    setPassivoModalOpen(true)
  }

  const savePassivo = () => {
    if (editingPassivo) {
      setPassivos(
        passivos.map((p) =>
          p.id === editingPassivo.id ? { ...p, ...passivoForm } : p
        )
      )
    } else {
      setPassivos([
        ...passivos,
        { id: Date.now().toString(), ...passivoForm },
      ])
    }
    setPassivoModalOpen(false)
  }

  const removePassivo = (id: string) => {
    setPassivos(passivos.filter((p) => p.id !== id))
  }

  const totalAtivos = ativos.reduce((sum, a) => sum + (a.valor || 0), 0)
  const totalPassivos = passivos.reduce((sum, p) => sum + (p.valor || 0), 0)
  const patrimonioLiquido = totalAtivos - totalPassivos

  const handleNext = () => {
    setPremissas({ saldoInicial: patrimonioLiquido })
    onNavigate("objetivos")
  }

  const getInicialTipo = (tipo: string) => {
    if (!tipo) return "?"
    return tipo.charAt(0).toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Cadastro</p>
        <h1 className="text-2xl font-semibold">
          <span className="text-primary">Patrimônio</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Levantamento completo de ativos e passivos do cliente
        </p>
      </div>

      {/* Card Ativos */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Ativos
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={openAddAtivo}
            className="border border-dashed border-muted-foreground/50 text-muted-foreground hover:text-foreground hover:border-foreground"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Ativo
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {ativos.map((ativo) => (
            <div
              key={ativo.id}
              className="flex items-center gap-4 p-4 bg-[#0D1220] rounded-xl border border-white/5"
            >
              {/* Ícone inicial */}
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                {getInicialTipo(ativo.tipo)}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">{ativo.descricao || "Sem descrição"}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {ativo.tipo}{ativo.instituicao && ` · ${ativo.instituicao}`}
                </p>
              </div>
              
              {/* Valor */}
              <p className="text-primary font-semibold text-right shrink-0">
                {formatCurrency(ativo.valor)}
              </p>
              
              {/* Ações */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditAtivo(ativo)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAtivo(ativo.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {ativos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum ativo cadastrado. Clique em &quot;+ Adicionar Ativo&quot; para começar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Card Passivos */}
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Passivos
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={openAddPassivo}
            className="border border-dashed border-muted-foreground/50 text-muted-foreground hover:text-foreground hover:border-foreground"
          >
            <Plus className="w-4 h-4 mr-1" />
            Adicionar Passivo
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {passivos.map((passivo) => (
            <div
              key={passivo.id}
              className="flex items-center gap-4 p-4 bg-[#0D1220] rounded-xl border border-white/5"
            >
              {/* Ícone inicial */}
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400 font-semibold text-sm shrink-0">
                {getInicialTipo(passivo.tipo)}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-medium truncate">{passivo.descricao || "Sem descrição"}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {passivo.tipo}{passivo.modelo && ` · ${passivo.modelo}`}
                </p>
              </div>
              
              {/* Valor */}
              <p className="text-red-400 font-semibold text-right shrink-0">
                {formatCurrency(passivo.valor)}
              </p>
              
              {/* Ações */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEditPassivo(passivo)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePassivo(passivo.id)}
                  className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-400/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          {passivos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum passivo cadastrado. Clique em &quot;+ Adicionar Passivo&quot; para começar.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Resumo Patrimonial */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-[#131929] rounded-xl border border-white/5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Ativos</p>
          <p className="text-xl font-semibold text-foreground">{formatCurrency(totalAtivos)}</p>
        </div>
        <div className="p-4 bg-[#131929] rounded-xl border border-white/5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Passivos</p>
          <p className="text-xl font-semibold text-foreground">{formatCurrency(totalPassivos)}</p>
        </div>
        <div className="p-4 bg-[#131929] rounded-xl border border-white/5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Patrimônio Líquido</p>
          <p className="text-xl font-semibold text-primary">{formatCurrency(patrimonioLiquido)}</p>
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          onClick={() => onNavigate("dados-pessoais")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button 
          onClick={handleNext}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Próximo
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>

      {/* Modal Ativo */}
      <Dialog open={ativoModalOpen} onOpenChange={setAtivoModalOpen}>
        <DialogContent className="bg-[#131929] border-white/[0.18] rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingAtivo ? "Editar Ativo" : "Adicionar Ativo"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Cadastre um novo ativo no patrimônio
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Tipo
              </label>
              <Select
                value={ativoForm.tipo}
                onValueChange={(value) => setAtivoForm({ ...ativoForm, tipo: value })}
              >
                <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="bg-[#131929] border-white/10">
                  <SelectItem value="Líquido">Líquido</SelectItem>
                  <SelectItem value="Imobilizado">Imobilizado</SelectItem>
                  <SelectItem value="Participação Societária">Participação Societária</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Descrição
              </label>
              <Input
                value={ativoForm.descricao}
                onChange={(e) => setAtivoForm({ ...ativoForm, descricao: e.target.value })}
                placeholder="Ex: CDB Banco X, Apartamento Y..."
                className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Valor (R$)
              </label>
              <Input
                value={ativoForm.valor ? formatCurrency(ativoForm.valor) : ""}
                onChange={(e) => setAtivoForm({ ...ativoForm, valor: parseCurrency(e.target.value) })}
                placeholder="0,00"
                className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Instituição / Localização
              </label>
              <Input
                value={ativoForm.instituicao}
                onChange={(e) => setAtivoForm({ ...ativoForm, instituicao: e.target.value })}
                placeholder="Ex: BTG Pactual, Brasília-DF..."
                className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setAtivoModalOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveAtivo}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {editingAtivo ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Passivo */}
      <Dialog open={passivoModalOpen} onOpenChange={setPassivoModalOpen}>
        <DialogContent className="bg-[#131929] border-white/[0.18] rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingPassivo ? "Editar Passivo" : "Adicionar Passivo"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Cadastre uma dívida ou financiamento
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Tipo
                </label>
                <Select
                  value={passivoForm.tipo}
                  onValueChange={(value) => setPassivoForm({ ...passivoForm, tipo: value })}
                >
                  <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
<SelectContent className="bg-[#131929] border-white/10">
                    <SelectItem value="Financiamento Imóvel">Financiamento Imóvel</SelectItem>
                    <SelectItem value="Financiamento Veículo">Financiamento Veículo</SelectItem>
                    <SelectItem value="Empréstimo Pessoal">Empréstimo Pessoal</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Modelo de Dívida
                </label>
                <Select
                  value={passivoForm.modelo}
                  onValueChange={(value) => setPassivoForm({ ...passivoForm, modelo: value })}
                >
                  <SelectTrigger className="bg-[#0D1220] border-white/10 text-foreground">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#131929] border-white/10">
                    <SelectItem value="SAC">SAC</SelectItem>
                    <SelectItem value="PRICE">PRICE</SelectItem>
                    <SelectItem value="AMERICANA">AMERICANA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Descrição
              </label>
              <Input
                value={passivoForm.descricao}
                onChange={(e) => setPassivoForm({ ...passivoForm, descricao: e.target.value })}
                placeholder="Ex: Financiamento Apt Centro..."
                className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                Saldo Devedor (R$)
              </label>
              <Input
                value={passivoForm.valor ? formatCurrency(passivoForm.valor) : ""}
                onChange={(e) => setPassivoForm({ ...passivoForm, valor: parseCurrency(e.target.value) })}
                placeholder="0,00"
                className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Taxa de Juros (%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  value={passivoForm.taxa || ""}
                  onChange={(e) => setPassivoForm({ ...passivoForm, taxa: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
                  Prazo (meses)
                </label>
                <Input
                  type="number"
                  value={passivoForm.prazo || ""}
                  onChange={(e) => setPassivoForm({ ...passivoForm, prazo: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="bg-[#0D1220] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setPassivoModalOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={savePassivo}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {editingPassivo ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
