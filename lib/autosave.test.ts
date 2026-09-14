import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  draftStorageKey,
  nextRetryDelayMs,
  shouldAutosave,
  snapshotHash,
  stableStringify,
} from "@/lib/autosave"

describe("stableStringify", () => {
  it("ignora ordem de chaves", () => {
    assert.equal(stableStringify({ b: 1, a: 2 }), stableStringify({ a: 2, b: 1 }))
    assert.equal(
      stableStringify({ n: { y: 2, x: 1 } }),
      stableStringify({ n: { x: 1, y: 2 } }),
    )
  })

  it("diferencia valores", () => {
    assert.notEqual(stableStringify({ a: 1 }), stableStringify({ a: 2 }))
    assert.notEqual(stableStringify([1, 2]), stableStringify([2, 1]))
  })
})

describe("snapshotHash", () => {
  it("é igual para objetos equivalentes e diferente para valores distintos", () => {
    assert.equal(snapshotHash({ z: true, a: 1 }), snapshotHash({ a: 1, z: true }))
    assert.notEqual(snapshotHash({ a: 1 }), snapshotHash({ a: 2 }))
  })
})

describe("shouldAutosave", () => {
  const base = {
    enabled: true,
    readOnly: false,
    simulacaoId: "abc",
    dirty: true,
    inFlight: false,
    online: true,
  }

  it("grava só com enabled, id, dirty, online e sem voo/readOnly", () => {
    assert.equal(shouldAutosave(base), true)
    assert.equal(shouldAutosave({ ...base, enabled: false }), false)
    assert.equal(shouldAutosave({ ...base, readOnly: true }), false)
    assert.equal(shouldAutosave({ ...base, simulacaoId: null }), false)
    assert.equal(shouldAutosave({ ...base, dirty: false }), false)
    assert.equal(shouldAutosave({ ...base, inFlight: true }), false)
    assert.equal(shouldAutosave({ ...base, online: false }), false)
  })
})

describe("nextRetryDelayMs", () => {
  it("2s, 5s, 15s e depois para", () => {
    assert.equal(nextRetryDelayMs(0), 2000)
    assert.equal(nextRetryDelayMs(1), 5000)
    assert.equal(nextRetryDelayMs(2), 15000)
    assert.equal(nextRetryDelayMs(3), null)
    assert.equal(nextRetryDelayMs(-1), null)
  })
})

describe("draftStorageKey", () => {
  it("usa o cliente ou o sufixo novo", () => {
    assert.equal(draftStorageKey("u1", "c1"), "voga:rascunho:u1:c1")
    assert.equal(draftStorageKey("u1", null), "voga:rascunho:u1:novo")
  })
})
