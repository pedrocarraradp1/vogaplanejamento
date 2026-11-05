import { NextResponse } from "next/server"
import OpenAI from "openai"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import type { Parecer } from "@/lib/sucessorio/consultoria"
import { textoParecerFallback, validarTextoContraParecer } from "@/lib/sucessorio/texto-parecer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function resolveOpenAiApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_API_KEY ?? process.env.OPENAIAPIKEY
}

const SYSTEM_PROMPT = `Você é redator do planejador da Voga. Recebe um JSON chamado Parecer, já calculado.

Escreva um parecer em português, linguagem de cliente, 4 a 8 parágrafos, texto corrido (sem markdown, sem listas com hífen).

REGRAS ABSOLUTAS:
- Não invente, não arredonde de outro jeito, não crie e não altere nenhum número, alíquota, percentual, prazo numérico ou recomendação.
- Só pode citar valores que já existem no JSON (use os mesmos montantes).
- A estratégia número 1 deve ser exatamente recomendacao.ranqueadas[0].nome.
- Não sugira holding, doação, testamento, seguro ou previdência que não estejam em recomendacao.ranqueadas.
- Não use tabelas. Parágrafos separados por linha em branco.
- Feche lembrando que a execução exige advogado e contador.`

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
    }

    const body = (await req.json()) as { parecer?: Parecer }
    const parecer = body?.parecer
    if (!parecer || typeof parecer !== "object" || !parecer.simulacoes) {
      return NextResponse.json({ error: "Parecer estruturado ausente." }, { status: 400 })
    }

    const fallback = textoParecerFallback(parecer)
    const apiKey = resolveOpenAiApiKey()
    if (!apiKey) {
      return NextResponse.json({ texto: fallback, fonte: "template" })
    }

    try {
      const openai = new OpenAI({ apiKey })
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(parecer) },
        ],
      })
      const texto = response.choices[0]?.message?.content?.trim()
      if (!texto) {
        return NextResponse.json({ texto: fallback, fonte: "template" })
      }
      const check = validarTextoContraParecer(texto, parecer)
      if (!check.ok) {
        return NextResponse.json({ texto: fallback, fonte: "template", rejeitado: check.extras })
      }
      return NextResponse.json({ texto, fonte: "openai" })
    } catch (err) {
      console.error("consultoria parecer openai:", err)
      return NextResponse.json({ texto: fallback, fonte: "template" })
    }
  } catch (err) {
    console.error("consultoria parecer:", err)
    return NextResponse.json({ error: "Não foi possível redigir o parecer." }, { status: 500 })
  }
}
