"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { usePlano, type QuestionarioSucessorio } from "@/lib/plano-context"
import {
  getSaldoDevedorPassivo,
  labelTipoAtivo,
  normalizeAtivoTipo,
} from "@/lib/patrimonio-utils"

type PrazoGrupo = "curto" | "medio" | "longo"

const PRAZO_GRUPOS: { id: PrazoGrupo; titulo: string }[] = [
  { id: "curto", titulo: "Curto prazo · até 3 anos" },
  { id: "medio", titulo: "Médio prazo · 3 a 10 anos" },
  { id: "longo", titulo: "Longo prazo · acima de 10 anos" },
]

function prazoGrupo(prazoAnos: number): PrazoGrupo {
  const p = Math.max(0, Number(prazoAnos) || 0)
  if (p <= 3) return "curto"
  if (p <= 10) return "medio"
  return "longo"
}

function fmtMoeda(value: number, moeda: "BRL" | "USD") {
  return new Intl.NumberFormat(moeda === "USD" ? "en-US" : "pt-BR", {
    style: "currency",
    currency: moeda === "USD" ? "USD" : "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function CampoLeitura({ label, value }: { label: string; value?: string | number | null }) {
  const texto =
    value == null || value === ""
      ? "—"
      : typeof value === "number"
        ? String(value)
        : String(value)
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap">{texto}</p>
    </div>
  )
}

const QUESTIONARIO_LABELS: { key: keyof QuestionarioSucessorio; label: string }[] = [
  { key: "modeloDeclaracaoIR", label: "Modelo de declaração de IR" },
  { key: "usoPGBL", label: "Uso atual ou potencial de PGBL" },
  { key: "bensNoExterior", label: "Bens no exterior" },
  { key: "planejamentoSucessorioRealizado", label: "Planejamento sucessório" },
  { key: "testamento", label: "Testamento" },
  { key: "holdingPatrimonialOuFamiliar", label: "Holding patrimonial ou familiar" },
  { key: "doacoesJaRealizadas", label: "Doações já realizadas" },
  { key: "usufruto", label: "Usufruto" },
  { key: "preocupacaoComInventario", label: "Preocupação com inventário" },
  { key: "preocupacaoComITCMD", label: "Preocupação com ITCMD" },
  { key: "observacoesSucessorio", label: "Observações" },
]

export function InfoClient() {
  const { state } = usePlano()
  const { dadosPessoais, ativos, passivos, objetivos, premissas, sucessao } = state
  const seguros = state.seguros ?? []
  const moeda = state.moeda ?? "BRL"
  const questionario = sucessao.questionario ?? {}

  const objetivosPorPrazo = useMemo(() => {
    const map: Record<PrazoGrupo, typeof objetivos> = {
      curto: [],
      medio: [],
      longo: [],
    }
    for (const o of objetivos) {
      map[prazoGrupo(o.prazoAnos)].push(o)
    }
    return map
  }, [objetivos])

  const estadoCivilLabel: Record<string, string> = {
    casado: "Casado(a)",
    solteiro: "Solteiro(a)",
    divorciado: "Divorciado(a)",
    viuvo: "Viúvo(a)",
  }

  return (
    <Card className="form-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium text-foreground">InfoClient</CardTitle>
        <p className="text-sm text-muted-foreground">
          Visão consolidada somente leitura — útil antes de reuniões e para impressão
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Informações pessoais */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
            Informações pessoais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CampoLeitura label="Nome" value={dadosPessoais.nome} />
            <CampoLeitura label="CPF" value={dadosPessoais.cpf} />
            <CampoLeitura label="Cônjuge" value={dadosPessoais.conjuge} />
            <CampoLeitura label="Profissão" value={dadosPessoais.profissao} />
            <CampoLeitura label="Nascimento" value={dadosPessoais.nascimento} />
            <CampoLeitura
              label="Estado civil"
              value={estadoCivilLabel[dadosPessoais.estadoCivil] ?? dadosPessoais.estadoCivil}
            />
            <CampoLeitura label="Regime de bens" value={dadosPessoais.regime} />
            <CampoLeitura
              label="Sexo"
              value={dadosPessoais.sexo === "F" ? "Feminino" : dadosPessoais.sexo === "M" ? "Masculino" : ""}
            />
            <CampoLeitura label="Nº de filhos" value={dadosPessoais.filhos?.length ?? 0} />
            <CampoLeitura label="Email" value={dadosPessoais.email} />
            <CampoLeitura label="Telefone" value={dadosPessoais.telefone} />
            <CampoLeitura label="Cidade" value={dadosPessoais.cidadeResidencia} />
            <CampoLeitura
              label="Estado"
              value={dadosPessoais.estadoResidencia || dadosPessoais.uf}
            />
            <CampoLeitura
              label="Nascimento do cônjuge"
              value={dadosPessoais.dataNascimentoConjuge}
            />
            <CampoLeitura label="Profissão do cônjuge" value={dadosPessoais.profissaoConjuge} />
            <div className="md:col-span-2">
              <CampoLeitura
                label="Dinâmica familiar"
                value={dadosPessoais.observacoesDinamicaFamiliar}
              />
            </div>
          </div>
          {(dadosPessoais.filhos?.length ?? 0) > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Filhos
              </p>
              <ul className="space-y-1">
                {(dadosPessoais.filhos ?? []).map((f, i) => (
                  <li key={i} className="text-sm text-foreground">
                    {f.nome || `Filho ${i + 1}`}
                    {f.dataNascimento ? ` · ${f.dataNascimento}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Balanço patrimonial */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
            Balanço patrimonial
          </h3>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Descrição</th>
                  <th className="px-3 py-2 font-medium text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {ativos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-muted-foreground">
                      Nenhum ativo cadastrado
                    </td>
                  </tr>
                ) : (
                  ativos.map((a) => (
                    <tr key={a.id} className="border-t border-border/60">
                      <td className="px-3 py-2 text-foreground">
                        {labelTipoAtivo(a.tipo, a.descricao)}
                        {normalizeAtivoTipo(a.tipo, a.descricao) === "previdencia" &&
                        (a.tipoPlanoPrevidencia || a.regimeTributarioPrevidencia)
                          ? ` (${[a.tipoPlanoPrevidencia, a.regimeTributarioPrevidencia]
                              .filter(Boolean)
                              .join(" · ")})`
                          : ""}
                      </td>
                      <td className="px-3 py-2 text-foreground">{a.descricao || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">
                        {fmtMoeda(Number(a.valor) || 0, moeda)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Passivo</th>
                  <th className="px-3 py-2 font-medium">Descrição</th>
                  <th className="px-3 py-2 font-medium text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {passivos.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-muted-foreground">
                      Nenhum passivo cadastrado
                    </td>
                  </tr>
                ) : (
                  passivos.map((p) => (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="px-3 py-2 text-foreground">{p.categoria || "—"}</td>
                      <td className="px-3 py-2 text-foreground">{p.descricao || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">
                        {fmtMoeda(getSaldoDevedorPassivo(p), moeda)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Objetivos */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
            Objetivos por prazo
          </h3>
          {objetivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum objetivo cadastrado.</p>
          ) : (
            <div className="space-y-4">
              {PRAZO_GRUPOS.map((g) => {
                const lista = objetivosPorPrazo[g.id]
                if (lista.length === 0) return null
                return (
                  <div key={g.id} className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {g.titulo}
                    </p>
                    <ul className="space-y-1.5">
                      {lista.map((o) => (
                        <li
                          key={o.id}
                          className="flex items-center justify-between gap-3 text-sm border border-border/50 rounded-lg px-3 py-2"
                        >
                          <span className="text-foreground truncate">
                            {o.descricao || "Objetivo"}
                            <span className="text-muted-foreground"> · {o.prazoAnos} anos</span>
                          </span>
                          <span className="tabular-nums font-medium shrink-0">
                            {fmtMoeda(Number(o.valor) || 0, moeda)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Aposentadoria */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
            Dados da aposentadoria
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CampoLeitura label="Idade de aposentadoria" value={premissas.idadeApos} />
            <CampoLeitura
              label="Retirada mensal desejada"
              value={fmtMoeda(Number(premissas.retiradaMensal) || 0, moeda)}
            />
            <CampoLeitura
              label="Renda mensal na aposentadoria"
              value={fmtMoeda(Number(premissas.rendaAposentadoria) || 0, moeda)}
            />
            <div className="md:col-span-3">
              <CampoLeitura label="Observações" value={premissas.observacaoAposentadoria} />
            </div>
          </div>
        </section>

        {/* Questionário sucessório */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
            Questionário do sucessório
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUESTIONARIO_LABELS.map(({ key, label }) => (
              <div key={key} className={key === "observacoesSucessorio" ? "md:col-span-2" : ""}>
                <CampoLeitura label={label} value={questionario[key]} />
              </div>
            ))}
          </div>
        </section>

        {/* Seguros */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2">
            Seguros
          </h3>
          {seguros.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum seguro cadastrado.</p>
          ) : (
            <ul className="space-y-2">
              {seguros.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-border/50 px-3 py-2.5 text-sm space-y-1"
                >
                  <p className="font-medium text-foreground">{s.tipoSeguro}</p>
                  <p className="text-muted-foreground">
                    Capital: {fmtMoeda(Number(s.capitalSegurado) || 0, moeda)}
                    {s.beneficiario ? ` · Beneficiário: ${s.beneficiario}` : ""}
                  </p>
                  {s.observacao ? (
                    <p className="text-muted-foreground whitespace-pre-wrap">{s.observacao}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  )
}
