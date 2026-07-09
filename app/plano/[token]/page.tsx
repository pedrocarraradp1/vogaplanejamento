import { buscarCenarioPorToken } from "@/lib/links-compartilhados"
import { LinkInvalidoOuRevogado } from "@/components/plano/link-invalido-ou-revogado"
import { PlanoPublicoPageClient } from "@/components/plano/plano-publico-page-client"

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function PlanoPublicoPage({ params }: PageProps) {
  const { token } = await params

  try {
    const cenario = await buscarCenarioPorToken(token)
    if (!cenario) {
      return <LinkInvalidoOuRevogado />
    }
    return <PlanoPublicoPageClient dados={cenario.dados} meta={cenario.meta} />
  } catch (err) {
    console.error("Erro ao carregar plano público:", err)
    return <LinkInvalidoOuRevogado />
  }
}
