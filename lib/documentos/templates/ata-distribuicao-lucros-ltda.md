---
{
  "id": "ata-distribuicao-lucros-ltda",
  "titulo": "Ata de distribuição de lucros (Ltda.)",
  "campos": [
    { "chave": "razaoSocial", "label": "Razão social", "tipo": "texto" },
    { "chave": "cnpj", "label": "CNPJ", "tipo": "cnpj" },
    { "chave": "sede", "label": "Sede", "tipo": "texto", "origem": "cliente.endereco" },
    { "chave": "dataReuniao", "label": "Data da reunião", "tipo": "data" },
    { "chave": "hora", "label": "Hora", "tipo": "texto" },
    { "chave": "nomeSocio", "label": "Presidente / sócio", "tipo": "texto", "origem": "cliente.nome" },
    { "chave": "cpfSocio", "label": "CPF", "tipo": "cpf", "origem": "cliente.cpf" },
    { "chave": "exercicio", "label": "Exercício social", "tipo": "texto" },
    { "chave": "lucroLiquido", "label": "Lucro líquido (R$)", "tipo": "moeda" },
    { "chave": "valorDistribuido", "label": "Valor distribuído (R$)", "tipo": "moeda" },
    { "chave": "formaPagamento", "label": "Forma e prazo de pagamento", "tipo": "texto" },
    { "chave": "destinatarios", "label": "Sócios e valores recebidos", "tipo": "textarea", "origem": "cliente.empresas" }
  ]
}
---

ATA DE REUNIÃO DE SÓCIOS DE {{razaoSocial}}
CNPJ {{cnpj}}

Às {{hora}} do dia {{dataReuniao}}, na sede em {{sede}}, reuniram-se os sócios, sob a presidência de {{nomeSocio}}, CPF {{cpfSocio}}, para deliberar sobre a distribuição de lucros do exercício {{exercicio}}.

Verificado o lucro líquido de {{lucroLiquido}} ({{lucroLiquido_extenso}}) e a existência de caixa, os sócios aprovam a distribuição de {{valorDistribuido}} ({{valorDistribuido_extenso}}), na seguinte forma:

{{destinatarios}}

Pagamento: {{formaPagamento}}.

Nada mais havendo, lavrou-se a presente ata, que vai assinada.

{{nomeSocio}}
Presidente / sócio
CPF {{cpfSocio}}
