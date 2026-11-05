import type { PerfilConsultoria, TriagemConsultoria } from "@/lib/sucessorio/consultoria"

export type OpcaoPergunta = { value: string; label: string }

export type DefPergunta = {
  id: keyof TriagemConsultoria
  titulo: string
  porQue: string
  opcoes: OpcaoPergunta[]
  visivel: (perfil: PerfilConsultoria) => boolean
}

const SN: OpcaoPergunta[] = [
  { value: "Sim", label: "Sim" },
  { value: "Não", label: "Não" },
]

export const PERGUNTAS_TRIAGEM: DefPergunta[] = [
  {
    id: "testamento",
    titulo: "Já existe um testamento?",
    porQue: "Sem testamento a partilha segue só a lei — e o inventário pode ficar mais lento.",
    opcoes: SN,
    visivel: () => true,
  },
  {
    id: "holdingExistente",
    titulo: "Já existe holding patrimonial ou familiar?",
    porQue: "Se a estrutura já existe, o comparador muda: o custo de entrada já foi pago.",
    opcoes: SN,
    visivel: (p) => p.imoveisAlugados > 0 || p.participacoes > 0 || p.imoveis > 0,
  },
  {
    id: "doacoesJaRealizadas",
    titulo: "Já foram feitas doações em vida?",
    porQue: "Doações no mesmo período se agregam na base do ITCMD.",
    opcoes: SN,
    visivel: () => true,
  },
  {
    id: "usufruto",
    titulo: "Já há usufruto reservado sobre algum bem ou quota?",
    porQue: "Usufruto muda a base da doação e o controle da renda.",
    opcoes: SN,
    visivel: (p) => p.filhos.length > 0,
  },
  {
    id: "planejamentoRealizado",
    titulo: "Já houve algum planejamento sucessório formal?",
    porQue: "Evita repetir o que já está feito e aponta só as lacunas.",
    opcoes: [
      { value: "Sim", label: "Sim" },
      { value: "Em andamento", label: "Em andamento" },
      { value: "Não", label: "Não" },
    ],
    visivel: () => true,
  },
  {
    id: "bensNoExterior",
    titulo: "Há bens, contas ou ações no exterior?",
    porQue: "Patrimônio nos EUA tem estate tax próprio, com crédito mínimo para não residente.",
    opcoes: SN,
    visivel: (p) => p.euaUSD <= 0,
  },
  {
    id: "usoPGBL",
    titulo: "Há PGBL ou interesse em usar previdência na declaração?",
    porQue: "PGBL e VGBL se comportam de forma diferente no inventário.",
    opcoes: [
      { value: "Sim, uso atualmente", label: "Já uso" },
      { value: "Uso potencial", label: "Pode fazer sentido" },
      { value: "Não", label: "Não" },
    ],
    visivel: () => true,
  },
  {
    id: "preocupacaoInventario",
    titulo: "Qual o tamanho da preocupação com o inventário?",
    porQue: "Isso pesa na urgência do seguro de liquidez e do testamento.",
    opcoes: [
      { value: "Alta", label: "Alta" },
      { value: "Média", label: "Média" },
      { value: "Baixa", label: "Baixa" },
      { value: "Nenhuma", label: "Nenhuma" },
    ],
    visivel: () => true,
  },
  {
    id: "preocupacaoItcmd",
    titulo: "E a preocupação com o ITCMD?",
    porQue: "Quem subestima o imposto costuma descobrir o número só na abertura da sucessão.",
    opcoes: [
      { value: "Alta", label: "Alta" },
      { value: "Média", label: "Média" },
      { value: "Baixa", label: "Baixa" },
      { value: "Nenhuma", label: "Nenhuma" },
    ],
    visivel: () => true,
  },
  {
    id: "conflitoFamiliar",
    titulo: "Há risco de conflito entre herdeiros?",
    porQue: "Conflito empurra o inventário para a via litigiosa, mais cara e lenta.",
    opcoes: [
      { value: "true", label: "Sim, há risco" },
      { value: "false", label: "Não" },
    ],
    visivel: () => true,
  },
  {
    id: "herdeiroIncapaz",
    titulo: "Algum herdeiro é menor ou incapaz?",
    porQue: "Inventário extrajudicial fica inviável e a gestão do quinhão precisa de alvará.",
    opcoes: [
      { value: "true", label: "Sim" },
      { value: "false", label: "Não" },
    ],
    visivel: (p) => p.filhos.some((f) => f.menor) || p.filhos.some((f) => f.idade == null),
  },
  {
    id: "temAcordoSocios",
    titulo: "A empresa tem acordo de sócios ou cláusula de sucessão?",
    porQue: "Sem isso, herdeiros podem entrar no quadro ou cobrar haveres à vista.",
    opcoes: [
      { value: "true", label: "Sim" },
      { value: "false", label: "Não / não sei" },
    ],
    visivel: (p) => p.participacoes > 0,
  },
]

