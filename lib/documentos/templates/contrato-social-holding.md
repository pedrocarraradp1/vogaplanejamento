---
{
  "id": "contrato-social-holding",
  "titulo": "Contrato social de holding patrimonial",
  "campos": [
    { "chave": "razaoSocial", "label": "Razão social da holding", "tipo": "texto" },
    { "chave": "cnpj", "label": "CNPJ (se já reservado)", "tipo": "cnpj" },
    { "chave": "sedeLogradouro", "label": "Sede — logradouro", "tipo": "texto" },
    { "chave": "sedeNumero", "label": "Sede — número", "tipo": "texto" },
    { "chave": "sedeBairro", "label": "Sede — bairro", "tipo": "texto" },
    { "chave": "sedeCidade", "label": "Sede — cidade", "tipo": "texto", "origem": "cliente.cidade" },
    { "chave": "sedeUf", "label": "Sede — UF", "tipo": "uf", "origem": "cliente.uf" },
    { "chave": "sedeCep", "label": "Sede — CEP", "tipo": "cep" },
    { "chave": "capitalSocial", "label": "Capital social (R$)", "tipo": "moeda" },
    { "chave": "nomeSocio", "label": "Nome do sócio administrador", "tipo": "texto", "origem": "cliente.nome" },
    { "chave": "cpfSocio", "label": "CPF do sócio administrador", "tipo": "cpf", "origem": "cliente.cpf" },
    { "chave": "estadoCivil", "label": "Estado civil", "tipo": "texto", "origem": "cliente.estadoCivil" },
    { "chave": "conjuge", "label": "Cônjuge", "tipo": "texto", "origem": "cliente.conjuge" },
    { "chave": "enderecoSocio", "label": "Endereço do sócio", "tipo": "texto", "origem": "cliente.endereco" },
    { "chave": "empresas", "label": "Empresas / participações", "tipo": "textarea", "origem": "cliente.empresas" },
    { "chave": "data", "label": "Data", "tipo": "data" }
  ]
}
---

CONTRATO SOCIAL DE {{razaoSocial}}

SOCIEDADE LIMITADA UNIPESSOAL / HOLDING PATRIMONIAL

1. DENOMINAÇÃO, SEDE E FORO

A sociedade gira sob a denominação de {{razaoSocial}}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº {{cnpj}}, com sede em {{sedeLogradouro}}, nº {{sedeNumero}}, {{sedeBairro}}, {{sedeCidade}}/{{sedeUf}}, CEP {{sedeCep}}, e foro na comarca da sede.

2. OBJETO

A sociedade tem por objeto a participação no capital de outras sociedades e a administração de bens próprios, inclusive as participações em {{empresas}}, bem como a exploração dos frutos desses bens, sem o exercício habitual de atividade imobiliária.

3. CAPITAL SOCIAL

O capital social é de {{capitalSocial}} ({{capitalSocial_extenso}}), dividido em quotas iguais, integralizado pelo sócio {{nomeSocio}}, {{estadoCivil}}, CPF {{cpfSocio}}, residente em {{enderecoSocio}}, casado(a) com {{conjuge}}, quando aplicável.

4. ADMINISTRAÇÃO

A sociedade será administrada por {{nomeSocio}}, com os poderes de gestão ordinária, observadas as restrições à alienação de imóveis e à outorga de garantia, que dependem de alteração contratual ou de deliberação específica.

5. DISPOSIÇÕES FINAIS

O presente contrato obriga herdeiros e sucessores. Elege-se o foro da sede. Lavrado em {{sedeCidade}}/{{sedeUf}}, em {{data}}.

{{nomeSocio}}
CPF {{cpfSocio}}
