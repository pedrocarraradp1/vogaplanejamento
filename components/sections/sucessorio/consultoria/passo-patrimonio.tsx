"use client"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AjudaConsultoria } from "@/components/ui/consultoria/ajuda"
import { NumeroHeroi } from "@/components/ui/consultoria/numero-heroi"
import type { LacunaConsultoria, PerfilConsultoria } from "@/lib/sucessorio/consultoria"
import { ITCMD_POR_UF, type UfBrasil } from "@/lib/sucessorio/itcmd-uf"
import { fmtMoeda } from "./format"

const UFS = Object.keys(ITCMD_POR_UF) as UfBrasil[]
const CORES = ["#5B9BFF", "#1066DA", "#4B759B", "#01121E"]

export function PassoPatrimonio({
  perfil,
  lacunas,
  moeda,
  locked,
  patrimonioTotal,
  onUf,
  onRegime,
  onNascimento,
  onHerdeiros,
  onEstadoCivil,
  onContinuar,
  onEditarCadastro,
}: {
  perfil: PerfilConsultoria
  lacunas: LacunaConsultoria[]
  moeda: "BRL" | "USD"
  locked: boolean
  patrimonioTotal: number
  onUf: (uf: string) => void
  onRegime: (regime: string) => void
  onNascimento: (iso: string) => void
  onHerdeiros: (n: number) => void
  onEstadoCivil: (v: string) => void
  onContinuar: () => void
  onEditarCadastro?: () => void
}) {
  const nImoveis = perfil.bensEspolio.filter((b) => b.tipo === "imovel").length
  const nEmpresas = perfil.empresas.length || (perfil.participacoes > 0 ? 1 : 0)
  const fatias = [
    { label: "Imóveis", valor: perfil.imoveis },
    { label: "Empresas", valor: perfil.participacoes },
    { label: "Líquidos", valor: perfil.liquidos },
    { label: "Previdência", valor: perfil.previdenciaPGBL + perfil.previdenciaVGBL },
  ].filter((f) => f.valor > 0)
  const totalFatias = fatias.reduce((s, f) => s + f.valor, 0) || 1
  const falta = (c: string) => lacunas.some((l) => l.campo === c)
  const confirmados = [
    perfil.uf && !falta("uf") ? `Domicílio ${perfil.uf}` : null,
    perfil.regimeBens && !falta("regime") ? perfil.regimeBens : null,
    perfil.idade != null ? `${perfil.idade} anos` : null,
    perfil.herdeiros > 0 ? `${perfil.herdeiros} herdeiros` : null,
  ].filter(Boolean) as string[]

  const r = 54
  const circ = 2 * Math.PI * r
  let acc = 0

  return (
    <div className="consultoria-enter">
      <section className="consultoria-navy consultoria-hero consultoria-bloco">
        <div className="flex flex-col justify-between min-h-0">
          <NumeroHeroi
            rotulo="Patrimônio total"
            valor={patrimonioTotal}
            moeda={moeda}
            tom="branco"
            ajuda="Soma dos ativos do plano, na moeda selecionada."
          />
          <div className="flex flex-wrap gap-2 mt-6">
            <span className="consultoria-chip">{nImoveis} imóveis</span>
            <span className="consultoria-chip">{nEmpresas} empresas</span>
            <span className="consultoria-chip">{perfil.herdeiros} herdeiros</span>
            <span className="consultoria-chip">{perfil.uf}</span>
          </div>
        </div>
        <div className="flex items-center gap-6 min-h-0">
          <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden>
            {fatias.map((f, i) => {
              const pct = f.valor / totalFatias
              const dash = circ * pct
              const el = (
                <circle
                  key={f.label}
                  cx="70"
                  cy="70"
                  r={r}
                  fill="none"
                  stroke={CORES[i % CORES.length]}
                  strokeWidth="10"
                  strokeDasharray={`${dash} ${circ}`}
                  strokeDashoffset={-acc * circ}
                  transform="rotate(-90 70 70)"
                />
              )
              acc += pct
              return el
            })}
          </svg>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-2 flex-1">
            {fatias.map((f, i) => (
              <li key={f.label} className="consultoria-corpo" style={{ color: "#fff" }}>
                <span style={{ color: CORES[i % CORES.length] }}>■ </span>
                {f.label}
                <br />
                <span style={{ color: "var(--consultoria-acento)" }}>{fmtMoeda(f.valor, moeda)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="consultoria-rotulo consultoria-bloco" style={{ marginBottom: 16 }}>
        Confirmado pelo plano
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 consultoria-bloco" style={{ marginTop: 0 }}>
        {confirmados.map((c) => (
          <div key={c} className="consultoria-card-ok flex items-center gap-3">
            <span className="consultoria-check">✓</span>
            <span className="consultoria-corpo">{c}</span>
          </div>
        ))}
        {falta("uf") && !locked && (
          <div className="consultoria-card-falta">
            <p className="consultoria-rotulo">Falta informar UF</p>
            <Select value={perfil.uf} onValueChange={onUf}>
              <SelectTrigger className="mt-2 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UFS.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {falta("regime") && !locked && (
          <div className="consultoria-card-falta">
            <p className="consultoria-rotulo">Falta informar regime</p>
            <Input className="mt-2 h-10" value={perfil.regimeBens} onChange={(e) => onRegime(e.target.value)} />
          </div>
        )}
        {falta("nascimento") && !locked && (
          <div className="consultoria-card-falta">
            <p className="consultoria-rotulo">Falta informar nascimento</p>
            <Input type="date" className="mt-2 h-10" onChange={(e) => onNascimento(e.target.value)} />
          </div>
        )}
        {falta("estadoCivil") && !locked && (
          <div className="consultoria-card-falta">
            <p className="consultoria-rotulo">Falta informar estado civil</p>
            <Input className="mt-2 h-10" value={perfil.estadoCivil} onChange={(e) => onEstadoCivil(e.target.value)} />
          </div>
        )}
        {perfil.herdeiros === 0 && !locked && (
          <div className="consultoria-card-falta">
            <p className="consultoria-rotulo">Falta informar herdeiros</p>
            <Input
              type="number"
              className="mt-2 h-10"
              onChange={(e) => onHerdeiros(parseInt(e.target.value, 10) || 0)}
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        {onEditarCadastro && !locked && (
          <button type="button" className="consultoria-btn consultoria-btn-secundario" onClick={onEditarCadastro}>
            Editar no cadastro
          </button>
        )}
        <button type="button" className="consultoria-btn consultoria-btn-primario" onClick={onContinuar}>
          Continuar
        </button>
      </div>
    </div>
  )
}
