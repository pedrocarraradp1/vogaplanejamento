export type TipoRoteiro =
  | "holding_patrimonial"
  | "doacao_usufruto"
  | "testamento"
  | "inventario_extrajudicial"
  | "acordo_socios"
  | "previdencia_sucessoria"

export type TemaRoteiro =
  | "pessoais"
  | "familia_regime"
  | "imoveis"
  | "empresas"
  | "financeiro"
  | "fiscal"
  | "previdencia"
  | "internacional"
  | "governanca"
  | "cartorio"
  | "operacao"

export type CategoriaRoteiro = "documentos" | "etapas" | "conferencias"

export type ItemRoteiro = {
  id: string
  tema: TemaRoteiro
  titulo: string
}

export type DefinicaoRoteiro = {
  tipo: TipoRoteiro
  label: string
  documentos: ItemRoteiro[]
  etapas: ItemRoteiro[]
  conferencias: ItemRoteiro[]
}

export const TEMA_LABEL: Record<TemaRoteiro, string> = {
  pessoais: "Pessoais",
  familia_regime: "Família e regime de bens",
  imoveis: "Imóveis",
  empresas: "Empresas",
  financeiro: "Financeiro e seguros",
  fiscal: "Fiscal e ITCMD",
  previdencia: "Previdência",
  internacional: "Internacional",
  governanca: "Governança",
  cartorio: "Cartório e registro",
  operacao: "Operação e caixa",
}

export const TIPO_ROTEIRO_LABEL: Record<TipoRoteiro, string> = {
  holding_patrimonial: "Holding patrimonial",
  doacao_usufruto: "Doação com reserva de usufruto",
  testamento: "Testamento",
  inventario_extrajudicial: "Inventário extrajudicial",
  acordo_socios: "Acordo de sócios",
  previdencia_sucessoria: "Previdência no planejamento sucessório",
}

export const TIPOS_ROTEIRO: TipoRoteiro[] = [
  "holding_patrimonial",
  "doacao_usufruto",
  "testamento",
  "inventario_extrajudicial",
  "acordo_socios",
  "previdencia_sucessoria",
]

function itens(
  tipo: TipoRoteiro,
  categoria: "d" | "e" | "c",
  grupos: Partial<Record<TemaRoteiro, string[]>>,
): ItemRoteiro[] {
  const out: ItemRoteiro[] = []
  let n = 1
  for (const [tema, titulos] of Object.entries(grupos) as [TemaRoteiro, string[]][]) {
    for (const titulo of titulos) {
      out.push({
        id: `${tipo}:${categoria}:${String(n).padStart(2, "0")}`,
        tema,
        titulo,
      })
      n += 1
    }
  }
  return out
}

