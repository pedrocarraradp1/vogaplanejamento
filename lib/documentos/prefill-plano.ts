import type { PlanoState } from "@/lib/plano-context"
import { normalizeAtivoTipo, labelEmpresaParticipacao } from "@/lib/patrimonio-utils"
import { formatarCnpj, formatarCpf } from "./validacao"
import type { CampoTemplate } from "./parse-template"

const ESTADO_CIVIL: Record<string, string> = {
  casado: "casado(a)",
  solteiro: "solteiro(a)",
  divorciado: "divorciado(a)",
  viuvo: "viúvo(a)",
}

export function empresasDoPlano(state: PlanoState): string {
  return state.ativos
    .filter((a) => normalizeAtivoTipo(a.tipo, a.descricao) === "participacao_societaria")
    .map((a) => labelEmpresaParticipacao(a.empresa))
    .filter(Boolean)
    .join("; ")
}

export function enderecoDoPlano(state: PlanoState): string {
  const dp = state.dadosPessoais
  const partes = [dp.cidadeResidencia, dp.estadoResidencia || dp.uf].filter(Boolean)
  return partes.join(" / ")
}

export function valorOrigemPlano(origem: string | undefined, state: PlanoState): string {
  if (!origem) return ""
  const dp = state.dadosPessoais
  switch (origem) {
    case "cliente.nome":
      return dp.nome ?? ""
    case "cliente.cpf":
      return dp.cpf ? formatarCpf(dp.cpf) : ""
    case "cliente.estadoCivil":
      return ESTADO_CIVIL[dp.estadoCivil] ?? dp.estadoCivil ?? ""
    case "cliente.conjuge":
      return dp.conjuge ?? ""
    case "cliente.endereco":
      return enderecoDoPlano(state)
    case "cliente.cidade":
      return dp.cidadeResidencia ?? ""
    case "cliente.uf":
      return (dp.uf || dp.estadoResidencia || "").toUpperCase()
    case "cliente.empresas":
      return empresasDoPlano(state)
    default:
      return ""
  }
}

export function preencherCamposTemplate(
  campos: CampoTemplate[],
  state: PlanoState,
  salvos?: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const c of campos) {
    const salvo = salvos?.[c.chave]
    if (salvo != null && salvo !== "") {
      out[c.chave] = salvo
      continue
    }
    out[c.chave] = valorOrigemPlano(c.origem, state)
    if (c.tipo === "cpf" && out[c.chave]) out[c.chave] = formatarCpf(out[c.chave])
    if (c.tipo === "cnpj" && out[c.chave]) out[c.chave] = formatarCnpj(out[c.chave])
  }
  return out
}

export const LABEL_CAMPO_CLAUSULA: Record<string, string> = {
  nome: "Nome",
  cpf: "CPF",
  nacionalidade: "Nacionalidade",
  estado_civil: "Estado civil",
  conjuge: "Cônjuge",
  endereco: "Endereço",
  razao_social: "Razão social",
  cnpj: "CNPJ",
  sede: "Sede",
  percentual: "Percentual (%)",
  valor: "Valor",
  donatario: "Donatário / contemplado",
  donatario_cpf: "CPF do donatário",
  testador: "Testador",
  herdeiro: "Herdeiro / substituto",
  bem: "Bem objeto",
  data: "Data",
  uf: "UF",
  administrador: "Administrador / testamenteiro",
  prazo: "Prazo",
  quorum: "Quórum",
}
