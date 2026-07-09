import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { SnapshotCliente, BlocoDiagnostico, ItemAcao } from '@/types/diagnostico'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Aceita variações de nome da variável (Vercel/local) para evitar mismatch. */
function resolveOpenAiApiKey(): string | undefined {
  return (
    process.env.OPENAI_API_KEY ??
    process.env.OPEN_AI_API_KEY ??
    process.env.OPENAIAPIKEY
  )
}

const SYSTEM_PROMPT = `Você é um assistente de um Certified Financial Planner (CFP) analisando o cenário financeiro de um cliente de wealth management.

Com base nos dados fornecidos, gere um diagnóstico estruturado nas áreas: liquidez/reserva, endividamento, fluxo de caixa, objetivos, independência financeira e alocação de ativos — SOMENTE para as áreas presentes no JSON de entrada. Não invente dados nem opine sobre áreas ausentes do JSON.

Para cada área presente, dê um status ("Saudável", "Atenção" ou "Crítico") e um texto objetivo (2-4 frases) baseado nos números fornecidos, referenciando os valores reais.

Em seguida, gere uma lista inicial de 3 a 6 itens de plano de ação, cada um vinculado a uma área do diagnóstico, com: título curto, descrição (o porquê, referenciando o diagnóstico), responsável sugerido ("Cliente" ou "Advisor"), prazo sugerido (texto livre, ex: "30 dias"), e prioridade ("Alta", "Média" ou "Baixa").

Responda APENAS em JSON válido, sem texto fora do JSON, exatamente neste formato:
{
  "diagnostico": [{ "area": string, "status": "Saudável"|"Atenção"|"Crítico", "texto": string }],
  "planoDeAcao": [{ "titulo": string, "descricao": string, "origem": string, "responsavel": "Cliente"|"Advisor", "prazo": string, "prioridade": "Alta"|"Média"|"Baixa" }]
}`

export async function POST(req: Request) {
  try {
    const apiKey = resolveOpenAiApiKey()
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OPENAI_API_KEY não configurada' },
        { status: 500 },
      )
    }

    const openai = new OpenAI({ apiKey })

    const snapshot: SnapshotCliente = await req.json()

    if (!snapshot || Object.keys(snapshot).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado do cliente foi enviado.' }, { status: 400 })
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-5',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(snapshot) },
      ],
      response_format: { type: 'json_object' },
    })

    const raw = response.choices[0]?.message?.content
    if (!raw) throw new Error('Resposta vazia do modelo')

    const parsed = JSON.parse(raw) as {
      diagnostico: BlocoDiagnostico[]
      planoDeAcao: Omit<ItemAcao, 'id' | 'status'>[]
    }

    const planoDeAcao: ItemAcao[] = (parsed.planoDeAcao ?? []).map((item, i) => ({
      ...item,
      id: `acao-${Date.now()}-${i}`,
      status: 'A fazer',
    }))

    return NextResponse.json({ diagnostico: parsed.diagnostico ?? [], planoDeAcao })
  } catch (err) {
    console.error('Erro ao gerar diagnóstico:', err)
    return NextResponse.json(
      { error: 'Não foi possível gerar o diagnóstico agora. Tenta novamente em instantes.' },
      { status: 500 },
    )
  }
}