const HOLDING_DOCS = itens("holding_patrimonial", "d", {
  pessoais: [
    "RG ou CNH do titular (e do cônjuge, se casado)",
    "CPF do titular e do cônjuge",
    "Comprovante de residência atualizado",
    "Certidão de nascimento do titular",
    "Passaporte, se houver sócio ou beneficiário não residente",
    "Procuração pública com poderes específicos (se alguém assinar pelo titular)",
    "Comprovante de ocupação / declaração de profissão",
  ],
  familia_regime: [
    "Certidão de casamento atualizada ou escritura de união estável",
    "Pacto antenupcial registrado (se houver)",
    "Certidão de nascimento dos filhos e demais herdeiros necessários",
    "Sentença e partilha de divórcio anterior",
    "Certidão de óbito de cônjuge ou companheiro falecido",
    "Testamento existente (público, cerrado ou particular)",
    "Inventário ou sobrepartilha já concluídos na família",
    "Declaração de herdeiros e mapa de vocação hereditária",
  ],
  imoveis: [
    "Matrículas atualizadas de todos os imóveis a integralizar",
    "Certidão de ônus reais de cada matrícula",
    "Carnê / guia de IPTU e comprovante de quitação",
    "CCIR, ITR e certidão do INCRA (imóvel rural)",
    "Contratos de locação, comodato ou cessão vigentes",
    "Habite-se, AVCB e regularização urbanística (quando couber)",
    "Laudo de avaliação recente dos imóveis",
    "Planta, memorial descritivo e confrontações",
    "Certidão negativa de débitos municipais do imóvel",
    "Contratos de financiamento e saldo devedor (se alienados)",
  ],
  empresas: [
    "Contrato social ou estatuto consolidado da(s) empresa(s) operacional(is)",
    "Alterações contratuais e ata da última assembleia",
    "Ficha cadastral simplificada da Junta Comercial",
    "Cartão CNPJ e QSA atualizado",
    "Livro de registro de quotistas / acionistas",
    "Acordo de quotistas ou acionistas vigente",
    "Organograma societário do grupo",
    "Balanço, DRE e balancetes dos últimos 3 exercícios",
    "Relação de mútuos sócio–empresa e contas correntes de sócios",
    "Certidões negativas da pessoa jurídica (federal, estadual, municipal, FGTS, trabalhista)",
  ],
  financeiro: [
    "Posição consolidada de contas, aplicações e custódia",
    "Extratos bancários dos últimos 90 dias",
    "Relação de dívidas, aval, fiança e garantias reais",
    "Apólices de seguro de vida, residencial e D&O",
    "Contratos de câmbio e contas no exterior em nome do titular",
    "Declaração de IRPF dos últimos 3 anos (completa)",
  ],
  fiscal: [
    "Simulação de ITCMD da doação de quotas (UF do domicílio)",
    "Estudo de ITBI vs. ITCMD na integralização de imóveis",
    "Certidão conjunta RFB/PGFN do titular e do cônjuge",
    "CND estadual e municipal do titular",
    "Memória da origem dos recursos / bens a integralizar",
    "Estudo de viabilidade da holding (custo, governança, saída)",
  ],
  internacional: [
    "Lista de bens e entidades no exterior a manter fora da holding",
    "Documentos societários de offshores e trusts já existentes",
    "Informe de capitais brasileiros no exterior (CBE/BCB), se aplicável",
  ],
  governanca: [
    "Minuta pretendida de acordo de quotistas da holding",
    "Relação de quem será usufrutuário, nu-proprietário e administrador",
    "Regras desejadas de incomunicabilidade, impenhorabilidade e reversão",
  ],
})

const HOLDING_ETAPAS = itens("holding_patrimonial", "e", {
  governanca: [
    "Kick-off: mapa de bens, herdeiros, objetivos e o que NÃO entra na holding",
    "Definir tipo (pura vs. mista) e forma (LTDA, S.A. ou EIRELI/SLU equivalente)",
    "Definir capital, espécie de quotas e se haverá usufruto",
    "Aprovar organograma alvo e quem administra",
  ],
  fiscal: [
    "Rodar ITCMD da doação de quotas e ITBI da integralização imóvel a imóvel",
    "Escolher UF de sede e calendário de protocolo (Junta + Registro de Imóveis)",
    "Provisionar caixa para imposto, laudos, registros e honorários",
  ],
  empresas: [
    "Minutar contrato social / estatuto da holding",
    "Minutar acordo de quotistas (voto, sucessor, tag/drag, apuração de haveres)",
    "Constituir e registrar a holding na Junta Comercial e obter CNPJ",
    "Integralizar bens (imóveis e/ou quotas) com laudo e atas",
    "Doar nua-propriedade das quotas com reserva de usufruto, se for o caso",
  ],
  cartorio: [
    "Averbar integralização e/ou doação nas matrículas",
    "Registrar usufruto, incomunicabilidade e impenhorabilidade, quando pactuados",
    "Atualizar cadastro municipal, concessões e contratos de locação",
  ],
  operacao: [
    "Abrir conta da holding e migrar fluxo de aluguéis / dividendos",
    "Atualizar IRPF/IRPJ, livro de quotas e procurações",
    "Agenda de governança familiar (reunião anual, política de distribuição)",
  ],
})

const HOLDING_CONF = itens("holding_patrimonial", "c", {
  empresas: [
    "Capital social e quadro de quotistas conferem com o acordo e com a Junta",
    "Usufruto das quotas está descrito no contrato e no acordo",
    "Administração e representação estão nomeadas e com mandato claro",
  ],
  imoveis: [
    "Todas as matrículas-alvo estão em nome da holding (ou com averbação protocolada)",
    "Ônus, financiamento e locação foram tratados no instrumento de integralização",
  ],
  familia_regime: [
    "Cônjuge anuiu na forma do regime de bens",
    "Doação respeita a legítima dos herdeiros necessários",
    "Cláusulas de incomunicabilidade / impenhorabilidade / reversão constam do registro",
  ],
  fiscal: [
    "ITCMD (doação de quotas) e ITBI (imóveis) foram calculados e guias emitidas ou justificadas",
    "Holding não ficou com passivo oculto nem mútuo sem contrato",
  ],
  operacao: [
    "Bancos, locatários e seguradoras foram notificados da nova titularidade",
    "IR e livro-caixa / escrituração partem da data de constituição",
  ],
  internacional: [
    "Bens no exterior NÃO integralizados por engano; situs e estate tax revisados",
  ],
})

