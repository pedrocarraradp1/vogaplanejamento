import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { calcularProjecao } from "./engine.ts"
import {
  defaultProjecaoLivre,
  montarPremissasProjecaoLivre,
  projetarLivre,
  type ProjecaoLivreState,
} from "./projecao-livre.ts"

describe("Projeção Livre vs calcularProjecao", () => {
  const params: ProjecaoLivreState = {
    ...defaultProjecaoLivre,
    saldoInicial: 500_000,
    aporteMensal: 3_000,
    aporteExtraAnual: 12_000,
    prazo: 25,
    taxaRendimento: 10,
    inflacao: 4,
    idadeAtual: 40,
    idadeApos: 65,
    rendaMensalDesejada: 15_000,
    novaEntradaValor: 200_000,
    novaEntradaIdade: 50,
  }

  it("produz a mesma série que calcularProjecao com as mesmas premissas", () => {
    const premissas = montarPremissasProjecaoLivre(params)
    const direto = calcularProjecao(premissas, [], [])
    const livre = projetarLivre(params)

    assert.equal(livre.length, direto.length)
    assert.ok(livre.length > 0)

    for (let i = 0; i < direto.length; i++) {
      assert.equal(livre[i].t, direto[i].t)
      assert.equal(livre[i].idade, direto[i].idade)
      assert.equal(livre[i].saldoNominal, direto[i].saldoNominal)
      assert.equal(livre[i].saldoReal, direto[i].saldoReal)
      assert.equal(livre[i].rendaMensalReal, direto[i].rendaMensalReal)
      assert.equal(livre[i].isAposentado, direto[i].isAposentado)
    }
  })

  it("inclui aporte extra anual e nova entrada nas premissas isoladas", () => {
    const premissas = montarPremissasProjecaoLivre(params)
    assert.equal(premissas.saldoInicial, 500_000)
    assert.equal(premissas.aporteM, 3_000)
    const extras = (premissas.entradasCapitais ?? []).filter((e) => e.descricao === "Aporte extra anual")
    const nova = (premissas.entradasCapitais ?? []).filter((e) => e.descricao === "Nova entrada")
    assert.ok(extras.length > 0)
    assert.equal(nova.length, 1)
    assert.equal(nova[0].valor, 200_000)
    assert.equal(nova[0].idade, 50)
  })
})
