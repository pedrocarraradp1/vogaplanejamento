---
{
  "id": "compra-venda-quotas",
  "titulo": "Compra e venda de quotas",
  "campos": [
    { "chave": "razaoSocial", "label": "Sociedade", "tipo": "texto" },
    { "chave": "cnpj", "label": "CNPJ", "tipo": "cnpj" },
    { "chave": "vendedor", "label": "Vendedor", "tipo": "texto", "origem": "cliente.nome" },
    { "chave": "cpfVendedor", "label": "CPF do vendedor", "tipo": "cpf", "origem": "cliente.cpf" },
    { "chave": "estadoCivil", "label": "Estado civil do vendedor", "tipo": "texto", "origem": "cliente.estadoCivil" },
    { "chave": "conjuge", "label": "Cônjuge do vendedor", "tipo": "texto", "origem": "cliente.conjuge" },
    { "chave": "comprador", "label": "Comprador", "tipo": "texto" },
    { "chave": "cpfComprador", "label": "CPF do comprador", "tipo": "cpf" },
    { "chave": "quotas", "label": "Número de quotas", "tipo": "texto" },
    { "chave": "percentual", "label": "Percentual (%)", "tipo": "texto" },
    { "chave": "preco", "label": "Preço (R$)", "tipo": "moeda" },
    { "chave": "pagamento", "label": "Condições de pagamento", "tipo": "textarea" },
    { "chave": "data", "label": "Data", "tipo": "data" }
  ]
}
---

INSTRUMENTO PARTICULAR DE COMPRA E VENDA DE QUOTAS

VENDEDOR: {{vendedor}}, {{estadoCivil}}, CPF {{cpfVendedor}}, cônjuge {{conjuge}}.
COMPRADOR: {{comprador}}, CPF {{cpfComprador}}.
SOCIEDADE: {{razaoSocial}}, CNPJ {{cnpj}}.

1. O vendedor cede e transfere ao comprador {{quotas}} quotas, equivalentes a {{percentual}}% do capital, pelo preço de {{preco}} ({{preco_extenso}}).

2. Pagamento: {{pagamento}}.

3. O vendedor declara que as quotas estão livres de ônus, ressalvado o que constar do contrato social, e que os sócios foram notificados para o exercício da preferência, que se encerrou sem exercício (ou foi exercido, conforme o caso).

4. As partes obrigam-se a assinar a alteração contratual e a arquivá-la na Junta Comercial.

5. Foro da sede da sociedade.

{{data}}

{{vendedor}}                         {{comprador}}
CPF {{cpfVendedor}}                  CPF {{cpfComprador}}
Anuência: {{conjuge}}