const DOACAO_DOCS = itens("doacao_usufruto", "d", {
  pessoais: [
    "RG/CNH e CPF do doador e de cada donatário",
    "Comprovante de residência do doador (domicílio para ITCMD)",
    "Certidão de casamento / união estável e pacto antenupcial",
  ],
  familia_regime: [
    "Certidões de nascimento dos donatários e dos demais herdeiros necessários",
    "Mapa da legítima vs. parte disponível",
    "Testamento vigente (para cruzar disposições)",
    "Outorgas e anuência do cônjuge do doador",
  ],
  imoveis: [
    "Matrícula e certidão de ônus do imóvel doado",
    "IPTU / ITR quitado",
    "Avaliação ou valor venal de referência da UF",
    "Planta e confrontações, se desmembramento",
  ],
  empresas: [
    "Contrato social e livro de quotas (doação de participação)",
    "Acordo de quotistas e anuência de sócios, se houver direito de preferência",
  ],
  fiscal: [
    "Declaração de IRPF do doador (bens e direitos)",
    "Simulação de ITCMD na UF competente, com doações do mesmo ano",
    "Comprovante de doações anteriores no ano civil",
    "Minuta da escritura com reserva de usufruto, administração e reversão",
  ],
  financeiro: [
    "Comprovante de origem do bem / recurso doado",
    "Posição de dívidas que recaiam sobre o bem",
  ],
})

const DOACAO_ETAPAS = itens("doacao_usufruto", "e", {
  fiscal: [
    "Confirmar competência (imóvel no estado da situação; quotas/dinheiro no domicílio)",
    "Agregar doações do ano e aplicar isenção / faixas da UF",
    "Definir se a doação é da nua-propriedade com usufruto vitalício ou temporário",
  ],
  familia_regime: [
    "Checar colação, adiantamento de legítima e igualdade entre herdeiros",
    "Obter anuência do cônjuge e, se menor, representação / alvará",
  ],
  cartorio: [
    "Lavrar escritura pública de doação com reserva de usufruto",
    "Recolher ITCMD e apresentar guia na escritura",
    "Registrar no RI (imóvel) ou na Junta (quotas) e averbar cláusulas",
  ],
  operacao: [
    "Atualizar IRPF do doador e do donatário (nua-propriedade / usufruto)",
    "Comunicar banco, locatário e seguradora sobre o usufruto",
  ],
})

const DOACAO_CONF = itens("doacao_usufruto", "c", {
  fiscal: [
    "Guia de ITCMD quitada ou isenção fundamentada na lei da UF",
    "Valor da base (venal / avaliação) está justificado no instrumento",
  ],
  cartorio: [
    "Usufruto, administração, inalienabilidade e reversão constam do registro",
    "Nua-propriedade está em nome do donatário na matrícula ou no QSA",
  ],
  familia_regime: [
    "Doação não invade a legítima sem colação prevista",
    "Cônjuge e donatários incapazes foram regularizados",
  ],
  operacao: [
    "Frutos (aluguel, dividendos) continuam no usufrutuário, como pactuado",
  ],
})

