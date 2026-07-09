import { describe, it, afterEach } from "node:test"
import assert from "node:assert/strict"
import { buildShareUrl, resolveShareAppBaseUrl } from "./links-compartilhados.ts"

describe("buildShareUrl", () => {
  const original = process.env.NEXT_PUBLIC_APP_URL

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_APP_URL
    else process.env.NEXT_PUBLIC_APP_URL = original
  })

  it("usa somente NEXT_PUBLIC_APP_URL", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://vogaplanejamento.vercel.app"
    assert.equal(
      buildShareUrl("abc123"),
      "https://vogaplanejamento.vercel.app/plano/abc123",
    )
  })

  it("remove barra final da base", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://vogaplanejamento.vercel.app/"
    assert.equal(
      buildShareUrl("abc123"),
      "https://vogaplanejamento.vercel.app/plano/abc123",
    )
  })

  it("falha se NEXT_PUBLIC_APP_URL ausente", () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    assert.equal(resolveShareAppBaseUrl(), null)
    assert.throws(() => buildShareUrl("abc123"), /NEXT_PUBLIC_APP_URL/)
  })
})
