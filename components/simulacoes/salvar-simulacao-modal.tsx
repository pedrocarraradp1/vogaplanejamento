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
  const moeda = state.moeda ?? "BRL"

  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [nomeCenario, setNomeCenario] = useState(simulacaoMeta.nomeCenario ?? "Cenário Principal")
  const [nomeCliente, setNomeCliente] = useState(state.dadosPessoais.nome ?? "")
  const [profissaoCliente, setProfissaoCliente] = useState(state.dadosPessoais.profissao ?? "")

  const isUpdate = Boolean(simulacaoMeta.simulacaoId)
  /** Só pede nome/profissão no modal na primeira gravação, sem cliente na URL/meta. */
  const pedirNomeClienteNoModal = !simulacaoMeta.simulacaoId && !simulacaoMeta.clienteId

  const patrimonioTotal = useMemo(() => patrimonioTotalFromState(state), [state])

  async function onConfirm() {
    const ncx = nomeCenario.trim()
    const temClienteVinculado = Boolean(simulacaoMeta.clienteId)
    const nomeFromState = String(state.dadosPessoais.nome ?? "").trim()
    const profFromState = String(state.dadosPessoais.profissao ?? "").trim()
    const nc = pedirNomeClienteNoModal ? nomeCliente.trim() : nomeFromState
    const pc = pedirNomeClienteNoModal ? profissaoCliente.trim() : profFromState
    if (!ncx) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Informe o nome do cenário.",
      })
      return
    }
    if (pedirNomeClienteNoModal && !nc) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Informe o nome do cenário e o nome do cliente.",
      })
      return
    }
    if (!pedirNomeClienteNoModal && !temClienteVinculado && !nc) {
      toast({
        variant: "destructive",
        title: "Nome do cliente ausente",
        description: "Preencha o nome em Dados Pessoais para vincular o cenário ao cadastro.",
      })
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: auth, error: authErr } = await supabase.auth.getUser()
      if (authErr || !auth?.user) throw new Error("Sessão inválida. Faça login novamente.")

      // Busca cliente existente por nome (case-insensitive). Se não existir, cria.
      let clienteId = simulacaoMeta.clienteId
      if (!clienteId) {
        const { data: existing, error: findErr } = await supabase
          .from("clientes")
          .select("id")
          .ilike("nome", nc)
          .limit(1)
          .maybeSingle()
        if (findErr) throw new Error(findErr.message)
        if (existing?.id) {
          clienteId = existing.id
        } else {
          const { data: created, error: createErr } = await supabase
            .from("clientes")
            .insert({ nome: nc, profissao: pc })
            .select("id")
            .single()
          if (createErr) throw new Error(createErr.message)
          clienteId = created?.id ?? null
        }
      } else {
        // Mantém cadastro do cliente atualizado
        await supabase.from("clientes").update({ nome: nc, profissao: pc }).eq("id", clienteId)
      }

      const payloadState = {
        ...state,
        dadosPessoais: {
          ...state.dadosPessoais,
          ...(!temClienteVinculado ? { nome: nc, profissao: pc } : {}),
        },
      }

      // Salva simulação (sem depender da tabela `clientes`)
      if (isUpdate && simulacaoMeta.simulacaoId) {
        const { error } = await supabase
          .from("simulacoes")
          .update({
            nome_simulacao: ncx,
            nome_cenario: ncx,
            cliente_id: clienteId,
            dados: payloadState,
            updated_at: new Date().toISOString(),
          })
          .eq("id", simulacaoMeta.simulacaoId)
        if (error) throw new Error(error.message)

        toast({ title: "Cenário atualizado", description: `“${ncx}” salvo com sucesso.` })
        loadState(payloadState, { nomeSimulacao: ncx, nomeCenario: ncx, clienteId })
      } else {
        const { data, error } = await supabase
          .from("simulacoes")
          .insert({
            nome_simulacao: ncx,
            nome_cenario: ncx,
            cliente_id: clienteId,
            dados: payloadState,
          })
          .select("id")
          .single()
        if (error) throw new Error(error.message)

        toast({
          title: "Cenário salvo",
          description: `“${ncx}” salvo com sucesso. Patrimônio: ${new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
            style: "currency",
            currency: moeda === "USD" ? "USD" : "BRL",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(patrimonioTotal)}`,
        })
        loadState(payloadState, { simulacaoId: data?.id ?? null, nomeSimulacao: ncx, nomeCenario: ncx, clienteId })
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
          {isUpdate ? "Atualizar Cenário" : "Salvar Cenário"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#0D1220] border border-[rgba(255,255,255,0.08)] text-foreground">
        <DialogHeader>
          <DialogTitle>{isUpdate ? "Atualizar cenário" : "Salvar cenário"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Salva o estado atual do planejamento como cenário no Supabase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase text-muted-foreground tracking-wide">Nome do cenário</Label>
            <Input
              value={nomeCenario}
              onChange={(e) => setNomeCenario(e.target.value)}
              placeholder="Ex: Conservador, Agressivo, Aposentadoria aos 55"
              className="bg-[#131929] border-white/10 text-foreground focus:border-primary"
            />
          </div>

          {pedirNomeClienteNoModal && (
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
          )}

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