const TESTAMENTO_DOCS = itens("testamento", "d", {
  pessoais: [
    "RG/CNH, CPF e comprovante de residência do testador",
    "Certidão de nascimento e, se estrangeiro, documentos de identidade do país de origem",
  ],
  familia_regime: [
    "Certidão de casamento / escritura de união estável e pacto antenupcial",
    "Certidões de nascimento (e óbito, se houver) de descendentes e ascendentes",
    "Sentenças de interdição, tutela ou curatela na família",
    "Testamentos anteriores para revogação expressa",
    "Lista de herdeiros necessários e de legatários pretendidos",
  ],
  imoveis: [
    "Relação de imóveis com matrícula e localização (UF)",
    "Bens que se pretende destinar a legado específico",
  ],
  empresas: [
    "Contratos sociais e acordos que limitem a sucessão de quotas",
    "Organograma e desejos de quem assume a gestão",
  ],
  financeiro: [
    "Posição de contas, investimentos e cofres",
    "Apólices de seguro e previdência com beneficiários atuais",
    "Dívidas e garantias relevantes",
  ],
  internacional: [
    "Lista de bens no exterior e se já existe will / trust local",
    "Residência fiscal e eventuais vistos que afetem a lei sucessória",
  ],
  governanca: [
    "Nome pretendido do testamenteiro e substituto",
    "Instruções sobre funeral, digitais (senhas) e doação de órgãos, se desejar",
  ],
})

const TESTAMENTO_ETAPAS = itens("testamento", "e", {
  familia_regime: [
    "Mapear legítima (50%) e parte disponível",
    "Definir tipo (público, cerrado ou particular) e cartório",
    "Alinhar testamento com holding, doações e acordo de sócios já feitos",
  ],
  governanca: [
    "Redigir cláusulas de nomeação, substituição, fideicomisso e incomunicabilidade",
    "Escolher testamenteiro e regras de inventário extrajudicial vs. judicial",
    "Prever disposição sobre empresa, imóvel de moradia e bens digitais",
  ],
  cartorio: [
    "Agendar lavratura (testamento público) com testemunhas hábeis",
    "Ler o instrumento ao testador e colher assinaturas",
    "Registrar no livro do tabelião e guardar via segura para a família",
  ],
  internacional: [
    "Avaliar will separado para bens com situs nos EUA / outro país",
  ],
  operacao: [
    "Comunicar ao testamenteiro onde está a via e como acessar o mapa de bens",
    "Revisar o testamento a cada alteração relevante de família ou patrimônio",
  ],
})

const TESTAMENTO_CONF = itens("testamento", "c", {
  familia_regime: [
    "Não dispõe da legítima além do permitido",
    "Revoga testamentos anteriores de forma expressa",
    "Testemunhas não são herdeiras nem ligadas ao tabelião em impedimento",
  ],
  empresas: [
    "Disposição sobre quotas não conflita com acordo de sócios / direito de preferência",
  ],
  internacional: [
    "Bens no exterior têm instrumento local ou cláusula de lei aplicável consciente",
  ],
  cartorio: [
    "Lavratura válida (capacidade, forma, testemunhas, livro)",
  ],
  financeiro: [
    "Beneficiários de seguro/VGBL não foram tratados como se fossem testamento",
  ],
})

const INV_DOCS = itens("inventario_extrajudicial", "d", {
  pessoais: [
    "Certidão de óbito",
    "RG/CPF do falecido",
    "Comprovante do último domicílio do falecido",
    "Documentos de identidade e CPF de todos os herdeiros e do cônjuge meeiro",
  ],
  familia_regime: [
    "Certidão de casamento / união estável e pacto antenupcial",
    "Certidões de nascimento dos herdeiros",
    "Escritura de união estável ou sentença que a reconheça",
    "Testamento (e certidão negativa de testamento, se não houver)",
    "Procurações dos herdeiros ao advogado, com poderes especiais",
    "Declaração de inexistência de incapazes e de litígio",
  ],
  imoveis: [
    "Matrículas atualizadas",
    "Certidão de ônus reais",
    "IPTU / ITR e CCIR",
    "Contratos de locação",
    "Avaliação ou valor venal para ITCMD",
  ],
  empresas: [
    "Contrato social e alterações",
    "Balanço / posição patrimonial da participação",
    "Certidões da pessoa jurídica",
  ],
  financeiro: [
    "Extratos e posição de investimentos na data do óbito",
    "Relação de veículos (CRLV/CRV) e outros bens móveis",
    "Apólices de seguro e previdência (fora ou dentro do inventário)",
    "Relação de dívidas, funerária e encargos do espólio",
  ],
  fiscal: [
    "Declaração de IR do falecido (espólio)",
    "Guias e simulação de ITCMD por UF",
    "Certidões negativas do falecido",
  ],
  cartorio: [
    "Certidão negativa de testamento (CENSEC)",
    "Informações do cartório do último domicílio e dos RIs envolvidos",
  ],
})

