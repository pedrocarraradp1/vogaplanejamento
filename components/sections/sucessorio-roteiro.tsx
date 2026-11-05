"use client"

import { useMemo, useState } from "react"
import { Copy, Printer } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePlano } from "@/lib/plano-context"
import {
  ROTEIROS,
  TEMA_LABEL,
  TIPOS_ROTEIRO,
  TIPO_ROTEIRO_LABEL,
  agruparPorTema,
  progressoRoteiro,
  textoPendencias,
  type CategoriaRoteiro,
  type DefinicaoRoteiro,
  type ItemRoteiro,
  type TipoRoteiro,
} from "@/lib/sucessorio/roteiros"

function BarraProgresso({
  feitos,
  total,
  label,
  unidade = "concluídos",
}: {
  feitos: number
  total: number
  label: string
  unidade?: string
}) {
  const pct = total > 0 ? Math.round((feitos / total) * 100) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {feitos} de {total} {unidade}
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function ListaCategoria({
  titulo,
  itens,
  concluidos,
  statusFeito,
  statusPendente,
  locked,
  onToggle,
}: {
  titulo: string
  itens: ItemRoteiro[]
  concluidos: Set<string>
  statusFeito: string
  statusPendente: string
  locked: boolean
  onToggle: (id: string, feito: boolean) => void
}) {
  const grupos = agruparPorTema(itens)
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
      {grupos.map((grupo) => (
        <div key={grupo.tema} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {TEMA_LABEL[grupo.tema]}
          </p>
          <ul className="space-y-1.5">
            {grupo.itens.map((item) => {
              const feito = concluidos.has(item.id)
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-lg border border-border px-3 py-2"
                >
                  <Checkbox
                    id={item.id}
                    checked={feito}
                    disabled={locked}
                    onCheckedChange={(v) => onToggle(item.id, v === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor={item.id} className="flex-1 text-sm text-foreground cursor-pointer">
                    {item.titulo}
                  </label>
                  <Badge variant={feito ? "secondary" : "outline"} className="text-[10px] uppercase">
                    {feito ? statusFeito : statusPendente}
                  </Badge>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function PendenciasFormatadas({
  def,
  concluidos,
}: {
  def: DefinicaoRoteiro
  concluidos: Set<string>
}) {
  const blocos: { titulo: string; categoria: CategoriaRoteiro; lista: ItemRoteiro[] }[] = [
    { titulo: "Documentos a pedir", categoria: "documentos", lista: def.documentos },
    { titulo: "Etapas", categoria: "etapas", lista: def.etapas },
    { titulo: "Conferências", categoria: "conferencias", lista: def.conferencias },
  ]
  const visiveis = blocos
    .map((b) => ({ ...b, pendentes: b.lista.filter((i) => !concluidos.has(i.id)) }))
    .filter((b) => b.pendentes.length > 0)

  if (visiveis.length === 0) {
    return <p className="text-sm text-muted-foreground">Não há pendências neste roteiro.</p>
  }

  return (
    <div className="space-y-4 text-sm">
      {visiveis.map((bloco) => (
        <div key={bloco.categoria} className="space-y-2 print:break-inside-avoid">
          <p className="font-semibold text-foreground">{bloco.titulo}</p>
          {agruparPorTema(bloco.pendentes).map((grupo) => (
            <div key={grupo.tema}>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {TEMA_LABEL[grupo.tema]}
              </p>
              <ul className="list-disc pl-5 space-y-0.5">
                {grupo.itens.map((item) => (
                  <li key={item.id}>{item.titulo}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function SucessorioRoteiro({ locked }: { locked: boolean }) {
  const { state, setSucessao } = usePlano()
  const [tipo, setTipo] = useState<TipoRoteiro>("holding_patrimonial")
  const [pendenciasAbertas, setPendenciasAbertas] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const def = ROTEIROS[tipo]
  const concluidosArr = state.sucessao.roteiros?.[tipo]?.concluidos ?? []
  const concluidos = useMemo(() => new Set(concluidosArr), [concluidosArr])
  const progresso = useMemo(() => progressoRoteiro(def, concluidos), [def, concluidos])

  const persistir = (ids: string[]) => {
    if (locked) return
    setSucessao({
      roteiros: {
        ...(state.sucessao.roteiros ?? {}),
        [tipo]: { concluidos: ids },
      },
    })
  }

  const toggle = (id: string, feito: boolean) => {
    const next = new Set(concluidos)
    if (feito) next.add(id)
    else next.delete(id)
    persistir([...next])
  }

  const texto = textoPendencias(def, concluidos)

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="form-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground">
            Roteiro de execução
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2 max-w-md">
            <Label className="field-label">Tipo de trabalho</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoRoteiro)}>
              <SelectTrigger className="form-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_ROTEIRO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TIPO_ROTEIRO_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <BarraProgresso
              feitos={progresso.total.feitos}
              total={progresso.total.total}
              label="Geral"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <BarraProgresso
                feitos={progresso.documentos.feitos}
                total={progresso.documentos.total}
                label="Documentos"
                unidade="recebidos"
              />
              <BarraProgresso
                feitos={progresso.etapas.feitos}
                total={progresso.etapas.total}
                label="Etapas"
              />
              <BarraProgresso
                feitos={progresso.conferencias.feitos}
                total={progresso.conferencias.total}
                label="Conferências"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => persistir([])}
              disabled={locked || concluidosArr.length === 0}
            >
              Desmarcar tudo
            </Button>
            <Button type="button" size="sm" onClick={() => setPendenciasAbertas(true)}>
              Gerar lista de pendências
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="form-card">
        <CardContent className="pt-6 space-y-8">
          <ListaCategoria
            titulo="Documentos a pedir ao cliente"
            itens={def.documentos}
            concluidos={concluidos}
            statusFeito="Recebido"
            statusPendente="Pendente"
            locked={locked}
            onToggle={toggle}
          />
          <ListaCategoria
            titulo="Etapas"
            itens={def.etapas}
            concluidos={concluidos}
            statusFeito="Concluído"
            statusPendente="Pendente"
            locked={locked}
            onToggle={toggle}
          />
          <ListaCategoria
            titulo="Conferências"
            itens={def.conferencias}
            concluidos={concluidos}
            statusFeito="Concluído"
            statusPendente="Pendente"
            locked={locked}
            onToggle={toggle}
          />
        </CardContent>
      </Card>

      <Dialog open={pendenciasAbertas} onOpenChange={setPendenciasAbertas}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto roteiro-pendencias-print">
          <DialogHeader>
            <DialogTitle>{def.label} — pendências</DialogTitle>
            <DialogDescription>
              Somente itens ainda pendentes, para copiar ou imprimir.
            </DialogDescription>
          </DialogHeader>
          <PendenciasFormatadas def={def} concluidos={concluidos} />
          <DialogFooter className="no-print">
            <Button type="button" variant="outline" onClick={() => void copiar()}>
              <Copy className="h-4 w-4 mr-2" />
              {copiado ? "Copiado" : "Copiar"}
            </Button>
            <Button type="button" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
