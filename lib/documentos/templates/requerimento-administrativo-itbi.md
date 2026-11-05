---
{
  "id": "requerimento-administrativo-itbi",
  "titulo": "Requerimento administrativo de ITBI",
  "campos": [
    { "chave": "municipio", "label": "Município", "tipo": "texto", "origem": "cliente.cidade" },
    { "chave": "uf", "label": "UF", "tipo": "uf", "origem": "cliente.uf" },
    { "chave": "nomeSocio", "label": "Requerente", "tipo": "texto", "origem": "cliente.nome" },
    { "chave": "cpfSocio", "label": "CPF do requerente", "tipo": "cpf", "origem": "cliente.cpf" },
    { "chave": "razaoSocial", "label": "Pessoa jurídica adquirente", "tipo": "texto" },
    { "chave": "cnpj", "label": "CNPJ", "tipo": "cnpj" },
    { "chave": "matricula", "label": "Matrícula", "tipo": "texto" },
    { "chave": "descricaoImovel", "label": "Descrição / endereço do imóvel", "tipo": "textarea" },
    { "chave": "valorImovel", "label": "Valor da operação (R$)", "tipo": "moeda" },
    { "chave": "fundamento", "label": "Fundamento (imunidade / não incidência / base)", "tipo": "textarea" },
    { "chave": "data", "label": "Data", "tipo": "data" }
  ]
}
---

ILUSTRÍSSIMO(A) SENHOR(A) SECRETÁRIO(A) DE FINANÇAS DO MUNICÍPIO DE {{municipio}}/{{uf}}

{{nomeSocio}}, CPF {{cpfSocio}}, na qualidade de administrador de {{razaoSocial}}, CNPJ {{cnpj}}, vem requerer o que segue.

1. O imóvel de matrícula {{matricula}}, {{descricaoImovel}}, está sendo conferido ao capital social de {{razaoSocial}}, pelo valor de {{valorImovel}} ({{valorImovel_extenso}}).

2. Fundamento: {{fundamento}}

3. Requer:
a) o reconhecimento da imunidade ou da não incidência do ITBI, ou, subsidiariamente, a fixação da base de cálculo no valor da operação;
b) a expedição de certidão / guia correspondente;
c) a juntada dos documentos anexos (contrato social, matrícula, laudo, DRE, se o caso).

Termos em que pede deferimento.

{{municipio}}/{{uf}}, {{data}}.

{{nomeSocio}}
CPF {{cpfSocio}}
{{razaoSocial}} — CNPJ {{cnpj}}
