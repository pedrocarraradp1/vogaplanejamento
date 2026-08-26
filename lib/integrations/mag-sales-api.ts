interface MagSalesTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface QuotationProfile {
  insuredRelation?: string
  name?: string
  document?: string // CPF
  birthday?: string // YYYY-MM-DD
  occupation?: string // código CBO
  monthlyIncome?: number
  sex?: string
  state?: string // UF
  riskProfile?: string | null
  riskScore?: number
  position?: string
}

export interface QuotationProductDetails {
  paymentFrequency?: string
  yearsTermLifeInsurance?: number
  yearsPrivatePension?: number
  yearsDecreasingInsurance?: number
  yearsAntecipatingPayment?: number
  loanTermAgreement?: number
}

export interface QuotationCommercialConditions {
  comissionDiscount?: number
}

export interface QuotationRequest {
  profile: QuotationProfile
  productDetails: QuotationProductDetails
  commercialConditions: QuotationCommercialConditions
}

export interface QuotationCoverage {
  coverageId: string
  coverageType: string
  key: string
  referenceCapital?: number
  basePremium?: number
  minimumCapital: number
  maximumCapital: number
  mandatoryForms: unknown[]
  coverageDependencies: unknown[]
}

export interface QuotationProduct {
  productId: string
  referenceCapital?: number
  basePremium?: number
  coverages: QuotationCoverage[]
  productDependencies: unknown[]
}

export interface QuotationWarning {
  type: "blocker" | "information"
  message: string
}

export interface QuotationResponse {
  protocol: string
  expirationDate: string
  minimumPremium: number
  products: QuotationProduct[]
  warnings: QuotationWarning[]
  links: { rel: string; href: string }[]
}

const MAG_SALES_BASE_URL =
  process.env.MAG_SALES_API_BASE_URL ?? "https://magprodutofunctionv2hmg.azurewebsites.net/api"
const MAG_IDENTITY_TOKEN_URL =
  process.env.MAG_IDENTITY_TOKEN_URL ??
  "https://identidadehmg.mongeralaegon.com.br/connect/token"

let cachedToken: { value: string; expiresAt: number } | null = null

async function getMagSalesToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value
  }

  const clientId = process.env.MAG_SALES_CLIENT_ID
  const clientSecret = process.env.MAG_SALES_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      "MAG_SALES_CLIENT_ID / MAG_SALES_CLIENT_SECRET não configurados no ambiente (.env.local)",
    )
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "apiproduto",
  })

  const response = await fetch(MAG_IDENTITY_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(`Falha ao obter token MAG Sales: ${response.status} ${await response.text()}`)
  }

  const data = (await response.json()) as MagSalesTokenResponse
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }

  return cachedToken.value
}

export async function createQuotation(
  offerId: string,
  quotationRequest: QuotationRequest,
  capitalAccumulation?: boolean,
): Promise<QuotationResponse> {
  const token = await getMagSalesToken()

  const params = new URLSearchParams({ offerId })
  if (capitalAccumulation !== undefined) {
    params.set("capitalAccumulation", String(capitalAccumulation))
  }

  const response = await fetch(`${MAG_SALES_BASE_URL}/quotations?${params.toString()}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(quotationRequest),
  })

  if (!response.ok) {
    throw new Error(`Falha ao criar cotação MAG Sales: ${response.status} ${await response.text()}`)
  }

  return (await response.json()) as QuotationResponse
}

export async function getQuotationById(quotationId: string): Promise<QuotationResponse> {
  const token = await getMagSalesToken()

  const response = await fetch(`${MAG_SALES_BASE_URL}/quotations/${quotationId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Falha ao consultar cotação MAG Sales: ${response.status} ${await response.text()}`)
  }

  return (await response.json()) as QuotationResponse
}
