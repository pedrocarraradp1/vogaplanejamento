import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  calcularPremioCobertura,
  calcularPremiosDaSimulacao,
} from "./premio-cobertura.ts"

describe("calcularPremioCobertura", () => {
  it("aplica custoFixo + (capital/capitalBase)*premioBase", () => {
    assert.equal(
      calcularPremioCobertura({
        capitalDesejado: 1_000_000,
        capitalBase: 1000,
        premioBase: 0.5,
        custoFixo: 10,
      }),
      510,
    )
  })

  it("trata capitalBase zero como só custoFixo", () => {
    assert.equal(
      calcularPremioCobertura({
        capitalDesejado: 1_000_000,
        capitalBase: 0,
        premioBase: 0.5,
        custoFixo: 25,
      }),
      25,
    )
  })
})

describe("calcularPremiosDaSimulacao", () => {
  it("soma coberturas do produto alvo e valida ticketMinimo", () => {
    const simulacaoJson = {
      Valor: {
        simulacoes: [
          {
            ticketMinimo: 200,
            produtos: [
              {
                idProduto: 3109,
                descricao: "WHOLE LIFE INTEGRAL",
                coberturas: [
                  {
                    id: 1,
                    descricao: "MORTE + ADT + DPI",
                    capitalBase: 1000,
                    premioBase: 0.536657558724,
                    custoFixo: 0,
                  },
                ],
              },
              {
                idProduto: 1501,
                descricao: "MORTE POR ACIDENTE",
                coberturas: [
                  {
                    id: 6,
                    descricao: "MORTE POR ACIDENTE",
                    capitalBase: 1000,
                    premioBase: 0.133839996654,
                    custoFixo: 0,
                  },
                ],
              },
            ],
          },
        ],
      },
    }
    const modeloJson = { Valor: { ticketMinimo: 200 } }
    const r = calcularPremiosDaSimulacao({
      simulacaoJson,
      capitalDesejado: 1_000_000,
      idProduto: 3109,
      modeloJson,
    })
    assert.equal(r.coberturas.length, 1)
    assert.ok(Math.abs(r.premioMensal - 536.657558724) < 1e-9)
    assert.equal(r.abaixoDoTicketMinimo, false)
    assert.equal(r.ticketMinimo, 200)
  })

  it("avisa quando total fica abaixo do ticketMinimo", () => {
    const r = calcularPremiosDaSimulacao({
      simulacaoJson: {
        Valor: {
          simulacoes: [
            {
              produtos: [
                {
                  idProduto: 2111,
                  descricao: "WHOLE LIFE 2019",
                  coberturas: [
                    {
                      id: 1,
                      descricao: "MORTE",
                      capitalBase: 1000,
                      premioBase: 0.1,
                      custoFixo: 0,
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
      capitalDesejado: 1000,
      idProduto: 2111,
      modeloJson: { Valor: { ticketMinimo: 200 } },
    })
    assert.equal(r.premioMensal, 0.1)
    assert.equal(r.abaixoDoTicketMinimo, true)
    assert.ok(r.avisoTicketMinimo)
  })
})
