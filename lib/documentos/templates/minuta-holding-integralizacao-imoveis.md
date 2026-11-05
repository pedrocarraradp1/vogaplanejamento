---
{
  "id": "minuta-holding-integralizacao-imoveis",
  "titulo": "Minuta de holding com integralização de imóveis e nua-propriedade",
  "campos": [
    { "chave": "razaoSocial", "label": "Razão social da holding", "tipo": "texto" },
    { "chave": "cnpj", "label": "CNPJ", "tipo": "cnpj" },
    { "chave": "nomeSocio", "label": "Nome do sócio doador", "tipo": "texto", "origem": "cliente.nome" },
    { "chave": "cpfSocio", "label": "CPF", "tipo": "cpf", "origem": "cliente.cpf" },
    { "chave": "estadoCivil", "label": "Estado civil", "tipo": "texto", "origem": "cliente.estadoCivil" },
    { "chave": "conjuge", "label": "Cônjuge", "tipo": "texto", "origem": "cliente.conjuge" },
    { "chave": "enderecoSocio", "label": "Endereço", "tipo": "texto", "origem": "cliente.endereco" },
    { "chave": "donatario", "label": "Nome do nu-proprietário (donatário)", "tipo": "texto" },
    { "chave": "cpfDonatario", "label": "CPF do donatário", "tipo": "cpf" },
    { "chave": "matricula", "label": "Matrícula do imóvel", "tipo": "texto" },
    { "chave": "cartorioImoveis", "label": "Cartório de Registro de Imóveis", "tipo": "texto" },
    { "chave": "descricaoImovel", "label": "Descrição do imóvel", "tipo": "textarea" },
    { "chave": "valorImovel", "label": "Valor de integralização (R$)", "tipo": "moeda" },
    { "chave": "percentualNua", "label": "Percentual da nua-propriedade (%)", "tipo": "texto" },
    { "chave": "uf", "label": "UF (ITCMD / ITBI)", "tipo": "uf", "origem": "cliente.uf" },
    { "chave": "cidade", "label": "Cidade", "tipo": "texto", "origem": "cliente.cidade" },
    { "chave": "data", "label": "Data", "tipo": "data" }
  ]
}
---

MINUTA — CONSTITUIÇÃO DE HOLDING COM INTEGRALIZAÇÃO DE IMÓVEL E DOAÇÃO DA NUA-PROPRIEDADE

1. {{nomeSocio}}, {{estadoCivil}}, CPF {{cpfSocio}}, residente em {{enderecoSocio}}, na qualidade de sócio de {{razaoSocial}}, CNPJ {{cnpj}}, integraliza ao capital social o imóvel objeto da matrícula {{matricula}} do {{cartorioImoveis}}, assim descrito: {{descricaoImovel}}, pelo valor de {{valorImovel}} ({{valorImovel_extenso}}).

2. A integralização opera-se pela conferência da propriedade plena ao capital da holding, com averbação na matrícula, observadas as regras de ITBI da {{uf}} e a tese de imunidade/não incidência, quando cabível.

3. Em ato subsequente, {{nomeSocio}} doa a {{donatario}}, CPF {{cpfDonatario}}, a nua-propriedade correspondente a {{percentualNua}}% das quotas de {{razaoSocial}}, reservando para si o usufruto vitalício, com direito aos frutos e ao voto.

4. O cônjuge {{conjuge}} anui, na forma do regime de bens. O ITCMD da doação de quotas será recolhido na {{uf}} do domicílio do doador, salvo competência diversa.

5. Encaminhar ao RI a petição de registro da integralização e, à Junta Comercial, a alteração contratual.

{{cidade}}/{{uf}}, {{data}}

{{nomeSocio}}                    {{donatario}}
CPF {{cpfSocio}}                 CPF {{cpfDonatario}}
Anuência: {{conjuge}}
