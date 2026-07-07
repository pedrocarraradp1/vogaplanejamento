export type StatusDiagnostico = 'Saudável' | 'Atenção' | 'Crítico'
export type Responsavel = 'Cliente' | 'Advisor'
export type Prioridade = 'Alta' | 'Média' | 'Baixa'
export type StatusAcao = 'A fazer' | 'Em andamento' | 'Concluído'

export interface BlocoDiagnostico {
  area: string
  status: StatusDiagnostico
  texto: string
}

export interface ItemAcao {
  id: string
  titulo: string
  descricao: string
  origem: string
  responsavel: Responsavel
  prazo: string
  prioridade: Prioridade
  status: StatusAcao
}

export interface SnapshotCliente {
  balancoPatrimonial?: {
    patrimonioLiquido: number
    ativosLiquidos: number
    passivosTotais: number
    reservaEmergenciaMeses: number
    reservaEmergenciaMetaMeses: number
    indiceAlavancagem: number
  }
  fluxoDeCaixa?: {
    fluxoLiquidoAnual: number
    taxaPoupancaEfetiva: number
    mesesComSaldoNegativo: string[]
  }
  objetivos?: {
    nome: string
    ano: number
    valor: number
  }[]
  aposentadoria?: {
    idadeAtual: number
    idadeAposentadoriaDesejada: number
    anosParaIndependencia: number
    aporteMensalAtual: number
    aporteMensalNecessario: number
  }
}