export function perguntasVisiveis(perfil: PerfilConsultoria): DefPergunta[] {
  return PERGUNTAS_TRIAGEM.filter((q) => q.visivel(perfil))
}

export function aplicarResposta(
  triagem: TriagemConsultoria,
  id: keyof TriagemConsultoria,
  value: string,
): TriagemConsultoria {
  if (value === "true" || value === "false") {
    return { ...triagem, [id]: value === "true" }
  }
  return { ...triagem, [id]: value }
}

export function valorPergunta(triagem: TriagemConsultoria, id: keyof TriagemConsultoria): string {
  const v = triagem[id]
  if (typeof v === "boolean") return v ? "true" : "false"
  return typeof v === "string" ? v : ""
}

export type LinhaLeitura = { id: string; positivo: boolean; texto: string }

export function leituraResposta(id: keyof TriagemConsultoria, value: string): LinhaLeitura | null {
  const sim = value === "Sim" || value === "true"
  const nao = value === "Não" || value === "false"
  const linha = (positivo: boolean, texto: string): LinhaLeitura => ({ id: String(id), positivo, texto })
  if (id === "testamento" && nao) return linha(true, "favorece testamento neste ciclo")
  if (id === "testamento" && sim) return linha(true, "testamento já reduz a incerteza da partilha")
  if (id === "holdingExistente" && nao) return linha(true, "favorece holding")
  if (id === "holdingExistente" && sim) return linha(false, "holding já existe — custo de entrada já pago")
  if (id === "doacoesJaRealizadas" && nao) return linha(true, "favorece doação com usufruto agora")
  if (id === "doacoesJaRealizadas" && sim) return linha(false, "doações anteriores entram na base do ITCMD")
  if (id === "usufruto" && nao) return linha(true, "favorece doação com usufruto")
  if (id === "usufruto" && sim) return linha(true, "usufruto já reserva renda")
  if (id === "planejamentoRealizado" && value === "Em andamento") {
    return linha(true, "há planejamento em curso a completar")
  }
  if (id === "planejamentoRealizado" && nao) return linha(true, "favorece começar o plano agora")
  if (id === "planejamentoRealizado" && sim) return linha(false, "há planejamento prévio a respeitar")
  if (id === "bensNoExterior" && sim) return linha(false, "pesa exposição internacional")
  if (id === "bensNoExterior" && nao) return linha(true, "mapa fica no Brasil")
  if (id === "conflitoFamiliar" && sim) return linha(false, "pesa contra a via extrajudicial")
  if (id === "conflitoFamiliar" && nao) return linha(true, "favorece inventário mais simples")
  if (id === "herdeiroIncapaz" && sim) return linha(false, "pesa: inventário judicial")
  if (id === "herdeiroIncapaz" && nao) return linha(true, "não trava a via extrajudicial")
  if (id === "temAcordoSocios" && nao) return linha(true, "favorece acordo de sócios")
  if (id === "temAcordoSocios" && sim) return linha(true, "acordo de sócios já cobre parte do risco")
  if (id === "preocupacaoInventario" || id === "preocupacaoItcmd") {
    const alta = value === "Alta" || value === "Média"
    return linha(!alta, alta ? "pesa urgência de liquidez e ITCMD" : "preocupação baixa neste ponto")
  }
  if (id === "usoPGBL") {
    return linha(value !== "Não", value === "Não" ? "previdência ainda não está no mapa" : "favorece previdência sucessória")
  }
  return null
}
