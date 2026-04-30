"use client"

import { useMemo, useState } from "react"
import { createClient } from "@/lib/supabase"
import { usePlano } from "@/lib/plano-context"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function patrimonioTotalFromState(state: any): number {
  const ativos = Array.isArray(state?.ativos) ? state.ativos : []
  const passivos = Array.isArray(state?.passivos) ? state.passivos : []
  const totalAtivos = ativos.reduce((s: number, a: any) => s + (Number(a?.valor) || 0), 0)
  const totalPassivos = passivos.reduce((s: number, p: any) => s + (Number(p?.valor) || 0), 0)
  return totalAtivos - totalPassivos
}

export function SalvarSimulacaoModal() {
  const { state, simulacaoMeta, loadState } = usePlano()
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [nomeSimulacao, setNomeSimulacao] = useState(simulacaoMeta.nomeSimulacao ?? "")
  const [nomeCliente, setNomeCliente] = useState(state.dadosPessoais.nome ?? "")
  const [profissaoCliente, setProfissaoCliente] = useState(state.dadosPessoais.profissao ?? "")

  const isUpdate = Boolean(simulacaoMeta.simulacaoId)

  const patrimonioTotal = useMemo(() => patrimonioTotalFromState(state), [state])

  async function onConfirm() {
    const ns = nomeSimulacao.trim()
    const nc = nomeCliente.trim()
    const pc = profissaoCliente.trim()
    if (!ns || !nc) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Informe o nome da simulação e o nome do cliente.",
      })
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: auth, error: authErr } = await supabase.auth.getUser()
      if (authErr || !auth?.user) throw new Error("Sessão inválida. Faça login novamente.")

      // 1) Garante cliente (cria se não existir; se já existe no meta, atualiza nome/profissão)
      let clienteId = simulacaoMeta.clienteId
      if (clienteId) {
        const { error } = await supabase
          .from("clientes")
          .update({ nome: nc, profissao: pc, updated_at: new Date().toISOString() })
          .eq("id", clienteId)
        if (error) throw new Error(error.message)
      } else {
        const { data, error } = await supabase
          .from("clientes")
          .insert({ nome: nc, profissao: pc, dados: null })
          .select("id")
          .single()
        if (error) throw new Error(error.message)
        clienteId = data?.id ?? null
      }

      if (!clienteId) throw new Error("Não foi possível determinar o cliente.")

      // 2) Salva simulação
      if (isUpdate && simulacaoMeta.simulacaoId) {
        const { error } = await supabase
          .from("simulacoes")
          .update({
            cliente_id: clienteId,
            nome_simulacao: ns,
            dados: state,
            updated_at: new Date().toISOString(),
          })
          .eq("id", simulacaoMeta.simulacaoId)
        if (error) throw new Error(error.message)

        toast({ title: "Simulação atualizada", description: `“${ns}” salva com sucesso.` })
        loadState(state, { clienteId, nomeSimulacao: ns })
      } else {
        const { data, error } = await supabase
          .from("simulacoes")
          .insert({
            cliente_id: clienteId,
            nome_simulacao: ns,
            dados: state,
          })
          .select("id")
          .single()
        if (error) throw new Error(error.message)

        toast({
          title: "Simulação salva",
          description: `“${ns}” salva com sucesso. Patrimônio: R$ ${new Intl.NumberFormat("pt-BR").format(patrimonioTotal)}`,
        })
        loadState(state, { simulacaoId: data?.id ?? null, clienteId, nomeSimulacao: ns })
      }

      setOpen(false)
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: e instanceof Error ? e.message : "Erro desconhecido.",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground h-9">
          {isUpdate ? "Atualizar Simulação" : "Salvar Simulação"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0D1220] border border-[rgba(255,255,255,0.08)] text-foreground">
        <DialogHeader>
          <DialogTitle>{isUpdate ? "Atualizar simulação" : "Salvar simulação"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Salva o estado atual do planejamento no Supabase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground tracking-wide">Nome da simulação</Label>
            <Input
              value={nomeSimulacao}
              onChange={(e) => setNomeSimulacao(e.target.value)}
              placeholder="Ex: Planejamento 2026"
              className="bg-[#131929] border-white/10 text-foreground focus:border-primary"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Nome do cliente</Label>
              <Input
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Ex: João Silva"
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase text-muted-foreground tracking-wide">Profissão</Label>
              <Input
                value={profissaoCliente}
                onChange={(e) => setProfissaoCliente(e.target.value)}
                placeholder="Ex: Médico"
                className="bg-[#131929] border-white/10 text-foreground focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={onConfirm} disabled={saving}>
              {saving ? "Salvando..." : isUpdate ? "Atualizar" : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