const INV_ETAPAS = itens("inventario_extrajudicial", "e", {
  familia_regime: [
    "Confirmar que todos são capazes, concordes, e que não há testamento conflitante (ou que o testamento já foi aberto e é compatível)",
    "Nomear inventariante convencional na escritura",
    "Mapear meação vs. herança conforme o regime",
  ],
  fiscal: [
    "Declarar o ITCMD em cada UF competente (imóvel no local; demais no domicílio)",
    "Recolher imposto e multa, se houver atraso além do prazo da UF",
    "Obter autorização / visto da Fazenda estadual, quando exigido",
  ],
  cartorio: [
    "Minutar escritura pública de inventário e partilha",
    "Lavrar no tabelionato com advogado presente",
    "Registrar a partilha nos RIs, Detran, Junta e instituições financeiras",
  ],
  operacao: [
    "Encerrar contas do falecido e abrir conta do espólio, se ainda preciso",
    "Entregar quitações e formal de partilha / escritura a cada herdeiro",
  ],
})

const INV_CONF = itens("inventario_extrajudicial", "c", {
  familia_regime: [
    "Não há herdeiro incapaz nem litígio",
    "Meação e quinhões batem com o regime e com o número de herdeiros",
    "Testamento, se existir, foi respeitado na parte disponível",
  ],
  fiscal: [
    "ITCMD pago (ou isento) em todas as UFs da competência",
    "Bens de previdência/seguro que não entram no inventário não foram tributados indevidamente",
  ],
  cartorio: [
    "Escritura registrada em todos os ofícios competentes",
    "Matrículas, Detran e QSA constam os novos titulares",
  ],
  financeiro: [
    "Bancos e custodiantes baixaram o bloqueio contra a escritura",
  ],
})

const ACORDO_DOCS = itens("acordo_socios", "d", {
  pessoais: [
    "Documentos de identidade dos sócios pessoas físicas",
    "Documentos societários dos sócios pessoas jurídicas",
  ],
  familia_regime: [
    "Regime de bens de cada sócio pessoa física",
    "Anuência de cônjuges, se o acordo dispõe sobre quotas comunicáveis",
    "Mapa de herdeiros que poderiam ingressar na sociedade",
  ],
  empresas: [
    "Contrato social / estatuto consolidado",
    "Acordo de quotistas anterior (para revogar ou conviver)",
    "Livro de quotas e atas recentes",
    "Organograma e lista de administradores",
    "Demonstrações financeiras e critério atual de apuração de haveres",
    "Procurações e regras de representação",
  ],
  financeiro: [
    "Mútuos, contas correntes de sócios e garantias cruzadas",
    "Dividendos / retirada praticados",
  ],
  governanca: [
    "Lista de matérias de quórum qualificado desejadas",
    "Regras pretendidas de tag along, drag along, shotgun e preferência",
    "Política de sucessor (herdeiro entra, vende, ou fica só na holding)",
  ],
  fiscal: [
    "Efeitos de ITCMD / ganho de capital em cláusula de opção e de haveres",
  ],
})

const ACORDO_ETAPAS = itens("acordo_socios", "e", {
  governanca: [
    "Diagnosticar pontos de bloqueio atuais (morte, divórcio, deadlock)",
    "Definir se o sucessor entra na operacional ou só na holding patrimonial",
    "Redigir quóruns, administração, não concorrência e confidencialidade",
    "Redigir preferência, tag/drag, valuation e pagamento de haveres",
    "Prever mediación / arbitragem e foro",
  ],
  empresas: [
    "Alinhar o acordo ao contrato social (remissão cruzada)",
    "Aprovar em reunião de sócios e colher assinaturas (e cônjuges)",
    "Arquivar na Junta quando o contrato social o exigir / for conveniente",
  ],
  familia_regime: [
    "Cruzar o acordo com testamento e doação de quotas",
    "Explicar à família o que acontece no falecimento de cada sócio",
  ],
  operacao: [
    "Depositar via original em local conhecido pelos administradores",
    "Revisar a cada alteração de quadro ou de casamento de sócio",
  ],
})

