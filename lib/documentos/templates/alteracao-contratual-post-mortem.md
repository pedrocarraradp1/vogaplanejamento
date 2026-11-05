---
{
  "id": "alteracao-contratual-post-mortem",
  "titulo": "Alteração contratual post mortem de sócio",
  "campos": [
    { "chave": "razaoSocial", "label": "Razão social", "tipo": "texto" },
    { "chave": "cnpj", "label": "CNPJ", "tipo": "cnpj" },
    { "chave": "nire", "label": "NIRE", "tipo": "texto" },
    { "chave": "nomeFalecido", "label": "Nome do sócio falecido", "tipo": "texto", "origem": "cliente.nome" },
    { "chave": "cpfFalecido", "label": "CPF do falecido", "tipo": "cpf", "origem": "cliente.cpf" },
    { "chave": "dataObito", "label": "Data do óbito", "tipo": "data" },
    { "chave": "cartorioObito", "label": "Cartório da certidão de óbito", "tipo": "texto" },
    { "chave": "inventariante", "label": "Inventariante / sucessor admitido", "tipo": "texto" },
    { "chave": "cpfInventariante", "label": "CPF do inventariante / sucessor", "tipo": "cpf" },
    { "chave": "herdeiros", "label": "Herdeiros (nomes e CPFs)", "tipo": "textarea" },
    { "chave": "viaInventario", "label": "Via do inventário (extra/judicial)", "tipo": "texto" },
    { "chave": "quotas", "label": "Quotas do falecido", "tipo": "texto" },
    { "chave": "data", "label": "Data da alteração", "tipo": "data" }
  ]
}
---

ALTERAÇÃO CONTRATUAL POST MORTEM — {{razaoSocial}}
CNPJ {{cnpj}} — NIRE {{nire}}

1. Faleceu em {{dataObito}} o sócio {{nomeFalecido}}, CPF {{cpfFalecido}}, conforme certidão lavrada no {{cartorioObito}}, titular de {{quotas}} quotas.

2. Nos termos do contrato social e do {{viaInventario}}, os sucessores são: {{herdeiros}}.

3. Os sócios remanescentes deliberam pela ADMISSÃO / NÃO ADMISSÃO (riscar o que não couber) dos sucessores no quadro social. Na admissão, {{inventariante}}, CPF {{cpfInventariante}}, representa o espólio até a partilha e, após, os sucessores ocupam a posição do falecido na proporção da partilha.

4. Não havendo admissão, proceder-se-á à apuração de haveres em favor do espólio, na forma do contrato.

5. A administração fica assim recomposta até nova deliberação.

Junta Comercial — arquivamento desta alteração, com certidão de óbito, instrumento de inventário e documentos dos sucessores.

{{data}}

Sócios remanescentes / inventariante:

{{inventariante}}
CPF {{cpfInventariante}}
