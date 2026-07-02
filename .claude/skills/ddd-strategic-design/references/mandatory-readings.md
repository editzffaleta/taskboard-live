# Mandatory Readings

Leia estes arquivos exatamente nesta ordem antes de produzir o design estrategico:

1. `openspec/project.md` (visao, escopo, convencoes e contextos ja descritos)
2. a estrutura atual de `modules/` (quais bounded contexts ja existem como modulo)
3. quando houver mudanca em curso: `openspec/changes/<id>/proposal.md`
4. quando existir: `openspec/specs/<capability>/spec.md` e `design.md`

Extraia dessas leituras:

- a linguagem que o negocio ja usa (vira linguagem ubiqua)
- os contextos que ja viraram modulo e suas responsabilidades
- as integracoes externas e os sistemas que nao podem mudar
- as convencoes de modulo do projeto (para mapear contexto -> `modules/<contexto>`)

Antes de decidir as fronteiras, confirme:

- qual subdominio e realmente o core (diferencial), nao apenas o maior
- se um termo muda de significado entre areas (sinal de contextos distintos)
- onde havera integracao e qual padrao de context mapping se aplica

Se uma leitura obrigatoria faltar, registre a lacuna e siga com o que houver,
deixando explicito o que foi assumido.
