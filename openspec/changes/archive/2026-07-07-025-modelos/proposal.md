> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/quadros/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/modelos/spec.md`, `mockups/Modelos.dc.html`) ·
> e, **somente se o `design.md` citar nominalmente**: arquivos de código listados,
> `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O TaskBoard Live já cria quadros vazios (`005`), com listas (`007`) e cartões (`008`), mas todo
quadro novo nasce em branco — o usuário precisa criar colunas e cartões manualmente antes de
começar a trabalhar. O mockup `Modelos.dc.html` mostra uma galeria "Comece com um modelo": quadros
pré-configurados (Scrum, Roadmap, CRM, Editorial, Pessoal, Bugs) com listas e cartões de exemplo já
prontos, reduzindo o atrito de começar a usar o produto. Esta mudança entrega essa galeria de ponta
a ponta: catálogo estático de modelos no backend, caso de uso que cria um quadro real e populado a
partir de um modelo (atomicamente, reaproveitando o que `005`/`007`/`008` já construíram), e a tela
de galeria no frontend.

## What Changes

- Definir um catálogo estático (em código, sem tabela nova) de 6 modelos de quadro — cada um com
  `id`, `name`, `description`, `category`, `color` e a lista de `lists` (título + cartões de
  exemplo opcionais), espelhando exatamente os modelos do mockup: Engenharia/Scrum (Backlog,
  Sprint, Em progresso, Concluído), Produto/Roadmap (Agora, Próximo, Depois), Vendas/CRM (Leads,
  Contato, Proposta, Fechado), Marketing/Editorial (Ideias, Escrevendo, Revisão, Publicado),
  Pessoal (A fazer, Fazendo, Feito) e Engenharia/Bugs (Reportado, Triagem, Corrigindo, Verificado).
- Implementar o caso de uso `create-board-from-template` (`{ templateId, name?, ownerId }`): cria o
  `Board` (com `BoardMember` owner), as `List`s e os `Card`s de exemplo do modelo, tudo
  atomicamente, reaproveitando o padrão de transação já usado por `create-board`
  (`createWithOwnerMembership`).
- Expor `GET /board-templates` (catálogo, autenticado, sem efeito colateral) e
  `POST /boards/from-template` (`{ templateId, name? }`, autenticado) retornando o quadro criado
  (mesmo formato de `get-board-detail`, já usado por `009`).
- No frontend, criar a tela `/templates` ("Modelos") reproduzindo a galeria do mockup: filtro por
  categoria, card por modelo com nome/descrição/prévia das colunas e botão "Usar modelo" que chama
  `POST /boards/from-template` e navega para `/boards/[id]`. Item "Modelos" na navegação lateral.
  i18n pt/en.

## Capabilities

### New Capabilities
- `modelos`: catálogo estático de modelos de quadro, caso de uso `create-board-from-template` que
  cria um quadro real (colunas + cartões de exemplo + owner) atomicamente a partir de um modelo,
  endpoints `GET /board-templates`/`POST /boards/from-template`, e a galeria "Modelos" no frontend.

### Modified Capabilities
<!-- Nenhuma. -->

## Impact

- **Backend**: novo agregado leve `template` no módulo `board` (catálogo estático + caso de uso
  `create-board-from-template`), método de repositório dedicado para a criação atômica
  board+lists+cards+owner, dois endpoints novos em `board.controller.ts`, i18n de erros.
- **Frontend**: rota `/templates` (galeria), item de navegação "Modelos", chamada de API e
  navegação para o quadro criado.
- **Contratos**: reaproveita `BoardRepository`, `MembershipRepository`, `ListRepository`,
  `CardRepository` já existentes (`005`/`007`/`008`) — nenhuma interface existente é alterada, só
  estendida com um método novo de criação atômica a partir de modelo.
- **Fora de escopo**: editor de modelos pelo usuário, modelos persistidos em tabela, edição/exclusão
  de modelos, marketplace de modelos de terceiros.
- **Dependências**: `005` (quadros), `007` (listas), `008` (cartões).
- **Habilita**: nada além da própria galeria — é uma folha do trilho.
