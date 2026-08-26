/**
 * Teste manual da MAG Sales API (fora do build).
 *
 *   node --env-file=.env.local --experimental-strip-types --import ./scripts/test-register.mjs ./scripts/test-mag-sales.ts
 *
 * Sem MAG_TEST_OFFER_ID real do produto 3109, a API deve falhar na oferta —
 * ainda assim valida autenticação (scope apiproduto) e o formato da chamada.
 */
import { createQuotation, getQuotationById } from "../lib/integrations/mag-sales-api"

async function main() {
  const offerId = process.env.MAG_TEST_OFFER_ID ?? "SUBSTITUIR_PELO_OFFER_ID_REAL"

  const quotationRequest = {
    profile: {
      insuredRelation: "titular",
      name: "TESTE VOGA WEALTH",
      document: "05238922760",
      birthday: "1980-05-08",
      occupation: "2251-20",
      monthlyIncome: 5000,
      sex: "masculino",
      state: "RJ",
      riskProfile: null,
      riskScore: 0,
      position: "Advogado",
    },
    productDetails: {
      paymentFrequency: "mensal",
      yearsTermLifeInsurance: 0,
      yearsPrivatePension: 0,
      yearsDecreasingInsurance: 0,
      yearsAntecipatingPayment: 0,
      loanTermAgreement: 0,
    },
    commercialConditions: {
      comissionDiscount: 0,
    },
  }

  console.log("Criando cotação... offerId=", offerId)
  const quotation = await createQuotation(offerId, quotationRequest)
  console.log("Resposta:", JSON.stringify(quotation, null, 2))

  if (quotation.warnings?.length) {
    console.log("\nWarnings retornados:")
    quotation.warnings.forEach((w) => console.log(`  [${w.type}] ${w.message}`))
  }

  console.log("\nConsultando pelo protocolo...")
  const fetched = await getQuotationById(quotation.protocol)
  console.log("Consulta confirma:", fetched.protocol === quotation.protocol ? "OK" : "DIVERGENTE")
}

main().catch((err) => {
  console.error("Erro no teste:", err)
  process.exit(1)
})
