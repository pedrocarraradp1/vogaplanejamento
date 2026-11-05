"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePlano } from "@/lib/plano-context"
import { usePlanoReadOnly } from "@/lib/plano-readonly-context"
import {
  gerarParecer,
  listarLacunas,
  montarPerfil,
  pacoteConsultoria,
  triagemDoQuestionario,
  type PlanoConsultoria,
  type TriagemConsultoria,
} from "@/lib/sucessorio/consultoria"
import { textoParecerFallback } from "@/lib/sucessorio/texto-parecer"
import { RODAPE_CONSULTORIA } from "./format"
import { PassoDiagnostico } from "./passo-diagnostico"
import { PassoParecer } from "./passo-parecer"
import { PassoPatrimonio } from "./passo-patrimonio"
import { PassoPerguntas } from "./passo-perguntas"
import { PassoRecomendacao } from "./passo-recomendacao"
import { PassoSimulacoes, TOTAL_CHECKS_SIMULACAO } from "./passo-simulacoes"
import {
  aplicarResposta,
  leituraResposta,
  perguntasVisiveis,
  valorPergunta,
  type LinhaLeitura,
} from "./perguntas"

const STEPS_FULL = [
  "O que você construiu",
  "Algumas perguntas",
  "Analisando",
  "Diagnóstico",
  "Recomendação",
  "Seu parecer",
] as const

