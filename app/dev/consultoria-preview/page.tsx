"use client"

import { useMemo, useState } from "react"
import { PassoDiagnostico } from "@/components/sections/sucessorio/consultoria/passo-diagnostico"
import { PassoParecer } from "@/components/sections/sucessorio/consultoria/passo-parecer"
import { PassoPatrimonio } from "@/components/sections/sucessorio/consultoria/passo-patrimonio"
import { PassoPerguntas } from "@/components/sections/sucessorio/consultoria/passo-perguntas"
import { PassoRecomendacao } from "@/components/sections/sucessorio/consultoria/passo-recomendacao"
import { PassoSimulacoes } from "@/components/sections/sucessorio/consultoria/passo-simulacoes"
import { PERGUNTAS_TRIAGEM, leituraResposta, type LinhaLeitura } from "@/components/sections/sucessorio/consultoria/perguntas"
import { RODAPE_CONSULTORIA } from "@/components/sections/sucessorio/consultoria/format"
import { textoParecerFallback } from "@/lib/sucessorio/texto-parecer"
import { gerarParecer, listarLacunas, montarPerfil, type PlanoConsultoria, type TriagemConsultoria } from "@/lib/sucessorio/consultoria"

function planoExemplo(): PlanoConsultoria {
  const imoveis = [1, 2, 3, 4].map((n) => ({
    id: `imo-${n}`,
    tipo: "imobilizado",
    descricao: "Imóvel Investimento",
    valor: 1_500_000,
    aluguelMensal: 7_500,
    uf: "SP",
  }))
  return {
    dadosPessoais: {
      nome: "Empresário SP",
      nascimento: "1975-03-10",
      estadoCivil: "casado",
      regime: "Comunhão Parcial de Bens",
      uf: "SP",
      renda: 40_000,
      filhos: [
        { nome: "Ana", dataNascimento: "2002-01-01" },
        { nome: "Bruno", dataNascimento: "2004-06-01" },
      ],
    },
    ativos: [
      ...imoveis,
      { id: "emp", tipo: "participacao_societaria", descricao: "Empresa", empresa: "ABC Participações", valor: 2_000_000 },
      { id: "cx", tipo: "ativo_liquido", descricao: "Ativos Nacionais", valor: 80_000, localizacao: "nacional" },
    ],
    passivos: [],
    seguros: [],
  }
}

const TRIAGEM: TriagemConsultoria = {
  testamento: "Não",
  holdingExistente: "Não",
  preocupacaoInventario: "Alta",
  preocupacaoItcmd: "Alta",
  aceitaHolding: true,
  aceitaDoacao: true,
  aceitaSeguro: true,
}

export default function ConsultoriaPreviewPage() {
  const plano = useMemo(() => planoExemplo(), [])
  const perfil = useMemo(() => montarPerfil(plano, new Date("2026-11-05")), [plano])
  const lacunas = useMemo(() => listarLacunas(plano, perfil, TRIAGEM), [plano, perfil])
  const parecer = useMemo(() => gerarParecer(plano, TRIAGEM, { agora: new Date("2026-11-05T12:00:00-03:00") }), [plano])
  const texto = useMemo(() => textoParecerFallback(parecer), [parecer])
  const [idx, setIdx] = useState(0)
  const [leitura, setLeitura] = useState<LinhaLeitura[]>([])
  const pergunta = PERGUNTAS_TRIAGEM.filter((q) => q.visivel(perfil))[idx] ?? PERGUNTAS_TRIAGEM[0]
  const patrimonio = (plano.ativos ?? []).reduce((s, a) => s + (Number(a.valor) || 0), 0)

  return (
    <main className="consultoria-shell">
      <p className="consultoria-rotulo">Preview · Consultoria sucessória e fiscal</p>
      <h1 className="consultoria-h1" style={{ margin: "8px 0 48px" }}>
        Seis passos com dados de exemplo
      </h1>

      <section className="consultoria-bloco">
        <p className="consultoria-rotulo" style={{ marginBottom: 16 }}>
          1 · O que você construiu
        </p>
        <PassoPatrimonio
          perfil={perfil}
          lacunas={lacunas}
          moeda="BRL"
          locked={false}
          patrimonioTotal={patrimonio}
          onUf={() => {}}
          onRegime={() => {}}
          onNascimento={() => {}}
          onHerdeiros={() => {}}
          onEstadoCivil={() => {}}
          onContinuar={() => {}}
        />
      </section>

      <section className="consultoria-bloco">
        <p className="consultoria-rotulo" style={{ marginBottom: 16 }}>
          2 · Algumas perguntas
        </p>
        <PassoPerguntas
          pergunta={pergunta}
          indice={idx}
          total={PERGUNTAS_TRIAGEM.filter((q) => q.visivel(perfil)).length}
          valor=""
          leitura={leitura}
          onEscolher={(v) => {
            const linha = leituraResposta(pergunta.id, v)
            if (linha) setLeitura((p) => [...p.filter((x) => x.id !== linha.id), linha])
            setIdx((n) => (n + 1) % PERGUNTAS_TRIAGEM.filter((q) => q.visivel(perfil)).length)
          }}
        />
      </section>

      <section className="consultoria-bloco">
        <p className="consultoria-rotulo" style={{ marginBottom: 16 }}>
          3 · Analisando
        </p>
        <PassoSimulacoes concluidos={6} />
      </section>

      <section className="consultoria-bloco">
        <p className="consultoria-rotulo" style={{ marginBottom: 16 }}>
          4 · Diagnóstico
        </p>
        <PassoDiagnostico parecer={parecer} moeda="BRL" />
      </section>

      <section className="consultoria-bloco">
        <p className="consultoria-rotulo" style={{ marginBottom: 16 }}>
          5 · Recomendação
        </p>
        <PassoRecomendacao
          parecer={parecer}
          moeda="BRL"
          locked
          publico={false}
          concluidas={[]}
          onToggleAcao={() => {}}
        />
      </section>

      <section className="consultoria-bloco">
        <p className="consultoria-rotulo" style={{ marginBottom: 16 }}>
          6 · Seu parecer
        </p>
        <PassoParecer
          parecer={parecer}
          texto={texto}
          gerando={false}
          locked
          gerandoPdf={false}
          onPdf={() => {}}
          cliente={parecer.perfil.nome}
          assessor="Preview Voga"
          data="05/11/2026"
        />
      </section>

      <p className="consultoria-rodape">{RODAPE_CONSULTORIA}</p>
    </main>
  )
}
