import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { hidratarDiagnostico, hidratarSimulador } from "./tipos.ts"
import { visaoSucessorio } from "./visao.ts"

describe("hidratar sucessão", () => {
  it("cenário antigo sem diagnostico recebe 20 falses", () => {
    const d = hidratarDiagnostico(undefined)
    assert.equal(d.respostas.length, 20)
    assert.equal(d.respostas.some(Boolean), false)
  })

  it("simulador antigo ganha defaults", () => {
    const s = hidratarSimulador({})
    assert.equal(s.via, "extrajudicial")
    assert.equal(s.honorariosPct, 6)
  })
})

describe("visaoSucessorio", () => {
  it("calcula custo de inventário e reforma", () => {
    const v = visaoSucessorio({
      dadosPessoais: { uf: "SP", nome: "A" },
      ativos: [{ tipo: "imobilizado", descricao: "Casa", valor: 1_000_000, uf: "SP" }],
      sucessao: { simulador: { custoPlanejarVida: 10_000 } },
    })
    assert.ok(v.custoInv.total > 0)
    assert.ok(v.economiaPlanejar !== 0)
    assert.equal(v.diagnostico.sinais.length, 20)
  })
})
