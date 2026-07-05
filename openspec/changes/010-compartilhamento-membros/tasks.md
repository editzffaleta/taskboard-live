<!-- TEMPLATE — tasks do compartilhamento de membros. Checkboxes vazios; marque com evidencia.
Cada task tem **Aceite** e **Pre**. Placeholders: TaskBoard Live, taskboard. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `005` (Board + BoardMember), `006` (RealtimeEmitter), `009` (pagina do
> quadro). **Nao faca:** convite por e-mail transacional/token; papeis alem de owner/member;
> transferencia de ownership; alterar o schema Prisma de Board/BoardMember. **Principio:**
> BoardMember ja existe desde a 005 — aqui so entram casos de uso, endpoints e UI.

## 1. Back-end

- [ ] 1.1 Implementar o caso de uso `add-member` em `apps/backend/src/modules/board/application/use-cases/add-member.use-case.ts` (skill [module-use-case](../../../.claude/skills/module-use-case)): recebe `{ boardId, requesterId, email }`; verifica que `requesterId` e `owner` do quadro (`DomainError('board.owner.required', 403)` caso contrario); resolve `email` para `User` (`DomainError('board.member.not.found', 404)` se nao existir conta); verifica que o `User` resolvido ainda nao e `BoardMember` do quadro (`DomainError('board.member.already.exists', 409)` caso ja seja); cria `BoardMember` `role='member'`.
  - **Pré:** `005` concluída (repositórios de `board`/`membership` e `User` disponíveis).
  - **Aceite:** teste unitário cobre owner adicionando com sucesso, não-owner tentando (403), e-mail sem conta (404), e-mail já membro (409).
  - Não faça: enviar e-mail de convite ou gerar token.
- [ ] 1.2 Implementar o caso de uso `remove-member` em `apps/backend/src/modules/board/application/use-cases/remove-member.use-case.ts`: recebe `{ boardId, requesterId, targetUserId }`; verifica `requesterId` owner (`DomainError('board.owner.required', 403)`); verifica que `targetUserId` não é o owner do quadro (`DomainError('board.owner.cannot.be.removed', 403)`); remove o `BoardMember` correspondente.
  - **Pré:** 1.1 concluída (mesma pasta e padrão de erros).
  - **Aceite:** teste unitário cobre owner removendo membro comum com sucesso, não-owner tentando (403), tentativa de remover o próprio owner (403).
  - Não faça: permitir que o próprio owner se remova por este caso de uso.
- [ ] 1.3 Implementar o caso de uso `list-members` em `apps/backend/src/modules/board/application/use-cases/list-members.use-case.ts`: recebe `{ boardId, requesterId }`; verifica que `requesterId` é `BoardMember` do quadro, qualquer role (`DomainError('board.not.found', 404)` caso contrário); retorna a lista de membros com dados básicos do `User` (`id`, `name`, `email`, `role`).
  - **Pré:** 1.1 concluída.
  - **Aceite:** teste unitário cobre membro comum listando com sucesso e usuário sem membership recebendo 404.
- [ ] 1.4 Expor os endpoints sob `/boards/:boardId/members` (skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller)): `GET` (chama `list-members`), `POST` `{ email }` (chama `add-member`), `DELETE /members/:userId` (chama `remove-member`). Reaproveitar `BoardController` da `005` se estiver no mesmo módulo e legível, ou criar `members.controller.ts` — registrar a escolha na evidência.
  - **Pré:** 1.1, 1.2, 1.3 concluídas.
  - **Aceite:** `GET`/`POST`/`DELETE` respondem com os códigos HTTP corretos (200, 201/200, 204) e propagam os erros de domínio (403/404/409) via filtro global de erros da `001`.
  - Não faça: expor os endpoints sem o guard de autenticação JWT global.
- [ ] 1.5 Emitir `member.added` via `RealtimeEmitter` (porta da `006`) logo após `add-member` retornar com sucesso, com payload `{ boardId, user: { id, name, email }, role: 'member' }`.
  - **Pré:** 1.1 e 1.4 concluídas; `006` disponível (`RealtimeEmitter` injetável e exportado do `BoardModule`).
  - **Aceite:** teste de integração confirma que, após `POST /boards/:boardId/members` com sucesso, `emitToBoard` é chamado com o evento e payload corretos; nenhuma emissão ocorre se o caso de uso falhar.
  - Não faça: emitir o evento antes da confirmação de sucesso do caso de uso.
- [ ] 1.6 Adicionar as chaves i18n de erro (pt/en): `board.member.not.found`, `board.member.already.exists`, `board.owner.required`, `board.owner.cannot.be.removed`.
  - **Pré:** 1.1 e 1.2 concluídas (nomes de erro definidos).
  - **Aceite:** as quatro chaves existem em pt e en e são usadas pelo filtro global de erros da `001`.

## 2. Front-end

- [ ] 2.1 Criar o painel "Compartilhar" na página do quadro (`009`), em `apps/frontend/app/(private)/boards/[id]/` (skill [frontend-next-config](../../../.claude/skills/frontend-next-config)): lista os membros via `GET /boards/:boardId/members`, exibe nome/e-mail/role de cada um.
  - **Pré:** `009` concluída (página do quadro existe e está navegável).
  - **Aceite:** o painel renderiza a lista de membros ao abrir o quadro, para qualquer membro (owner ou member).
- [ ] 2.2 Adicionar o formulário de convite por e-mail (`POST /boards/:boardId/members`) e o botão de remover por membro (`DELETE /boards/:boardId/members/:userId`), visíveis **apenas** quando o usuário atual é `owner` do quadro.
  - **Pré:** 2.1 concluída; dado de role do usuário atual disponível (via `GET /boards/:boardId` da `005` ou equivalente).
  - **Aceite:** owner vê e usa convidar/remover com sucesso; membro comum não vê os controles de gestão; erros `board.member.not.found`/`board.member.already.exists` aparecem como feedback legível no formulário.
  - Não faça: renderizar os controles de gestão para quem não é owner, mesmo que escondidos via CSS.
- [ ] 2.3 Conectar o painel ao evento `member.added` do socket já aberto pela `009`: ao receber o evento para o `boardId` da página atual, adicionar o novo membro à lista local sem novo fetch.
  - **Pré:** 1.5 concluída (evento sendo emitido) e `009` concluída (socket já conectado na página).
  - **Aceite:** com dois clientes abertos no mesmo quadro, ao owner adicionar um membro em um cliente, o outro cliente vê o novo membro aparecer na lista sem recarregar a página.

## 3. Verificação

- [ ] 3.1 Rodar `npx tsc --noEmit` (backend e frontend), os testes unitários e de integração dos casos de uso/endpoints, e validar manualmente o cenário de dois clientes conectados ao mesmo quadro recebendo `member.added` ao vivo.
  - **Aceite:** `tsc` limpo em ambos os workspaces; testes verdes; validação manual do tempo real registrada na evidência.