const ACORDO_CONF = itens("acordo_socios", "c", {
  empresas: [
    "Contrato social não contradiz o acordo (administração, cessão, haveres)",
    "Cláusula de sucessor está executável perante a Junta e o inventário",
    "Valuation e prazo de pagamento de haveres são operáveis (caixa da empresa)",
  ],
  familia_regime: [
    "Cônjuges anuentes quando necessário",
    "Testamento não manda ingressar herdeiro se o acordo manda vender",
  ],
  governanca: [
    "Deadlock tem saída (presidente, buy-sell ou arbitragem)",
  ],
  fiscal: [
    "Opções de compra/venda não geram fato gerador inesperado sem caixa",
  ],
})

const PREV_DOCS = itens("previdencia_sucessoria", "d", {
  pessoais: [
    "RG/CPF do titular e dos beneficiários",
    "Comprovante de residência e data de nascimento (tábua / capital)",
  ],
  familia_regime: [
    "Lista de herdeiros necessários vs. beneficiários pretendidos",
    "Regime de bens (reflexo em PGBL/VGBL e meação)",
    "Testamento e doações já feitas",
  ],
  previdencia: [
    "Propostas, regulamentos e extratos de PGBL e VGBL",
    "Tabela de IR (progressiva vs. regressiva) de cada plano",
    "Beneficiários atuais cadastrados na seguradora",
    "Portabilidades já realizadas e prazos de carência",
    "Capital segurado de cobertura de risco acoplada, se houver",
  ],
  financeiro: [
    "Fluxo de prêmio / contribuição e teto de caixa do titular",
    "Apólices de seguro de vida puras (fora da previdência)",
    "Reserva de emergência e liquidez para ITCMD de outros bens",
  ],
  fiscal: [
    "IRPF (Dedução de PGBL vs. teto legal)",
    "Posição de bens sujeitos a inventário vs. previdência",
    "UF de domicílio (tratamento de PGBL no ITCMD)",
  ],
  empresas: [
    "Se o prêmio é pago por PJ: contrato de trabalho / pró-labore e natureza da despesa",
  ],
})

const PREV_ETAPAS = itens("previdencia_sucessoria", "e", {
  previdencia: [
    "Separar o que é PGBL (geralmente espólio) do que é VGBL (geralmente fora do inventário)",
    "Revisar beneficiários: percentual, substitutos e menores",
    "Alinhar previdência com seguro de vida, testamento e holding",
    "Decidir portabilidade, contribuição extra ou resgate tático",
  ],
  fiscal: [
    "Simular IR no resgate vs. pensão / pecúlio aos beneficiários",
    "Checar se a UF tenta incluir VGBL na base de ITCMD e documentar a tese",
    "Usar PGBL só até o teto de dedução, se o objetivo for fiscal-anual",
  ],
  familia_regime: [
    "Explicar à família quem recebe previdência e quem herda o restante",
    "Prever caixa para ITCMD dos bens que continuam no inventário",
  ],
  operacao: [
    "Atualizar cadastro na seguradora e guardar via dos formulários",
    "Revisar beneficiários após casamento, divórcio ou nascimento",
  ],
})

const PREV_CONF = itens("previdencia_sucessoria", "c", {
  previdencia: [
    "Beneficiários na seguradora estão vigentes e somam 100%",
    "Tipo de plano (PGBL/VGBL) está correto para o objetivo sucessório",
    "Não há beneficiário falecido ou percentual em branco",
  ],
  fiscal: [
    "Tabela de IR e tempo de acumulação foram considerados",
    "PGBL não foi vendido como ‘sempre fora do inventário’",
  ],
  familia_regime: [
    "Meação e legítima dos demais bens continuam cobertas (previdência não substitui testamento)",
  ],
  operacao: [
    "Família sabe qual instituição ligar e quais documentos levar no sinistro / resgate",
  ],
})

