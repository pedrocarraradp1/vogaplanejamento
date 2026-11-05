import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cep = (searchParams.get("cep") ?? "").replace(/\D/g, "")
  if (cep.length !== 8) {
    return NextResponse.json({ error: "CEP inválido" }, { status: 400 })
  }
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { cache: "no-store" })
  if (!res.ok) {
    return NextResponse.json({ error: "Falha ao consultar o CEP" }, { status: 502 })
  }
  const data = (await res.json()) as {
    erro?: boolean
    logradouro?: string
    bairro?: string
    localidade?: string
    uf?: string
    cep?: string
  }
  if (data.erro) {
    return NextResponse.json({ error: "CEP não encontrado" }, { status: 404 })
  }
  return NextResponse.json({
    cep: data.cep,
    logradouro: data.logradouro ?? "",
    bairro: data.bairro ?? "",
    cidade: data.localidade ?? "",
    uf: data.uf ?? "",
  })
}
