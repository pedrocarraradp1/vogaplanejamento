export function soDigitos(v: string): string {
  return (v ?? "").replace(/\D/g, "")
}

export function formatarCpf(v: string): string {
  const d = soDigitos(v).slice(0, 11)
  return d.replace(/^(\d{0,3})(\d{0,3})(\d{0,3})(\d{0,2})$/, (_m, a, b, c, e) =>
    [a, b, c].filter(Boolean).join(".") + (e ? `-${e}` : ""),
  )
}

export function formatarCnpj(v: string): string {
  const d = soDigitos(v).slice(0, 14)
  return d.replace(
    /^(\d{0,2})(\d{0,3})(\d{0,3})(\d{0,4})(\d{0,2})$/,
    (_m, a, b, c, e, f) => {
      let out = a
      if (b) out += `.${b}`
      if (c) out += `.${c}`
      if (e) out += `/${e}`
      if (f) out += `-${f}`
      return out
    },
  )
}

function dv(digitos: number[], pesos: number[]): number {
  const soma = digitos.reduce((s, n, i) => s + n * pesos[i], 0)
  const rest = soma % 11
  return rest < 2 ? 0 : 11 - rest
}

export function validarCpf(v: string): boolean {
  const d = soDigitos(v)
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false
  const nums = d.split("").map(Number)
  const dv1 = dv(nums.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2])
  const dv2 = dv(nums.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  return nums[9] === dv1 && nums[10] === dv2
}

export function validarCnpj(v: string): boolean {
  const d = soDigitos(v)
  if (d.length !== 14) return false
  if (/^(\d)\1{13}$/.test(d)) return false
  const nums = d.split("").map(Number)
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const dv1 = dv(nums.slice(0, 12), p1)
  const dv2 = dv(nums.slice(0, 13), p2)
  return nums[12] === dv1 && nums[13] === dv2
}

export function formatarCep(v: string): string {
  const d = soDigitos(v).slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}