export function ConsultoriaSucessoria({
  onGerarPdf,
  gerandoPdf,
  onEditarCadastro,
  assessorNome = "Assessor",
}: {
  onGerarPdf?: () => void
  gerandoPdf?: boolean
  onEditarCadastro?: () => void
  assessorNome?: string
}) {
  const { state, setSucessao, setDadosPessoais, getPatrimonioTotalConsolidado } = usePlano()
  const locked = usePlanoReadOnly()
  const moeda = state.moeda === "USD" ? "USD" : "BRL"
  const publico = locked
  const salvo = state.sucessao.consultoria
  const [passo, setPasso] = useState(() => {
    if (publico || salvo?.parecer) return 3
    return -1
  })
  const [dir, setDir] = useState<"next" | "prev">("next")
  const [triagem, setTriagem] = useState<TriagemConsultoria>(
    () =>
      salvo?.triagem ??
      triagemDoQuestionario(state.sucessao.questionario as Record<string, unknown> | undefined),
  )
  const [idxPerg, setIdxPerg] = useState(0)
  const [checks, setChecks] = useState(0)
  const [texto, setTexto] = useState(salvo?.textoNarrativo ?? "")
  const [gerandoTexto, setGerandoTexto] = useState(false)
  const [leitura, setLeitura] = useState<LinhaLeitura[]>([])
  const rodandoRef = useRef(false)
  const textoPedidoRef = useRef(false)

  const planoInput = useMemo(
    (): PlanoConsultoria => ({
      dadosPessoais: state.dadosPessoais,
      ativos: state.ativos,
      passivos: state.passivos,
      seguros: state.seguros,
      sucessao: state.sucessao as PlanoConsultoria["sucessao"],
    }),
    [state.dadosPessoais, state.ativos, state.passivos, state.seguros, state.sucessao],
  )

  const perfil = useMemo(() => montarPerfil(planoInput), [planoInput])
  const lacunas = useMemo(() => listarLacunas(planoInput, perfil, triagem), [planoInput, perfil, triagem])
  const perguntas = useMemo(() => perguntasVisiveis(perfil), [perfil])
  const parecer = salvo?.parecer
  const irPara = (n: number) => {
    setDir(n > passo ? "next" : "prev")
    setPasso(n)
  }

  const gerarEPersistir = useCallback(() => {
    const p = gerarParecer(planoInput, triagem)
    const pack = pacoteConsultoria(p, triagem)
    setSucessao({
      consultoria: { ...pack, acoesConcluidas: [] },
      questionario: {
        ...(state.sucessao.questionario ?? {}),
        testamento: triagem.testamento,
        holdingPatrimonialOuFamiliar: triagem.holdingExistente,
        doacoesJaRealizadas: triagem.doacoesJaRealizadas,
        usufruto: triagem.usufruto,
        planejamentoSucessorioRealizado: triagem.planejamentoRealizado,
        bensNoExterior: triagem.bensNoExterior,
        usoPGBL: triagem.usoPGBL,
        preocupacaoComInventario: triagem.preocupacaoInventario,
        preocupacaoComITCMD: triagem.preocupacaoItcmd,
      },
    })
    return p
  }, [planoInput, triagem, setSucessao, state.sucessao.questionario])

  const gerarRef = useRef(gerarEPersistir)
  gerarRef.current = gerarEPersistir

  useEffect(() => {
    if (passo !== 2 || locked) return
    if (rodandoRef.current) return
    rodandoRef.current = true
    setChecks(0)
    const timers: number[] = []
    for (let i = 1; i <= TOTAL_CHECKS_SIMULACAO; i++) {
      timers.push(window.setTimeout(() => setChecks(i), i * 400))
    }
    timers.push(
      window.setTimeout(() => {
        gerarRef.current()
        setDir("next")
        setPasso(3)
        rodandoRef.current = false
      }, 2600),
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [passo, locked])

  useEffect(() => {
    if (passo !== 5 || !parecer || textoPedidoRef.current) return
    if (texto.trim()) return
    textoPedidoRef.current = true
    const fallback = textoParecerFallback(parecer)
    if (locked) {
      setTexto(fallback)
      return
    }
    let cancel = false
    setGerandoTexto(true)
    fetch("/api/consultoria/parecer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parecer }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancel) return
        const t = typeof data?.texto === "string" && data.texto.trim() ? data.texto : fallback
        setTexto(t)
        const atual = state.sucessao.consultoria
        if (!atual) return
        setSucessao({ consultoria: { ...atual, textoNarrativo: t } })
      })
      .catch(() => {
        if (!cancel) setTexto(fallback)
      })
      .finally(() => {
        if (!cancel) setGerandoTexto(false)
      })
    return () => {
      cancel = true
    }
  }, [passo, parecer, texto, locked, setSucessao, state.sucessao.consultoria])

  const refazer = () => {
    if (locked) return
    rodandoRef.current = false
    textoPedidoRef.current = false
    setSucessao({ consultoria: undefined })
    setTexto("")
    setTriagem({})
    setLeitura([])
    setIdxPerg(0)
    setChecks(0)
    setPasso(-1)
  }

  const irProximo = () => {
    if (passo === 0) {
      irPara(perguntas.length === 0 ? 2 : 1)
      return
    }
    if (passo === 1) {
      if (idxPerg + 1 >= perguntas.length) irPara(2)
      else setIdxPerg((n) => n + 1)
      return
    }
    if (passo >= 3 && passo < 5 && parecer) irPara(passo + 1)
  }

  const steps = publico ? STEPS_FULL.slice(3) : [...STEPS_FULL]
  const dataParecer = parecer
    ? new Intl.DateTimeFormat("pt-BR").format(new Date(parecer.geradoEm))
    : new Intl.DateTimeFormat("pt-BR").format(new Date())
  const cliente = parecer?.perfil.nome || state.dadosPessoais.nome || "Cliente"

  return (
    <div className="consultoria-shell">
      {publico && parecer && (
        <p className="consultoria-rotulo" style={{ marginBottom: 24 }}>
          Preparado para {cliente} por {assessorNome} · {dataParecer}
        </p>
      )}

      {passo >= 0 && (
        <nav className="consultoria-stepper">
          {steps.map((label, i) => {
            const real = publico ? i + 3 : i
            return (
              <button
                key={label}
                type="button"
                className={passo === real ? "is-on" : undefined}
                onClick={() => {
                  if (publico && real > passo) return
                  if (!publico && real === 2) return
                  if (real >= 3 && !parecer) return
                  irPara(real)
                }}
              >
                {label}
              </button>
            )
          })}
        </nav>
      )}

      <div className={dir === "next" ? "consultoria-slide-next" : "consultoria-slide-prev"}>
        {passo < 0 && !publico && (
          <EstadoVazio onComecar={() => irPara(0)} />
        )}
        {passo === 0 && !publico && (
          <PassoPatrimonio
            perfil={perfil}
            lacunas={lacunas}
            moeda={moeda}
            locked={locked}
            patrimonioTotal={getPatrimonioTotalConsolidado()}
            onUf={(uf) => setDadosPessoais({ uf })}
            onRegime={(regime) => {
              setDadosPessoais({ regime })
              setSucessao({ regimeSucessao: regime })
            }}
            onNascimento={(nascimento) => setDadosPessoais({ nascimento })}
            onHerdeiros={(n) => setSucessao({ herdeiros: n })}
            onEstadoCivil={(estadoCivil) => setDadosPessoais({ estadoCivil })}
            onContinuar={irProximo}
            onEditarCadastro={onEditarCadastro}
          />
        )}
        {passo === 1 && !publico && perguntas[idxPerg] && (
          <PassoPerguntas
            pergunta={perguntas[idxPerg]}
            indice={idxPerg}
            total={perguntas.length}
            valor={valorPergunta(triagem, perguntas[idxPerg].id)}
            leitura={leitura}
            onEscolher={(v) => {
              const id = perguntas[idxPerg].id
              setTriagem(aplicarResposta(triagem, id, v))
              const linha = leituraResposta(id, v)
              if (linha) setLeitura((prev) => [...prev.filter((x) => x.id !== linha.id), linha])
              window.setTimeout(() => {
                if (idxPerg + 1 >= perguntas.length) irPara(2)
                else setIdxPerg((n) => n + 1)
              }, 220)
            }}
          />
        )}
        {passo === 2 && !publico && <PassoSimulacoes concluidos={checks} />}
        {passo === 3 && parecer && <PassoDiagnostico parecer={parecer} moeda={moeda} />}
        {passo === 4 && parecer && (
          <PassoRecomendacao
            parecer={parecer}
            moeda={moeda}
            locked={locked}
            publico={publico}
            concluidas={salvo?.acoesConcluidas ?? []}
            onToggleAcao={(id) => {
              if (locked || !state.sucessao.consultoria) return
              const cur = new Set(state.sucessao.consultoria.acoesConcluidas ?? [])
              if (cur.has(id)) cur.delete(id)
              else cur.add(id)
              setSucessao({
                consultoria: { ...state.sucessao.consultoria, acoesConcluidas: [...cur] },
              })
            }}
          />
        )}
        {passo === 5 && parecer && (
          <PassoParecer
            parecer={parecer}
            texto={texto || textoParecerFallback(parecer)}
            gerando={gerandoTexto}
            locked={locked}
            gerandoPdf={Boolean(gerandoPdf)}
            onPdf={() => onGerarPdf?.()}
            onRefazer={refazer}
            cliente={cliente}
            assessor={assessorNome}
            data={dataParecer}
          />
        )}
        {passo >= 3 && !parecer && (
          <p className="consultoria-corpo" style={{ color: "var(--consultoria-neutro)" }}>
            A consultoria ainda não foi gerada neste plano.
          </p>
        )}
      </div>

      {passo >= 3 && passo < 5 && parecer && !publico && (
        <div className="flex justify-end mt-10">
          <button type="button" className="consultoria-btn consultoria-btn-primario" onClick={irProximo}>
            Continuar
          </button>
        </div>
      )}

      <p className="consultoria-rodape">{RODAPE_CONSULTORIA}</p>
    </div>
  )
}

function EstadoVazio({ onComecar }: { onComecar: () => void }) {
  return (
    <div className="consultoria-enter flex flex-col items-center text-center py-20">
      <svg width="160" height="96" viewBox="0 0 160 96" aria-hidden>
        <rect x="36" y="8" width="88" height="80" rx="4" fill="none" stroke="#01121E" strokeWidth="1.2" />
        <line x1="52" y1="28" x2="108" y2="28" stroke="#1066DA" strokeWidth="1.2" />
        <line x1="52" y1="42" x2="108" y2="42" stroke="#6B7A90" strokeWidth="1" />
        <line x1="52" y1="54" x2="96" y2="54" stroke="#6B7A90" strokeWidth="1" />
        <line x1="52" y1="66" x2="88" y2="66" stroke="#6B7A90" strokeWidth="1" />
      </svg>
      <h2 className="consultoria-h1" style={{ maxWidth: 480, marginTop: 32 }}>
        Em 3 minutos o planejador entrega o diagnóstico sucessório e fiscal deste cliente
      </h2>
      <button type="button" className="consultoria-btn consultoria-btn-primario mt-10" onClick={onComecar}>
        Começar
      </button>
    </div>
  )
}
