"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Copy, FileDown, Plus, Check } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { InputMoeda } from "@/components/ui/input-moeda"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePlano } from "@/lib/plano-context"
import { usePlanoReadOnly } from "@/lib/plano-readonly-context"
import {
  CLAUSULAS,
  INSTRUMENTO_LABEL,
  camposDasClausulas,
  montarMinutaClausulas,
  type InstrumentoClausula,
} from "@/lib/documentos/clausulas"
import { preencherTexto } from "@/lib/documentos/preencher"
import { valorPorExtenso } from "@/lib/documentos/extenso"
import {
  formatarCep,
  formatarCnpj,
  formatarCpf,
  soDigitos,
  validarCnpj,
  validarCpf,
} from "@/lib/documentos/validacao"
import {
  LABEL_CAMPO_CLAUSULA,
  preencherCamposTemplate,
  valorOrigemPlano,
} from "@/lib/documentos/prefill-plano"
import type { CampoTemplate, DocumentoTemplate, TipoCampoTemplate } from "@/lib/documentos/parse-template"
import { baixarBlob } from "@/lib/documentos/download"

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
]

async function exportarArquivos(titulo: string, corpo: string, formato: "docx" | "pdf") {
  const { exportarDocx, exportarPdf } = await import("@/lib/documentos/exportar")
  const slug = titulo.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  if (formato === "docx") {
    const blob = await exportarDocx(titulo, corpo)
    baixarBlob(blob, `${slug || "minuta"}.docx`)
  } else {
    const blob = exportarPdf(titulo, corpo)
    baixarBlob(blob, `${slug || "minuta"}.pdf`)
  }
}

