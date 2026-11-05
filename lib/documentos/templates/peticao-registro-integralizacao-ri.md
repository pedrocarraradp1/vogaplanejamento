---
{
  "id": "peticao-registro-integralizacao-ri",
  "titulo": "Petição de registro de integralização no RI",
  "campos": [
    { "chave": "cartorioImoveis", "label": "Ofício de Registro de Imóveis", "tipo": "texto" },
    { "chave": "comarca", "label": "Comarca", "tipo": "texto", "origem": "cliente.cidade" },
    { "chave": "razaoSocial", "label": "Adquirente (holding)", "tipo": "texto" },
    { "chave": "cnpj", "label": "CNPJ", "tipo": "cnpj" },
    { "chave": "nomeSocio", "label": "Sócio conferente", "tipo": "texto", "origem": "cliente.nome" },
    { "chave": "cpfSocio", "label": "CPF do conferente", "tipo": "cpf", "origem": "cliente.cpf" },
    { "chave": "matricula", "label": "Matrícula", "tipo": "texto" },
    { "chave": "valorImovel", "label": "Valor da conferência (R$)", "tipo": "moeda" },
    { "chave": "titulo", "label": "Título (alteração contratual / escritura)", "tipo": "texto" },
    { "chave": "data", "label": "Data", "tipo": "data" }
  ]
}
---

EXCELENTÍSSIMO(A) OFICIAL DE REGISTRO DE IMÓVEIS DA COMARCA DE {{comarca}}
{{cartorioImoveis}}

{{razaoSocial}}, CNPJ {{cnpj}}, e {{nomeSocio}}, CPF {{cpfSocio}}, requerem o REGISTRO da conferência do imóvel da matrícula {{matricula}} ao capital social da requerente, no valor de {{valorImovel}} ({{valorImovel_extenso}}), conforme {{titulo}}.

Requerem a averbação / registro na matrícula, com a titularidade em nome de {{razaoSocial}}, e a prática dos atos correlatos (abertura de matrícula, se o caso, e notas de expedição).

Juntam: título, certidões, comprovante de ITBI ou de imunidade, e documentos societários.

{{comarca}}, {{data}}.

{{nomeSocio}}
{{razaoSocial}}
CNPJ {{cnpj}}
