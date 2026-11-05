---
{
  "id": "procuracao-socio-junta",
  "titulo": "Procuração do sócio para a Junta Comercial",
  "campos": [
    { "chave": "nomeSocio", "label": "Outorgante (sócio)", "tipo": "texto", "origem": "cliente.nome" },
    { "chave": "cpfSocio", "label": "CPF", "tipo": "cpf", "origem": "cliente.cpf" },
    { "chave": "rg", "label": "RG / órgão expedidor", "tipo": "texto" },
    { "chave": "estadoCivil", "label": "Estado civil", "tipo": "texto", "origem": "cliente.estadoCivil" },
    { "chave": "enderecoSocio", "label": "Endereço", "tipo": "texto", "origem": "cliente.endereco" },
    { "chave": "razaoSocial", "label": "Sociedade", "tipo": "texto" },
    { "chave": "cnpj", "label": "CNPJ", "tipo": "cnpj" },
    { "chave": "outorgado", "label": "Outorgado", "tipo": "texto" },
    { "chave": "cpfOutorgado", "label": "CPF do outorgado", "tipo": "cpf" },
    { "chave": "junta", "label": "Junta Comercial (UF)", "tipo": "uf", "origem": "cliente.uf" },
    { "chave": "atos", "label": "Atos autorizados", "tipo": "textarea" },
    { "chave": "data", "label": "Data", "tipo": "data" }
  ]
}
---

PROCURAÇÃO

OUTORGANTE: {{nomeSocio}}, {{estadoCivil}}, RG {{rg}}, CPF {{cpfSocio}}, residente em {{enderecoSocio}}, na qualidade de sócio de {{razaoSocial}}, CNPJ {{cnpj}}.

OUTORGADO: {{outorgado}}, CPF {{cpfOutorgado}}.

PODERES: representar o outorgante perante a Junta Comercial do Estado de {{junta}}, a Receita Federal e cartórios, para praticar os seguintes atos: {{atos}}. Poderes para assinar requerimentos, fichas cadastrais, contratos e alterações, recolher taxas, retirar documentos e substabelecer, com reserva de iguais poderes.

{{data}}

{{nomeSocio}}
CPF {{cpfSocio}}
