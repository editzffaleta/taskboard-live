<!-- TEMPLATE — delta da capability rbac-permissoes (parte GATING/TELAS; complementa a 006a).
Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Gating de UI por papel e permissao

O frontend SHALL aplicar o gating por papel/permissao na sidebar e nas rotas privadas, consumindo as
permissoes efetivas do usuario via `GET /me/permissions`, e SHALL prover as telas de grupos (D7/D8/D9).

#### Scenario: Sidebar filtra por papel e permissao

- **WHEN** a sidebar e renderizada para um usuario
- **THEN** apenas os itens cujos `roles`/`permissions` o usuario satisfaz sao exibidos
- **AND** a estrutura por secoes da `002` e reutilizada sem reescrita

#### Scenario: Telas de grupos disponiveis

- **WHEN** um Admin da Organizacao acessa a area de grupos de permissao
- **THEN** D7 lista os grupos, D8 edita um grupo com as permissoes agrupadas por modulo (lidas do catalogo) e D9 atribui grupos a um colaborador

#### Scenario: Gating de UI nao substitui a autorizacao real

- **WHEN** um colaborador sem permissao tenta acessar um recurso administrativo
- **THEN** o item nao aparece no menu e a rota nega o acesso (redirect)
- **AND** a autorizacao efetiva e garantida pelo backend (403), independentemente do gating de UI

### Requirement: i18n de rotulos e build sem falhas

Os rotulos de permissoes/modulos e os textos das telas SHALL estar mapeados no i18n (pt/en) e o
projeto SHALL permanecer sem erros de TypeScript/build.

#### Scenario: Chaves de rotulo e verificacao

- **WHEN** o typecheck e executado em `apps/backend` e `apps/frontend`
- **THEN** nao ha erros de TypeScript
- **AND** existem as chaves i18n dos rotulos de permissoes/modulos e das telas D7/D8/D9 em pt e en
