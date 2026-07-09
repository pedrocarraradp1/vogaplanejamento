"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputMoeda } from "@/components/ui/input-moeda"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  criarEntradaCapital,
  totalEntradasCapitaisValorHoje,
  type EntradaCapital,
} from "@/lib/entradas-capitais"

interface ListaEntradasCapitaisProps {
  entradas: EntradaCapital[]
  onChange: (entradas: EntradaCapital[]) => void
  formatarMoedaCompleta: (v: number) => string
}

export function ListaEntradasCapitais({
  entradas,
  onChange,
  formatarMoedaCompleta,
}: ListaEntradasCapitaisProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<EntradaCapital | null>(null)
  const [form, setForm] = useState<EntradaCapital>(() => criarEntradaCapital())

  const total = useMemo(() => totalEntradasCapitaisValorHoje(entradas), [entradas])

  const abrirNova = () => {
    setEditing(null)
    setForm(criarEntradaCapital())
    setModalOpen(true)
  }

  const abrirEditar = (entrada: EntradaCapital) => {
    setEditing(entrada)
    setForm({ ...entrada })
    setModalOpen(true)
  }

  const salvar = () => {
    const descricao = form.descricao.trim() || "Entrada"
    const valor = Math.max(0, Number(form.valor) || 0)
    const idade = Math.max(0, Number(form.idade) || 0)
    if (valor <= 0 || idade <= 0) return

    const next = editing
      ? entradas.map((e) => (e.id === editing.id ? { ...form, descricao, valor, idade } : e))
      : [...entradas, { ...form, descricao, valor, idade }]

    onChange(next)
    setModalOpen(false)
  }

  const remover = (id: string) => {
    onChange(entradas.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-4">
      {entradas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhuma entrada cadastrada. Use &quot;+ Adicionar entrada&quot; para incluir herança, bônus ou venda de bem.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-secondary/40">
          {entradas.map((entrada) => (
            <li
              key={entrada.id}
              className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{entrada.descricao}</p>
                <p className="text-xs text-muted-foreground">aos {entrada.idade} anos</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {formatarMoedaCompleta(entrada.valor)}
              </span>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => abrirEditar(entrada)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => remover(entrada.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" className="w-full border-dashed" onClick={abrirNova}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar entrada
      </Button>

      {entradas.length > 0 ? (
        <div className="flex items-center justify-between border-t border-border/50 pt-3">
          <span className="text-sm font-medium text-foreground">Total de entradas (hoje)</span>
          <span className="text-base font-bold tabular-nums text-primary">{formatarMoedaCompleta(total)}</span>
        </div>
      ) : null}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="form-card rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editing ? "Editar entrada" : "Nova entrada"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Evento pontual de capital — valor em poder de compra de hoje, corrigido pela inflação no ano previsto.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="field-label">Descrição</Label>
              <Input
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Ex: Herança, Bônus, Venda de imóvel"
                className="form-card text-foreground focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="field-label">Valor (R$)</Label>
              <InputMoeda
                value={form.valor}
                onChange={(valor) => setForm((f) => ({ ...f, valor }))}
                placeholder="0,00"
                className="form-card text-foreground focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="field-label">Idade da entrada</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.idade || ""}
                onChange={(e) => setForm((f) => ({ ...f, idade: parseInt(e.target.value, 10) || 0 }))}
                placeholder="Ex: 45"
                className="form-card text-foreground focus:border-primary"
              />
              <p className="text-xs text-muted-foreground">
                Idade em que o valor será recebido e somado ao patrimônio na simulação.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={salvar}
              disabled={(Number(form.valor) || 0) <= 0 || (Number(form.idade) || 0) <= 0}
            >
              {editing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