function CampoDoc({
  campo,
  value,
  locked,
  erro,
  onChange,
  onCep,
}: {
  campo: { chave: string; label: string; tipo: TipoCampoTemplate | "texto" }
  value: string
  locked: boolean
  erro?: string
  onChange: (chave: string, valor: string) => void
  onCep?: (chave: string, cep: string) => void
}) {
  const tipo = campo.tipo
  return (
    <div className="space-y-1.5">
      <Label className="field-label">{campo.label}</Label>
      {tipo === "textarea" ? (
        <Textarea
          value={value}
          disabled={locked}
          onChange={(e) => onChange(campo.chave, e.target.value)}
          rows={3}
          className="form-card"
        />
      ) : tipo === "moeda" ? (
        <InputMoeda
          value={Number(value) || 0}
          onChange={(v) => onChange(campo.chave, String(v))}
          moeda="BRL"
          className="form-card"
        />
      ) : tipo === "uf" ? (
        <Select value={value || undefined} onValueChange={(v) => onChange(campo.chave, v)} disabled={locked}>
          <SelectTrigger className="form-card">
            <SelectValue placeholder="UF" />
          </SelectTrigger>
          <SelectContent>
            {UFS.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={value}
          disabled={locked}
          type={tipo === "data" ? "date" : "text"}
          className="form-card"
          onChange={(e) => {
            let v = e.target.value
            if (tipo === "cpf") v = formatarCpf(v)
            if (tipo === "cnpj") v = formatarCnpj(v)
            if (tipo === "cep") v = formatarCep(v)
            onChange(campo.chave, v)
          }}
          onBlur={() => {
            if (tipo === "cep") onCep?.(campo.chave, value)
          }}
        />
      )}
      {erro ? <p className="text-xs text-destructive">{erro}</p> : null}
    </div>
  )
}

function MinutaPreview({
  titulo,
  corpo,
  locked,
}: {
  titulo: string
  corpo: string
  locked: boolean
}) {
  const [copiado, setCopiado] = useState(false)
  const copiar = async () => {
    await navigator.clipboard.writeText(`${titulo}\n\n${corpo}`)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }
  return (
    <Card className="form-card">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base font-medium">Minuta</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void copiar()}>
            <Copy className="h-4 w-4 mr-1" />
            {copiado ? "Copiado" : "Copiar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void exportarArquivos(titulo, corpo, "docx")}
          >
            <FileDown className="h-4 w-4 mr-1" />
            DOCX
          </Button>
          <Button type="button" size="sm" onClick={() => void exportarArquivos(titulo, corpo, "pdf")}>
            <FileDown className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap text-sm font-serif text-foreground leading-relaxed">
          {corpo || "Inclua cláusulas ou preencha o contrato para ver a minuta."}
        </pre>
      </CardContent>
    </Card>
  )
}

export function DocumentosSucessorios({ embedded = false }: { embedded?: boolean }) {
  const { state, setSucessao } = usePlano()
  const locked = usePlanoReadOnly()
  const docs = state.sucessao.documentos ?? {}
  const incluidas = docs.clausulasIncluidas ?? []
  const camposClausulas = docs.camposClausulas ?? {}

  const persistDocs = (patch: Partial<typeof docs>) => {
    if (locked) return
    setSucessao({
      documentos: {
        ...docs,
        ...patch,
      },
    })
  }

  useEffect(() => {
    if (locked) return
    const chaves = camposDasClausulas(incluidas.length ? incluidas : CLAUSULAS.map((c) => c.id))
    const next = { ...camposClausulas }
    let changed = false
    const seed: Record<string, string> = {
      nome: valorOrigemPlano("cliente.nome", state),
      cpf: valorOrigemPlano("cliente.cpf", state),
      estado_civil: valorOrigemPlano("cliente.estadoCivil", state),
      conjuge: valorOrigemPlano("cliente.conjuge", state),
      endereco: valorOrigemPlano("cliente.endereco", state),
      uf: valorOrigemPlano("cliente.uf", state),
      razao_social: valorOrigemPlano("cliente.empresas", state).split(";")[0]?.trim() ?? "",
    }
    for (const k of Object.keys(seed)) {
      if (chaves.includes(k) && !next[k] && seed[k]) {
        next[k] = seed[k]
        changed = true
      }
    }
    if (changed) persistDocs({ camposClausulas: next })
    // only seed once when empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleClausula = (id: string) => {
    if (locked) return
    const set = new Set(incluidas)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    persistDocs({ clausulasIncluidas: [...set] })
  }

  const setCampoClausula = (chave: string, valor: string) => {
    persistDocs({ camposClausulas: { ...camposClausulas, [chave]: valor } })
  }

  const camposUnicos = camposDasClausulas(incluidas)
  const minutaClausulas = montarMinutaClausulas(incluidas, camposClausulas)

  const [templates, setTemplates] = useState<DocumentoTemplate[]>([])
  const [templateId, setTemplateId] = useState<string>("")
  const template = templates.find((t) => t.id === templateId)

  useEffect(() => {
    fetch("/api/documentos/templates")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const lista = Array.isArray(data?.templates) ? (data.templates as DocumentoTemplate[]) : []
        setTemplates(lista)
        if (lista[0] && !templateId) setTemplateId(lista[0].id)
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const camposTpl = docs.templates?.[templateId] ?? {}

  const valoresTpl = useMemo(() => {
    if (!template) return {}
    return preencherCamposTemplate(template.campos, state, camposTpl)
  }, [template, state, camposTpl])

  const setCampoTpl = (chave: string, valor: string) => {
    if (!template) return
    const nextCampos = { ...valoresTpl, [chave]: valor }
    const def = template.campos.find((c) => c.chave === chave)
    if (def?.tipo === "moeda") {
      nextCampos[`${chave}_extenso`] = valorPorExtenso(Number(valor) || 0)
    }
    persistDocs({
      templates: {
        ...(docs.templates ?? {}),
        [templateId]: nextCampos,
      },
    })
  }

  const buscarCep = useCallback(
    async (chaveCep: string, cep: string) => {
      const d = soDigitos(cep)
      if (d.length !== 8) return
      const res = await fetch(`/api/cep?cep=${d}`)
      if (!res.ok) return
      const data = await res.json()
      const prefix = /cep$/i.test(chaveCep) && chaveCep.length > 3 ? chaveCep.slice(0, -3) : ""
      const map: Record<string, string> = {}
      const logKey = prefix ? `${prefix}Logradouro` : "logradouro"
      const bairroKey = prefix ? `${prefix}Bairro` : "bairro"
      const cidadeKey = prefix ? `${prefix}Cidade` : "cidade"
      const ufKey = prefix ? `${prefix}Uf` : "uf"
      map[logKey] = data.logradouro ?? ""
      map[bairroKey] = data.bairro ?? ""
      map[cidadeKey] = data.cidade ?? ""
      map[ufKey] = data.uf ?? ""
      const next = { ...valoresTpl, [chaveCep]: formatarCep(d), ...map }
      persistDocs({
        templates: { ...(docs.templates ?? {}), [templateId]: next },
      })
    },
    [docs.templates, persistDocs, templateId, valoresTpl],
  )

  const errosTpl: Record<string, string> = {}
  if (template) {
    for (const c of template.campos) {
      const v = valoresTpl[c.chave] ?? ""
      if (c.tipo === "cpf" && v && !validarCpf(v)) errosTpl[c.chave] = "CPF inválido"
      if (c.tipo === "cnpj" && v && !validarCnpj(v)) errosTpl[c.chave] = "CNPJ inválido"
    }
  }

  const minutaContrato = template
    ? preencherTexto(template.corpo, {
        ...valoresTpl,
        ...Object.fromEntries(
          template.campos
            .filter((c) => c.tipo === "moeda")
            .map((c) => [
              `${c.chave}_extenso`,
              valoresTpl[`${c.chave}_extenso`] ||
                valorPorExtenso(Number(valoresTpl[c.chave]) || 0),
            ]),
        ),
      })
    : ""

  const grupos = useMemo(() => {
    const g: Record<InstrumentoClausula, typeof CLAUSULAS> = {
      contrato_social_holding: [],
      doacao_testamento: [],
    }
    for (const c of CLAUSULAS) g[c.instrumento].push(c)
    return g
  }, [])

  return (
    <div className="space-y-6">
      {!embedded && (
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Planejamento Sucessório</p>
          <h1 className="page-title text-[24px] text-foreground">
            Documentos e <span className="text-primary">minutas</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Cláusulas-modelo e contratos. Minuta de apoio — revisão pelo advogado responsável.
          </p>
        </div>
      )}

      <Tabs defaultValue="clausulas">
        <TabsList>
          <TabsTrigger value="clausulas">Cláusulas</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value="clausulas" className="space-y-6 mt-4">
          {(Object.keys(grupos) as InstrumentoClausula[]).map((inst) => (
            <Card key={inst} className="form-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{INSTRUMENTO_LABEL[inst]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {grupos[inst].map((c) => {
                  const on = incluidas.includes(c.id)
                  return (
                    <div key={c.id} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{c.titulo}</p>
                          <p className="text-xs text-muted-foreground mt-1">{c.paraQueServe}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">Quando usar: </span>
                            {c.quandoUsar}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 italic">{c.observacaoLegal}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant={on ? "secondary" : "outline"}
                          disabled={locked}
                          onClick={() => toggleClausula(c.id)}
                        >
                          {on ? <Check className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                          {on ? "Incluída" : "Incluir"}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          ))}

          {camposUnicos.length > 0 && (
            <Card className="form-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Campos da minuta</CardTitle>
                <p className="text-sm text-muted-foreground font-normal">
                  O mesmo campo vale para todas as cláusulas incluídas. Vazio aparece entre colchetes.
                </p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {camposUnicos.map((chave) => (
                  <CampoDoc
                    key={chave}
                    campo={{
                      chave,
                      label: LABEL_CAMPO_CLAUSULA[chave] ?? chave,
                      tipo: chave === "cpf" || chave === "donatario_cpf" ? "cpf" : chave === "cnpj" ? "cnpj" : chave === "valor" ? "moeda" : chave === "uf" ? "uf" : chave === "bem" || chave === "endereco" ? "textarea" : "texto",
                    }}
                    value={camposClausulas[chave] ?? ""}
                    locked={locked}
                    onChange={setCampoClausula}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          <MinutaPreview titulo="Minuta de cláusulas" corpo={minutaClausulas} locked={locked} />
        </TabsContent>

        <TabsContent value="contratos" className="space-y-6 mt-4">
          <Card className="form-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Template</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger className="form-card max-w-xl">
                  <SelectValue placeholder="Selecione o contrato" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {template && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {template.campos.map((c: CampoTemplate) => (
                    <CampoDoc
                      key={c.chave}
                      campo={c}
                      value={valoresTpl[c.chave] ?? ""}
                      locked={locked}
                      erro={errosTpl[c.chave]}
                      onChange={setCampoTpl}
                      onCep={buscarCep}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          {template && (
            <div className="space-y-2">
              {Object.keys(errosTpl).length > 0 && (
                <Badge variant="outline" className="text-destructive">
                  Corrija CPF/CNPJ antes de protocolar — a minuta ainda pode ser exportada como rascunho
                </Badge>
              )}
              <MinutaPreview titulo={template.titulo} corpo={minutaContrato} locked={locked} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
