<!-- TEMPLATE — tasks do gating de UI + telas D7/D8/D9. Checkboxes vazios; marque com evidencia.
Cada task tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `006a` (mecanismo + `GET /me/permissions`), `002` (sidebar), `005` (sessao).
> **Nao faca:** codigo novo no backend; confiar no gating de UI como autorizacao (o backend e quem
> nega); telas de colaboradores D2/D3/D29 (familia `008*`).

## 1. Efetivas no client

- [ ] 1.1 Buscar `GET /me/permissions` na hidratacao da sessao e disponibilizar `{ catalogo, efetivas }` no client (extensao do `AuthContext` da `005` ou hook `usePermissions()`), com funcao de rebusca.
  - **Aceite:** efetivas disponiveis apos login; rebusca invocavel; deslogado → estado vazio sem erro.

## 2. Gating

- [ ] 2.1 Estender a config estatica da sidebar (`002`) com `roles?: Role[]` e `permissions?: PermissionKey[]` por secao/item, tipadas pelo pacote compartilhado.
  - **Aceite:** config tipada compila; itens sem restricao continuam visiveis a todos os autenticados.
- [ ] 2.2 Filtrar a sidebar pelo usuario: item visivel se o papel satisfaz `roles` E/OU as efetivas cobrem `permissions` (usar a funcao de efetivas do shared, `006a`/1.2).
  - **Aceite:** colaborador sem permissao nao ve itens administrativos; estrutura da `002` reutilizada sem reescrita.
- [ ] 2.3 Proteger as rotas privadas por papel/permissao (extensao do `AuthGuard` ou `RoleGuard`): nao autorizado → `router.replace` para a rota privada inicial.
  - **Aceite:** acesso direto por URL a rota restrita redireciona; backend continua negando com 403.

## 3. Telas (modulo access)

- [ ] 3.1 **D7 — Listagem de grupos**: tabela paginada de `permission-groups` (nome, nº de permissoes, nº de membros, acoes), em rota protegida para Admin da Organizacao.
  - **Aceite:** tabela paginada com gating por papel; dados reais de `/permission-groups`.
- [ ] 3.2 **D8 — Editor de grupo**: formulario (`form-section-layout`) com `name`, `description` e as permissoes **agrupadas por modulo** a partir do catalogo (checkboxes); criar/editar e excluir (`delete-confirmation-dialog`, respeitando `isSystem`).
  - **Aceite:** permissoes agrupadas lidas do catalogo; excluir bloqueado para `isSystem` (UI + 409 do backend tratado).
- [ ] 3.3 **D9 — Atribuir grupos**: multi-select dos grupos de um colaborador, gravando via `/users/:id/permission-groups`; ao salvar, rebuscar as efetivas se o usuario alvo for o logado.
  - **Aceite:** atribuicao persiste e reflete nas efetivas.
- [ ] 3.4 Itens de menu de grupos de permissao na secao administrativa da sidebar, sob gating por papel.
  - **Aceite:** itens visiveis apenas para papeis administrativos.

## 4. i18n e verificacao

- [ ] 4.1 Adicionar as chaves i18n de **rotulos** em `messages.pt.ts`/`messages.en.ts`: permissoes/modulos do catalogo e textos das telas D7/D8/D9.
  - **Aceite:** chaves presentes em pt e en (paridade pelo tipo derivado).
- [ ] 4.2 Rodar `npx tsc --noEmit` (backend e frontend) e validar o gating ponta a ponta: colaborador sem permissao nao ve itens administrativos, recebe redirect na rota e 403 no endpoint; apos atribuicao via D9, passa a ver/acessar.
  - **Aceite:** `tsc` limpo; evidencia do fluxo `bloqueado → atribuicao (D9) → liberado`.