export const ROTEIROS: Record<TipoRoteiro, DefinicaoRoteiro> = {
  holding_patrimonial: {
    tipo: "holding_patrimonial",
    label: TIPO_ROTEIRO_LABEL.holding_patrimonial,
    documentos: HOLDING_DOCS,
    etapas: HOLDING_ETAPAS,
    conferencias: HOLDING_CONF,
  },
  doacao_usufruto: {
    tipo: "doacao_usufruto",
    label: TIPO_ROTEIRO_LABEL.doacao_usufruto,
    documentos: DOACAO_DOCS,
    etapas: DOACAO_ETAPAS,
    conferencias: DOACAO_CONF,
  },
  testamento: {
    tipo: "testamento",
    label: TIPO_ROTEIRO_LABEL.testamento,
    documentos: TESTAMENTO_DOCS,
    etapas: TESTAMENTO_ETAPAS,
    conferencias: TESTAMENTO_CONF,
  },
  inventario_extrajudicial: {
    tipo: "inventario_extrajudicial",
    label: TIPO_ROTEIRO_LABEL.inventario_extrajudicial,
    documentos: INV_DOCS,
    etapas: INV_ETAPAS,
    conferencias: INV_CONF,
  },
  acordo_socios: {
    tipo: "acordo_socios",
    label: TIPO_ROTEIRO_LABEL.acordo_socios,
    documentos: ACORDO_DOCS,
    etapas: ACORDO_ETAPAS,
    conferencias: ACORDO_CONF,
  },
  previdencia_sucessoria: {
    tipo: "previdencia_sucessoria",
    label: TIPO_ROTEIRO_LABEL.previdencia_sucessoria,
    documentos: PREV_DOCS,
    etapas: PREV_ETAPAS,
    conferencias: PREV_CONF,
  },
}

export function todosItens(def: DefinicaoRoteiro): ItemRoteiro[] {
  return [...def.documentos, ...def.etapas, ...def.conferencias]
}

export function idsRoteiroDoTipo(tipo: TipoRoteiro): string[] {
  return todosItens(ROTEIROS[tipo]).map((i) => i.id)
}

export function isTipoRoteiro(v: unknown): v is TipoRoteiro {
  return typeof v === "string" && (TIPOS_ROTEIRO as string[]).includes(v)
}

export type ProgressoCategoria = { feitos: number; total: number }

export function progressoRoteiro(
  def: DefinicaoRoteiro,
  concluidos: Set<string>,
): {
  documentos: ProgressoCategoria
  etapas: ProgressoCategoria
  conferencias: ProgressoCategoria
  total: ProgressoCategoria
} {
  const conta = (lista: ItemRoteiro[]) => ({
    feitos: lista.filter((i) => concluidos.has(i.id)).length,
    total: lista.length,
  })
  const documentos = conta(def.documentos)
  const etapas = conta(def.etapas)
  const conferencias = conta(def.conferencias)
  return {
    documentos,
    etapas,
    conferencias,
    total: {
      feitos: documentos.feitos + etapas.feitos + conferencias.feitos,
      total: documentos.total + etapas.total + conferencias.total,
    },
  }
}

export function agruparPorTema(itensLista: ItemRoteiro[]): { tema: TemaRoteiro; itens: ItemRoteiro[] }[] {
  const ordem: TemaRoteiro[] = [
    "pessoais",
    "familia_regime",
    "imoveis",
    "empresas",
    "financeiro",
    "fiscal",
    "previdencia",
    "internacional",
    "governanca",
    "cartorio",
    "operacao",
  ]
  const map = new Map<TemaRoteiro, ItemRoteiro[]>()
  for (const item of itensLista) {
    const lista = map.get(item.tema) ?? []
    lista.push(item)
    map.set(item.tema, lista)
  }
  return ordem.filter((t) => map.has(t)).map((tema) => ({ tema, itens: map.get(tema)! }))
}

export function textoPendencias(
  def: DefinicaoRoteiro,
  concluidos: Set<string>,
): string {
  const blocos: { titulo: string; lista: ItemRoteiro[] }[] = [
    { titulo: "Documentos a pedir", lista: def.documentos },
    { titulo: "Etapas", lista: def.etapas },
    { titulo: "Conferências", lista: def.conferencias },
  ]
  const linhas: string[] = [`${def.label} — lista de pendências`, ""]
  for (const bloco of blocos) {
    const pendentes = bloco.lista.filter((i) => !concluidos.has(i.id))
    if (pendentes.length === 0) continue
    linhas.push(bloco.titulo)
    for (const grupo of agruparPorTema(pendentes)) {
      linhas.push(`  ${TEMA_LABEL[grupo.tema]}`)
      for (const item of grupo.itens) {
        linhas.push(`  - [ ] ${item.titulo}`)
      }
    }
    linhas.push("")
  }
  if (linhas.length <= 2) return `${def.label} — não há pendências.`
  return linhas.join("\n").trim() + "\n"
}
