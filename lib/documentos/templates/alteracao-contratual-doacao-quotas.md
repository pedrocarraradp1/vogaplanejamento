---
{
  "id": "alteracao-contratual-doacao-quotas",
  "titulo": "Alteração contratual com doação de quotas",
  "campos": [
    { "chave": "razaoSocial", "label": "Razão social", "tipo": "texto" },
    { "chave": "cnpj", "label": "CNPJ", "tipo": "cnpj" },
    { "chave": "nire", "label": "NIRE", "tipo": "texto" },
    { "chave": "nomeSocio", "label": "Doador (sócio)", "tipo": "texto", "origem": "cliente.nome" },
    { "chave": "cpfSocio", "label": "CPF do doador", "tipo": "cpf", "origem": "cliente.cpf" },
    { "chave": "estadoCivil", "label": "Estado civil", "tipo": "texto", "origem": "cliente.estadoCivil" },
    { "chave": "conjuge", "label": "Cônjuge do doador", "tipo": "texto", "origem": "cliente.conjuge" },
    { "chave": "donatario", "label": "Donatário", "tipo": "texto" },
    { "chave": "cpfDonatario", "label": "CPF do donatário", "tipo": "cpf" },
    { "chave": "quotasDoadas", "label": "Número de quotas doadas", "tipo": "texto" },
    { "chave": "percentual", "label": "Percentual do capital (%)", "tipo": "texto" },
    { "chave": "valorQuotas", "label": "Valor atribuído às quotas (R$)", "tipo": "moeda" },
    { "chave": "uf", "label": "UF do ITCMD", "tipo": "uf", "origem": "cliente.uf" },
    { "chave": "data", "label": "Data da alteração", "tipo": "data" }
  ]
}
---

ALTERAÇÃO DO CONTRATO SOCIAL DE {{razaoSocial}}
CNPJ {{cnpj}} — NIRE {{nire}}

Os sócios resolvem:

CLÁUSULA 1. {{nomeSocio}}, {{estadoCivil}}, CPF {{cpfSocio}}, doa a {{donatario}}, CPF {{cpfDonatario}}, {{quotasDoadas}} quotas, representativas de {{percentual}}% do capital social, no valor de {{valorQuotas}} ({{valorQuotas_extenso}}), com reserva de usufruto vitalício em favor do doador, cláusulas de incomunicabilidade, impenhorabilidade e reversão, conforme escritura de doação em apartado.

CLÁUSULA 2. Em razão da doação, o quadro de quotistas passa a ser:
- {{nomeSocio}} — nua-propriedade / usufruto conforme instrumento;
- {{donatario}} — nua-propriedade das quotas doadas.

CLÁUSULA 3. O cônjuge {{conjuge}} anui à doação. O ITCMD será recolhido na {{uf}}.

CLÁUSULA 4. A administração permanece inalterada, cabendo o voto, na vigência do usufruto, ao usufrutuário.

Lavrada em {{data}}.

{{nomeSocio}}                         {{donatario}}
CPF {{cpfSocio}}                      CPF {{cpfDonatario}}
Anuência: {{conjuge}}
