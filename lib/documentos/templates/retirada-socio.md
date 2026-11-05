---
{
  "id": "retirada-socio",
  "titulo": "Retirada de sócio",
  "campos": [
    { "chave": "razaoSocial", "label": "Sociedade", "tipo": "texto" },
    { "chave": "cnpj", "label": "CNPJ", "tipo": "cnpj" },
    { "chave": "nomeSocio", "label": "Sócio que se retira", "tipo": "texto", "origem": "cliente.nome" },
    { "chave": "cpfSocio", "label": "CPF", "tipo": "cpf", "origem": "cliente.cpf" },
    { "chave": "quotas", "label": "Quotas liquidáveis", "tipo": "texto" },
    { "chave": "haveres", "label": "Valor dos haveres (R$)", "tipo": "moeda" },
    { "chave": "prazoPagamento", "label": "Prazo de pagamento dos haveres", "tipo": "texto" },
    { "chave": "motivo", "label": "Motivo (recesso, consenso, exclusão)", "tipo": "texto" },
    { "chave": "remanescentes", "label": "Sócios remanescentes", "tipo": "textarea", "origem": "cliente.empresas" },
    { "chave": "data", "label": "Data da resolução", "tipo": "data" }
  ]
}
---

INSTRUMENTO DE RETIRADA DE SÓCIO — {{razaoSocial}}
CNPJ {{cnpj}}

1. {{nomeSocio}}, CPF {{cpfSocio}}, titular de {{quotas}} quotas, retira-se da sociedade em {{data}}, por {{motivo}}.

2. Os haveres são apurados em {{haveres}} ({{haveres_extenso}}), a serem pagos em {{prazoPagamento}}, na forma do contrato social e do art. 1.031 do Código Civil.

3. A partir desta data o retirante não exerce direitos societários. As quotas serão canceladas ou redistribuídas entre {{remanescentes}}.

4. As partes darão baixa na Junta Comercial e atualizarão o QSA da RFB.

{{data}}

{{nomeSocio}}
CPF {{cpfSocio}}

Sócios remanescentes:
{{remanescentes}}
