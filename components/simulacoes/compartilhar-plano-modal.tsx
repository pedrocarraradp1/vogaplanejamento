"use client"

import { useCallback, useEffect, useState } from "react"
import { Copy, Link2, Loader2 } from "lucide-react"
import { usePlano } from "@/lib/plano-context"
import { tokenFromShareUrl } from "@/lib/links-compartilhados"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function CompartilharPlanoModal() {
  const { simulacaoMeta } = usePlano()
  const { toast } = useToast()
  const simulacaoId = simulacaoMeta.simulacaoId

  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [revoking, setRevoking] = useState(false)

  const carregarLink = useCallback(async () => {
    if (!simulacaoId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/cenarios/${simulacaoId}/compartilhar`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Não foi possível gerar o link.")
      setUrl(data.url)
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao compartilhar",
        description: e instanceof Error ? e.message : "Tente novamente.",
      })
      setUrl(null)
    } finally {
      setLoading(false)
    }
  }, [simulacaoId, toast])

  useEffect(() => {
    if (open && simulacaoId) {
      void carregarLink()
    }
    if (!open) {
      setUrl(null)
    }
  }, [open, simulacaoId, carregarLink])

  async function copiarUrl() {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: "Link copiado", description: "O link foi copiado para a área de transferência." })
    } catch {
      toast({
        variant: "destructive",
        title: "Não foi possível copiar",
        description: "Copie o link manualmente.",
      })
    }
  }

  async function revogarLink() {
    if (!url) return
    const token = tokenFromShareUrl(url)
    if (!token) return

    setRevoking(true)
    try {
      const res = await fetch(`/api/links-compartilhados/${token}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Não foi possível revogar o link.")
      setUrl(null)
      toast({
        title: "Link revogado",
        description: "O link não pode mais ser acessado.",
      })
      setOpen(false)
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Erro ao revogar",
        description: e instanceof Error ? e.message : "Tente novamente.",
      })
    } finally {
      setRevoking(false)
    }
  }

  if (!simulacaoId) {
    return (
      <Button type="button" variant="outline" size="sm" disabled title="Salve o cenário antes de compartilhar">
        <Link2 className="w-4 h-4 mr-2" />
        Compartilhar
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Link2 className="w-4 h-4 mr-2" />
          Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Compartilhar plano</DialogTitle>
          <DialogDescription>
            Gere um link somente leitura para o cliente visualizar o plano financeiro completo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando link…
            </div>
          ) : url ? (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Link de visualização</label>
                <div className="flex gap-2">
                  <Input value={url} readOnly className="font-mono text-xs" />
                  <Button type="button" variant="secondary" size="icon" onClick={copiarUrl} title="Copiar link">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Esse link fica ativo até você revogar manualmente. Qualquer alteração no cenário aparece
                automaticamente na próxima vez que o cliente abrir o link.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="w-full" disabled={revoking}>
                    {revoking ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Revogando…
                      </>
                    ) : (
                      "Revogar link"
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Revogar link de compartilhamento?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O cliente não poderá mais acessar este plano pelo link. Você poderá gerar um novo link
                      depois.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={revogarLink}>Revogar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <p className="text-sm text-destructive">Não foi possível carregar o link. Tente novamente.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
