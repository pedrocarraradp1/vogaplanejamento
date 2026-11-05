---
{
  "id": "procuracao-imunidade-itbi",
  "titulo": "Procuração para imunidade de ITBI",
  "campos": [
    { "chave": "nomeSocio", "label": "Outorgante", "tipo": "texto", "origem": "cliente.nome" },
    { "chave": "cpfSocio", "label": "CPF / CNPJ do outorgante", "tipo": "cpf", "origem": "cliente.cpf" },
    { "chave": "enderecoSocio", "label": "Endereço do outorgante", "tipo": "texto", "origem": "cliente.endereco" },
    { "chave": "estadoCivil", "label": "Estado civil", "tipo": "texto", "origem": "cliente.estadoCivil" },
    { "chave": "conjuge", "label": "Cônjuge", "tipo": "texto", "origem": "cliente.conjuge" },
    { "chave": "outorgado", "label": "Outorgado (advogado / procurador)", "tipo": "texto" },
    { "chave": "oab", "label": "OAB do outorgado", "tipo": "texto" },
    { "chave": "razaoSocial", "label": "Holding / adquirente", "tipo": "texto" },
    { "chave": "cnpj", "label": "CNPJ da holding", "tipo": "cnpj" },
    { "chave": "matricula", "label": "Matrícula(s)", "tipo": "texto" },
    { "chave": "municipio", "label": "Município do ITBI", "tipo": "texto", "origem": "cliente.cidade" },
    { "chave": "data", "label": "Data", "tipo": "data" }
  ]
}
---

PROCURAÇÃO PÚBLICA / PARTICULAR

OUTORGANTE: {{nomeSocio}}, {{estadoCivil}}, CPF {{cpfSocio}}, residente em {{enderecoSocio}}, na qualidade de sócio administrador de {{razaoSocial}}, CNPJ {{cnpj}}, e cônjuge {{conjuge}}, quando exigido.

OUTORGADO: {{outorgado}}, inscrito na OAB sob o nº {{oab}}.

PODERES: representar o outorgante perante a Secretaria de Finanças do Município de {{municipio}} e órgãos vinculados, para requerer o reconhecimento da IMUNIDADE / NÃO INCIDÊNCIA de ITBI na integralização do(s) imóvel(is) de matrícula {{matricula}} ao capital de {{razaoSocial}}, apresentar documentos, interpor recurso administrativo, tomar ciência de despachos, desistir e transigir em matéria administrativa, e assinar o que for preciso ao fiel cumprimento deste mandato, inclusive substabelecer.

{{municipio}}, {{data}}.

{{nomeSocio}}
CPF {{cpfSocio}}
