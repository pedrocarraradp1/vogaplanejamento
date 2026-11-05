import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { gerarParecer } from "./consultoria.ts"
import {
  textoParecerFallback,
  validarTextoContraParecer,
} from "./texto-parecer.ts"

describe("texto do parecer", () => {
  const parecer = gerarParecer(
    {
      dadosPessoais: {
        nome: "Cliente Teste",
        nascimento: "1975-03-10",
        estadoCivil: "casado",
        regime: "Comunhão Parcial de Bens",
        uf: "SP",
        renda: 20_000,
        filhos: [{ nome: "Ana", dataNascimento: "2002-01-01" }],
      },
      ativos: [
        {
          id: "imo",
          tipo: "imobilizado",
          descricao: "Imóvel Investimento",
          valor: 2_000_000,
          aluguelMensal: 8_000,
          uf: "SP",
        },
        { id: "cx", tipo: "ativo_liquido", descricao: "Caixa", valor: 100_000, localizacao: "nacional" },
      ],
      passivos: [],
      seguros: [],
    },
    { testamento: "Não", holdingExistente: "Não", preocupacaoInventario: "Alta" },
    { agora: new Date("2026-11-05T12:00:00-03:00") },
  )

  it("fallback só cita números que existem no Parecer", () => {
    const texto = textoParecerFallback(parecer)
    const check = validarTextoContraParecer(texto, parecer)
    assert.deepEqual(check.extras, [])
    assert.equal(check.ok, true)
    assert.match(texto, /advogado e contador/)
    const top = parecer.recomendacao.ranqueadas[0]
    if (top) assert.ok(texto.includes(top.nome))
  })

  it("rejeita número inventado no texto", () => {
    const check = validarTextoContraParecer(
      "A economia seria de R$ 9.999.999 e a alíquota de 17,77%.",
      parecer,
    )
    assert.equal(check.ok, false)
    assert.ok(check.extras.length > 0)
  })
})
