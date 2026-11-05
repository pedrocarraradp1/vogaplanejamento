import { extrairCampos, preencherTexto } from "./preencher"

export type InstrumentoClausula = "contrato_social_holding" | "doacao_testamento"

export type ClausulaModelo = {
  id: string
  instrumento: InstrumentoClausula
  ordem: number
  titulo: string
  paraQueServe: string
  quandoUsar: string
  texto: string
  observacaoLegal: string
}

export const INSTRUMENTO_LABEL: Record<InstrumentoClausula, string> = {
  contrato_social_holding: "Contrato social da holding",
  doacao_testamento: "Doação / testamento",
}

export const CLAUSULAS: ClausulaModelo[] = [
  {
    id: "objeto-social",
    instrumento: "contrato_social_holding",
    ordem: 1,
    titulo: "Objeto social",
    paraQueServe:
      "Delimita o que a holding pode fazer (participações, imóveis, administração de bens próprios) e reduz risco de desvio de finalidade.",
    quandoUsar:
      "Em toda constituição de holding patrimonial; ajustar se houver atividade operacional mista.",
    texto:
      "A sociedade tem por objeto a participação no capital de outras sociedades, civis ou comerciais, simples ou empresárias, no País ou no exterior, bem como a administração de bens próprios, inclusive imóveis, e a exploração de seus frutos, sem o exercício habitual de atividade imobiliária. A sociedade poderá, ainda, prestar serviços de apoio administrativo exclusivamente às sociedades de que participar. Qualquer alteração do objeto dependerá de deliberação dos sócios que representem, no mínimo, {{quorum}} do capital social, lavrada em alteração contratual.",
    observacaoLegal:
      "Código Civil, art. 997, II e IV, e art. 981: o objeto e a atividade devem constar do contrato; a holding patrimonial não se confunde com incorporação imobiliária habitual.",
  },
  {
    id: "administracao",
    instrumento: "contrato_social_holding",
    ordem: 2,
    titulo: "Administração",
    paraQueServe:
      "Define quem representa a sociedade, o mandato, os limites de alçada e a sucessão da gestão.",
    quandoUsar:
      "Sempre; essencial quando o patriarca reserva a gestão via usufruto ou cargo de administrador.",
    texto:
      "A administração da sociedade caberá a {{administrador}}, {{nacionalidade}}, {{estado_civil}}, inscrito no CPF sob o nº {{cpf}}, com endereço em {{endereco}}, com prazo de mandato {{prazo}}, permitida a recondução. O administrador representará a sociedade ativa e passivamente, em juízo ou fora dele, e praticará todos os atos necessários à gestão ordinária. Ficam sujeitos à prévia autorização dos sócios que representem {{quorum}} do capital: (i) alienação ou oneração de imóvel; (ii) fiança, aval ou garantia em favor de terceiros; (iii) endividamento acima de {{valor}}; e (iv) alteração da política de distribuição de lucros. A cessação do cargo não implica dissolução da sociedade.",
    observacaoLegal:
      "Código Civil, arts. 1.011 a 1.017 e 1.060 a 1.065: administração, deveres e responsabilidade do administrador da limitada.",
  },
  {
    id: "quotas-restricoes",
    instrumento: "contrato_social_holding",
    ordem: 3,
    titulo: "Quotas — restrições à circulação",
    paraQueServe:
      "Trava a entrada de terceiros e de herdeiros na operacional, canalizando a sucessão para a holding.",
    quandoUsar:
      "Quando se deseja direito de preferência amplo e vedação de penhora/cessão informal das quotas.",
    texto:
      "O capital social é dividido em quotas iguais, indivisíveis em relação à sociedade. É vedada a cessão, penhor, usufruto, fideicomisso ou qualquer oneração de quotas a terceiros estranhos ao quadro social sem a anuência prévia dos sócios que representem {{quorum}} do capital, ressalvado o disposto neste contrato quanto à sucessão causa mortis. Qualquer negócio jurídico que viole esta cláusula é ineficaz perante a sociedade. As quotas de {{nome}} correspondentes a {{percentual}}% do capital observam, ainda, as restrições de incomunicabilidade e impenhorabilidade eventualmente averbadas no instrumento de doação.",
    observacaoLegal:
      "Código Civil, art. 1.056 e art. 1.057: a cessão de quotas a estranhos depende de previsão contratual e pode ser restringida.",
  },
  {
    id: "quotas-gravames",
    instrumento: "contrato_social_holding",
    ordem: 4,
    titulo: "Quotas — gravames (usufruto e garantia)",
    paraQueServe:
      "Regula usufruto de quotas (voto e dividendos com o usufrutuário) e a constituição de garantia sobre a participação.",
    quandoUsar:
      "Doação de nua-propriedade com reserva de usufruto; mútuos com garantia de quotas.",
    texto:
      "Poderá ser instituído usufruto sobre as quotas, total ou parcialmente, por instrumento público ou particular com firma reconhecida, averbado no livro de quotistas e na Junta Comercial. Salvo disposição em contrário no instrumento de usufruto, o usufrutuário exercerá o direito de voto e perceberá os lucros, cabendo ao nu-proprietário o valor patrimonial em caso de apuração de haveres. A constituição de penhor ou alienação fiduciária de quotas depende de anuência dos sócios representando {{quorum}} do capital e não transfere a qualidade de sócio ao credor, que não participará de deliberações.",
    observacaoLegal:
      "Código Civil, arts. 1.390 a 1.411 (usufruto) e 1.431 e ss. (penhor); a averbação torna o gravame oponível à sociedade e a terceiros.",
  },
  {
    id: "quotas-divorcio",
    instrumento: "contrato_social_holding",
    ordem: 5,
    titulo: "Quotas — divórcio e meação",
    paraQueServe:
      "Impede que o ex-cônjuge ingresse no quadro social, convertendo a meação em haveres em dinheiro.",
    quandoUsar:
      "Famílias com holding e regime de comunhão; combinar com doação incomunicável quando possível.",
    texto:
      "Na hipótese de divórcio, dissolução de união estável ou partilha em vida que recaia sobre quotas de {{razao_social}}, o cônjuge ou companheiro meeiro não ingressará no quadro social. A meação, se reconhecida, será satisfeita em dinheiro, segundo o critério de apuração de haveres deste contrato, em até {{prazo}}, sem que o meeiro exerça voto, fiscalização ou direito de preferência. Os sócios remanescentes terão preferência para adquirir as quotas equivalentes à meação. {{nome}} declara que o cônjuge {{conjuge}} está ciente desta cláusula, na forma do regime de {{estado_civil}}.",
    observacaoLegal:
      "Código Civil, arts. 1.659, I, 1.668 e 1.027: bens incomunicáveis e efeitos da dissolução da sociedade conjugal sobre quotas; a cláusula não afasta meação devida, mas pode impedir o ingresso na sociedade.",
  },
  {
    id: "cessao-preferencia",
    instrumento: "contrato_social_holding",
    ordem: 6,
    titulo: "Cessão e direito de preferência",
    paraQueServe:
      "Organiza a venda de quotas entre sócios (e, se autorizado, a terceiros) com prazos e matching de preço.",
    quandoUsar:
      "Sempre que houver mais de um sócio; base do acordo de quotistas.",
    texto:
      "O sócio que pretenda ceder quotas a outro sócio ou a terceiro apresentará notificação escrita à sociedade e aos demais sócios, indicando quantidade, preço, forma de pagamento e o cessionário. Os sócios terão {{prazo}} para exercer a preferência, na proporção de suas quotas, ou para recusar o ingresso do terceiro. Silêncio importa recusa da cessão a estranhos. Averbada a cessão, a sociedade arquivará alteração contratual na Junta Comercial no prazo legal. É ineficaz a cessão feita em desacordo com esta cláusula.",
    observacaoLegal:
      "Código Civil, art. 1.057, parágrafo único: a omissão do contrato implica preferência dos sócios e possibilidade de recusa ao estranho.",
  },
  {
    id: "sucessao-socio",
    instrumento: "contrato_social_holding",
    ordem: 7,
    titulo: "Sucessão causa mortis do sócio",
    paraQueServe:
      "Define se o herdeiro entra na sociedade ou se recebe haveres, evitando condomínio acidental de quotas.",
    quandoUsar:
      "Holding familiar; alinhar com testamento e acordo de sócios.",
    texto:
      "Falecido o sócio, a sociedade não se dissolve. Os herdeiros e o cônjuge meeiro de {{nome}} não adquirem, de pleno direito, a qualidade de sócio. Poderão ser admitidos apenas se os sócios remanescentes, representando {{quorum}} do capital, os aceitarem em até {{prazo}} da ciência do óbito, e desde que o ingresso seja compatível com o acordo de sócios e com o testamento. Não havendo admissão, proceder-se-á à apuração de haveres na forma deste contrato, pagos ao espólio ou aos sucessores. O usufruto de quotas, se instituído, extingue-se com a morte do usufrutuário, consolidando-se a propriedade plena no nu-proprietário já sócio.",
    observacaoLegal:
      "Código Civil, art. 1.028: o contrato pode regular a sucessão das quotas; na omissão, os herdeiros substituem o falecido, o que em regra se quer evitar na holding familiar.",
  },
  {
    id: "exclusao-socio",
    instrumento: "contrato_social_holding",
    ordem: 8,
    titulo: "Exclusão de sócio",
    paraQueServe:
      "Permite retirar sócio que ponha em risco a empresa (justa causa) sem dissolver a holding.",
    quandoUsar:
      "Sociedade com mais de um sócio; combinar com apuração de haveres.",
    texto:
      "O sócio pode ser excluído por justa causa quando praticar atos de inegável gravidade que ponham em risco a continuidade da sociedade, inclusive violação reiterada deste contrato, concorrência desleal, desvio de bens sociais ou recusa injustificada de cumprir deliberações. A exclusão será deliberada pelos sócios que representem mais da metade do capital, reunidos em reunião especialmente convocada, assegurado o contraditório. Excluído o sócio, suas quotas serão liquidadas pelo critério de haveres deste contrato, em {{prazo}}, sem que o excluído vote na deliberação. A exclusão de sócio minoritário observa o art. 1.085 do Código Civil.",
    observacaoLegal:
      "Código Civil, arts. 1.030 e 1.085: exclusão judicial por falta grave e exclusão de minoritário por justa causa prevista no contrato, em reunião especialmente convocada.",
  },
  {
    id: "apuracao-haveres",
    instrumento: "contrato_social_holding",
    ordem: 9,
    titulo: "Apuração de haveres",
    paraQueServe:
      "Fixa o preço de saída (morte, exclusão, exercício, recesso) para não paralisar a sociedade nem litigar sobre o valor.",
    quandoUsar:
      "Toda limitada familiar; o critério contábil vs. econômico muda o caixa.",
    texto:
      "Em qualquer hipótese de apuração de haveres (morte, exclusão, recesso, exercício ou não admissão de sucessor), o valor das quotas será o patrimônio líquido da sociedade, segundo o último balanço especialmente levantado na data do evento, incluindo haveres e obrigações a valor presente e excluindo ágio especulativo. Não se aplicará, salvo deliberação unânime, critério de fluxo de caixa descontado. O pagamento far-se-á em dinheiro, em até {{prazo}}, em parcelas iguais, corrigidas pelo IPCA, vencendo a primeira em 90 (noventa) dias. Até o pagamento, o credor dos haveres não exerce direitos societários.",
    observacaoLegal:
      "Código Civil, art. 1.031: os haveres são apurados com base na situação patrimonial à data da resolução, salvo critério diverso previsto no contrato.",
  },
  {
    id: "acordo-socios",
    instrumento: "contrato_social_holding",
    ordem: 10,
    titulo: "Acordo de sócios (remissão)",
    paraQueServe:
      "Dá eficácia interna ao acordo de quotistas (voto, lock-up, tag/drag) e manda arquivá-lo.",
    quandoUsar:
      "Quando houver acordo paralelo; evita conflito com o contrato social.",
    texto:
      "Os sócios poderão celebrar acordo de quotistas, por escrito, para regular exercício de voto, administração, preferência, tag along, drag along e sucessão. O acordo será arquivado na sede e, quando conveniente, na Junta Comercial, tornando-se oponível à sociedade na forma do art. 118 da Lei 6.404/1976, aplicado analogicamente às limitadas. Em caso de divergência, prevalece o contrato social quanto à oponibilidade a terceiros e o acordo quanto às obrigações de fazer entre os sócios. {{nome}} e os demais sócios de {{razao_social}}, CNPJ {{cnpj}}, obrigam-se a votar nas reuniões em conformidade com o acordo vigente.",
    observacaoLegal:
      "Lei 6.404/1976, art. 118 (aplicação analógica) e Código Civil, art. 421-A: pactos parassociais são lícitos e devem ser observados de boa-fé, sem contradizer normas cogentes do contrato.",
  },
  {
    id: "usufruto-vitalicio",
    instrumento: "doacao_testamento",
    ordem: 11,
    titulo: "Usufruto vitalício",
    paraQueServe:
      "O doador (ou testador) retiene os frutos e, em regra, o voto, doando só a nua-propriedade.",
    quandoUsar:
      "Doação de quotas ou imóvel em vida, com o patriarca precisando de renda e controle.",
    texto:
      "{{nome}}, {{nacionalidade}}, {{estado_civil}}, CPF {{cpf}}, residente em {{endereco}}, reserva para si, vitaliciamente, o usufruto do bem ora transmitido a {{donatario}}, CPF {{donatario_cpf}}, consistente em {{bem}}. O usufrutuário perceberá todos os frutos e rendimentos, inclusive aluguéis e dividendos, e exercerá os direitos de voto e de administração inerentes ao bem, na forma do art. 1.394 do Código Civil. Extinto o usufruto pela morte do usufrutuário, consolida-se a propriedade plena em {{donatario}}, independentemente de novo pagamento de ITCMD sobre a consolidação, salvo disposição fiscal superveniente da {{uf}}.",
    observacaoLegal:
      "Código Civil, arts. 1.390, 1.394 e 1.410, I: o usufruto pode recair sobre bens móveis e imóveis e extingue-se pela morte do usufrutuário quando vitalício.",
  },
  {
    id: "incomunicabilidade",
    instrumento: "doacao_testamento",
    ordem: 12,
    titulo: "Incomunicabilidade",
    paraQueServe:
      "O bem doado ou legado não entra na comunhão do donatário/herdeiro, protegendo-o em casamento futuro.",
    quandoUsar:
      "Doação a filhos casados ou que possam casar em comunhão; testamento da parte disponível.",
    texto:
      "A doação (ou o legado) de {{bem}} feita por {{nome}} a {{donatario}} é incomunicável, não integrando a comunhão ou a meação do donatário ou de seu cônjuge/companheiro, qualquer que seja o regime de bens, presente ou futuro, inclusive união estável. A incomunicabilidade recai sobre o bem e sobre os sub-rogados em seu lugar. {{donatario}} e seu cônjuge {{conjuge}} declaram ciência. A cláusula será averbada no registro competente (RI ou Junta).",
    observacaoLegal:
      "Código Civil, art. 1.668, I, e art. 1.848: são incomunicáveis os bens doados ou herdados com cláusula de incomunicabilidade, que o testador/doador pode impor na parte disponível.",
  },
  {
    id: "impenhorabilidade",
    instrumento: "doacao_testamento",
    ordem: 13,
    titulo: "Impenhorabilidade",
    paraQueServe:
      "Dificulta que credores particulares do donatário atinjam o bem de família sucessória.",
    quandoUsar:
      "Junto com inalienabilidade/incomunicabilidade; não vale contra dívidas próprias do doador nem obrigações alimentares em todos os casos.",
    texto:
      "O bem {{bem}}, transmitido por {{nome}} a {{donatario}}, é impenhorável em relação a dívidas contraídas pelo donatário após esta liberalidade, ressalvadas as hipóteses legais de impenhorabilidade ineficaz (obrigação propter rem, tributos do próprio bem, e outras previstas em lei). A cláusula não aproveita ao doador quanto a suas próprias dívidas anteriores. Averbar-se-á no registro do bem.",
    observacaoLegal:
      "Código Civil, art. 1.848 e art. 1.911: o doador/testador pode impor impenhorabilidade na parte disponível; a eficácia contra credores observa limites da legislação processual e tributária.",
  },
  {
    id: "inalienabilidade",
    instrumento: "doacao_testamento",
    ordem: 14,
    titulo: "Inalienabilidade",
    paraQueServe:
      "Impede a venda do bem pelo donatário enquanto durar a cláusula (vitalícia ou temporária).",
    quandoUsar:
      "Quando se quer preservar o imóvel/quotas na família; usar com moderação (engessa liquidez e ITCMD futuro).",
    texto:
      "{{nome}} impõe ao bem {{bem}} a cláusula de inalienabilidade, pelo prazo {{prazo}}, vedada a venda, dação, conferência ao capital ou qualquer disposição inter vivos por {{donatario}}, salvo autorização judicial por necessidade econômica grave ou anuência escrita do doador enquanto vivo. A inalienabilidade não impede a constituição de usufruto em favor de descendente, se autorizada neste instrumento. A cláusula será registrada.",
    observacaoLegal:
      "Código Civil, arts. 1.848 e 1.911: a inalienabilidade imposta pelo testador/doador na parte disponível é lícita; sobre a legítima, exige-se justa causa declarada no testamento (art. 1.848).",
  },
  {
    id: "reversao",
    instrumento: "doacao_testamento",
    ordem: 15,
    titulo: "Reversão",
    paraQueServe:
      "Se o donatário morrer antes do doador, o bem volta ao patrimônio do doador, fora do inventário do donatário.",
    quandoUsar:
      "Doação a filho único ou quando se quer evitar que o cônjuge do donatário herde o bem doado.",
    texto:
      "Se {{donatario}} falecer antes de {{nome}}, o bem {{bem}} e seus sub-rogados reverterão automaticamente ao patrimônio do doador, livres e desembaraçados, sem integração ao inventário do donatário e sem meação do cônjuge sobrevivente do donatário. A reversão opera de pleno direito, cabendo averbação no registro. Não havendo reversão pactuada, aplica-se a regra geral da doação pura.",
    observacaoLegal:
      "Código Civil, art. 547: o doador pode estipular que os bens voltem ao seu patrimônio se sobreviver ao donatário; cláusula clássica de proteção geracional.",
  },
  {
    id: "dispensa-colacao",
    instrumento: "doacao_testamento",
    ordem: 16,
    titulo: "Dispensa de colação",
    paraQueServe:
      "Tira a doação da conta da legítima, imputando-a na parte disponível — se esta comportar o valor.",
    quandoUsar:
      "Doações desiguais entre filhos; só é eficaz até o limite da disponível (verificar tesouro da disponível).",
    texto:
      "{{nome}} declara que a presente doação de {{bem}}, no valor de {{valor}}, a {{donatario}} é feita com expressa dispensa de colação, imputando-se na parte disponível de seu patrimônio, nos termos dos arts. 2.005 e 2.006 do Código Civil. Os demais herdeiros necessários terão a legítima apurada sobre o restante. Se, no momento da abertura da sucessão, a disponível não comportar o valor, o excesso colacionar-se-á. Esta declaração consta do instrumento público.",
    observacaoLegal:
      "Código Civil, arts. 2.002 a 2.012: as doações aos herdeiros necessários importam adiantamento de legítima, salvo dispensa de colação na disponível.",
  },
  {
    id: "substituicao",
    instrumento: "doacao_testamento",
    ordem: 17,
    titulo: "Substituição (vulgar / fideicomisso)",
    paraQueServe:
      "Indica quem recebe se o primeiro contemplado não puder ou não quiser; ou programa duas gerações (fiduciário e fideicomissário).",
    quandoUsar:
      "Testamento com netos menores; evitar caducidade do legado.",
    texto:
      "Se {{donatario}} pré-morrer ao testador {{nome}}, repudiar a liberalidade ou for excluído da sucessão, será substituído por {{herdeiro}}, a quem se transmite {{bem}} com as mesmas cláusulas. Não se institui fideicomisso além de um grau. O substituto ocupa a posição do substituído para todos os efeitos, inclusive gravames de incomunicabilidade. {{nome}}, CPF {{cpf}}, declara esta a sua vontade na parte disponível.",
    observacaoLegal:
      "Código Civil, arts. 1.947 a 1.960: substituição vulgar e fideicomissária; o fideicomisso não pode passar da segunda geração (art. 1.959 c/c 1.952).",
  },
  {
    id: "legado",
    instrumento: "doacao_testamento",
    ordem: 18,
    titulo: "Legado",
    paraQueServe:
      "Destina bem certo a pessoa determinada, fora da partilha residual da herança.",
    quandoUsar:
      "Imóvel de moradia, obra de arte, quotas específicas; cuidar da legítima.",
    texto:
      "{{nome}}, na parte disponível de seus bens, lega a {{herdeiro}} o seguinte bem: {{bem}}, livre de dívidas do espólio que não lhe sejam propter rem, com as cláusulas eventualmente impostas neste testamento. O legado será entregue pelo inventariante em até {{prazo}} após o trânsito em julgado da partilha ou da lavratura da escritura de inventário, respondendo o espólio pelos frutos desde a abertura da sucessão, na forma do art. 1.923 do Código Civil. Se o bem não existir no espólio, caduca o legado, salvo sub-rogação expressa.",
    observacaoLegal:
      "Código Civil, arts. 1.912 a 1.940: o legado recai sobre coisa certa; caduca nas hipóteses legais (pré-morte, alienação pelo testador, perecimento).",
  },
  {
    id: "testamenteiro",
    instrumento: "doacao_testamento",
    ordem: 19,
    titulo: "Nomeação de testamenteiro",
    paraQueServe:
      "Alguém com dever de cumprir o testamento, defender a validade e prestar contas.",
    quandoUsar:
      "Testamento com vários legados, fundação, ou conflito familiar previsível.",
    texto:
      "{{nome}} nomeia testamenteiro a {{administrador}}, CPF {{cpf}}, podendo recusar o encargo. Na recusa, morte ou impedimento, substitui-o {{herdeiro}}. O testamenteiro velará pelo cumprimento deste testamento, promoverá o registro e a defesa de sua validade, e prestará contas em {{prazo}}. A remuneração será a prevista em lei, salvo renúncia. Os herdeiros e o inventariante prestarão ao testamenteiro as informações necessárias. Esta nomeação não dispensa inventário, judicial ou extrajudicial.",
    observacaoLegal:
      "Código Civil, arts. 1.976 a 1.990: o testador pode nomear testamenteiro; o encargo é recusável e implica dever de cumprimento do testamento e prestação de contas.",
  },
]

export function clausulaPorId(id: string): ClausulaModelo | undefined {
  return CLAUSULAS.find((c) => c.id === id)
}

export function camposDasClausulas(ids: string[]): string[] {
  const textos = ids
    .map((id) => clausulaPorId(id)?.texto ?? "")
    .join("\n")
  return extrairCampos(textos)
}

export function montarMinutaClausulas(
  ids: string[],
  campos: Record<string, string>,
): string {
  const escolhidas = CLAUSULAS.filter((c) => ids.includes(c.id)).sort((a, b) => {
    if (a.instrumento !== b.instrumento) {
      return a.instrumento === "contrato_social_holding" ? -1 : 1
    }
    return a.ordem - b.ordem
  })
  const blocos: string[] = []
  let instrumentoAtual: InstrumentoClausula | null = null
  for (const c of escolhidas) {
    if (c.instrumento !== instrumentoAtual) {
      instrumentoAtual = c.instrumento
      blocos.push(`# ${INSTRUMENTO_LABEL[c.instrumento]}`)
    }
    blocos.push(`## ${c.titulo}\n\n${preencherTexto(c.texto, campos)}`)
  }
  return blocos.join("\n\n")
}
