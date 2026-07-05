> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `004` (login/JWT). **Não faça:** listas/colunas ou cartões (são `007`/`008`);
> tempo real (é `006`); convites de membros além do owner (é `010`); página `/boards/[id]` completa
> (é `009` — aqui só rota/link placeholder). Aqui só nasce o owner como membro do próprio quadro.

## 1. Módulo board (domínio)

- [ ] 1.1 Criar o módulo `board` com a skill [config-new-module](../../../.claude/skills/config-new-module) usando `@taskboard`.
  - **Pré:** `004` concluída (login/JWT funcionando).
  - **Aceite:** `modules/board`, `apps/backend/src/modules/board` (module+controller registrados no `AppModule`) e scaffold frontend; build/teste do workspace verdes. **Conferir:** o `BoardModule` foi de fato registrado no `AppModule` (se o script não registrar, registrar manualmente).
- [ ] 1.2 Criar o agregado `board` com a skill [module-aggregate](../../../.claude/skills/module-aggregate) (mode `example`, só um caso de uso inicial).
  - **Aceite:** `modules/board/src/board/{model,provider,usecase}`, contrato `BoardRepository` e `src/index.ts` com `./board`.
- [ ] 1.3 Criar o agregado `membership` com a skill [module-aggregate](../../../.claude/skills/module-aggregate) (mode `example`).
  - **Aceite:** `modules/board/src/membership/{model,provider,usecase}`, contrato `MembershipRepository` e `src/index.ts` exportando `./membership` (preservando o export de `./board`).
- [ ] 1.4 Implementar a entidade `board` com a skill [module-entity](../../../.claude/skills/module-entity): `name` (texto obrigatório, ex.: título curto), `ownerId` (uuid, obrigatório). Implementar a entidade `membership`: `boardId` (uuid, obrigatório), `userId` (uuid, obrigatório), `role` (obrigatório, em `owner|member`, sem default — sempre explícito na criação).
  - **Não faça:** adicionar `organizationId`, `status` ou qualquer campo de tenant/papel global às entidades.
  - **Aceite:** entidades com validação lazy + defaults no construtor onde aplicável; teste com **100% de cobertura** em ambas.
- [ ] 1.5 Implementar `create-board` com a skill [module-use-case](../../../.claude/skills/module-use-case): recebe `{ name, ownerId }`; cria o `Board` e, **na mesma transação**, um `BoardMember` `role='owner'` para `ownerId`; retorna o `Board` criado. Registrar na evidência a decisão de atomicidade (método dedicado no repositório vs. transação Prisma) descrita no `design.md`.
  - **Pré:** 1.2, 1.3, 1.4 concluídas.
  - **Aceite:** `CreateBoard implements UseCase<CreateBoardIn, CreateBoardOut>`; entrada inválida → erro de validação de domínio; owner e board sempre nascem juntos (nunca um sem o outro).
- [ ] 1.6 Implementar `rename-board` (`{ boardId, requesterId, name }`; valida que `requesterId` é `owner` do `boardId` via `MembershipRepository`; senão `DomainError('board.owner.required', 403)`; quadro inexistente → `NotFoundError('board.not.found', 404)`).
  - **Aceite:** só o owner renomeia; retorno `void` ou `Board` atualizado (decidir e manter consistente com `get-board`).
- [ ] 1.7 Implementar `delete-board` (`{ boardId, requesterId }`; mesma checagem de ownership de 1.6).
  - **Aceite:** só o owner exclui; quadro inexistente → `NotFoundError('board.not.found', 404)`; não-owner → `DomainError('board.owner.required', 403)`.
- [ ] 1.8 Implementar `list-my-boards` (`{ userId }`; retorna os quadros onde existe `BoardMember` para `userId`, **nunca** todos os quadros do sistema).
  - **Aceite:** filtro sempre por membership do usuário; retorno é lista (pode ser vazia).
- [ ] 1.9 Implementar `get-board` (`{ boardId, requesterId }`; valida que existe `BoardMember` para o par; senão `NotFoundError('board.not.found', 404)` — **não** 403, para não vazar existência do quadro a não-membros).
  - **Aceite:** apenas membros (owner ou member) leem o detalhe; não-membro recebe 404.
- [ ] 1.10 Cobrir todos os casos de uso (1.5 a 1.9) com testes unitários usando fakes (`FakeBoardRepository`, `FakeMembershipRepository`), incluindo os cenários de erro (não-owner, não-membro, quadro inexistente, entrada inválida).
  - **Aceite:** fakes em `test/mock/`; **100% de cobertura** nos 5 casos de uso.

## 2. Back-end (persistência + endpoint)

- [ ] 2.1 Sincronizar os models `Board` e `BoardMember` com a skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module): `Board { id, name, ownerId FK → User, createdAt }`; `BoardMember { id, boardId FK → Board, userId FK → User, role, createdAt }` com `@@unique([boardId, userId])`.
  - **Não faça:** renomear os campos do modelo canônico (`Board`, `BoardMember`, `ownerId`, `boardId`, `userId`, `role`) — outras changes dependem exatamente desses nomes.
  - **Aceite:** `board.model.prisma` com os dois models e a constraint única; migration aplicada (sem operação destrutiva); `prisma:generate` ok.
- [ ] 2.2 Implementar os repositórios Prisma de `board` e `membership` com a skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository) em `apps/backend/src/modules/board`: `PrismaBoardRepository implements BoardRepository` (incluindo o método de criação atômica com `BoardMember` owner definido em 1.5) e `PrismaMembershipRepository implements MembershipRepository` (`findByBoardAndUser`, `listBoardsByUser` ou equivalente), sem alterar as interfaces.
  - **Aceite:** `board.module.ts` com `DbModule` e as classes registradas; `tsc --noEmit` ok; teste de integração confirma que `create-board` grava `Board` + `BoardMember` owner juntos.
- [ ] 2.3 Criar `board.controller.ts` com a skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller) expondo, todas autenticadas (usam `current-user.decorator` para obter `sub` como `requesterId`/`ownerId`): `POST /boards`, `GET /boards`, `GET /boards/:id`, `PATCH /boards/:id`, `DELETE /boards/:id`.
  - **Aceite:** todas as rotas exigem JWT válido (nenhuma `@Public()`); cada caso de uso é instanciado no corpo do método injetando os repositórios; `board.not.found` mapeado para 404 e `board.owner.required` para 403 no filtro global de erros.
- [ ] 2.4 Criar `board.integration.http` (Rest Client) cobrindo: criar quadro (201, owner vira membership), listar meus quadros (200), obter detalhe como membro (200) e como não-membro (404), renomear como owner (200) e como não-owner (403), excluir como owner (200/204) e como não-owner (403). Validar manualmente com o backend rodando.
  - **Aceite:** cenários cobertos; validação manual registrada, incluindo checagem no banco de que o `BoardMember` owner existe após `POST /boards`.

## 3. Mapeamento de erros e i18n

- [ ] 3.1 Listar na evidência todos os códigos de erro dos endpoints de `/boards` (`board.not.found`, `board.owner.required`, validação de entrada, fallback 500).
  - **Aceite:** lista completa dos códigos em `errors[]`.
- [ ] 3.2 Garantir que todos os códigos estão em `messages.pt.ts` e `messages.en.ts`.
  - **Aceite:** todas as chaves presentes em pt e en.

## 4. Front-end

- [ ] 4.1 Criar o dashboard em `app/(private)` (ex.: `app/(private)/dashboard/page.tsx` ou a rota privada raiz, conforme o que a `001`/`004` já definiram) listando "meus quadros" via `GET {NEXT_PUBLIC_API_URL}/boards`, com um card clicável por quadro.
  - **Pré:** `AuthContext`/`AuthGuard` da `004` funcionando.
  - **Aceite:** lista renderiza os quadros do usuário autenticado; estado vazio tratado (sem quadros ainda).
- [ ] 4.2 Implementar o botão/modal de criar quadro chamando `POST {NEXT_PUBLIC_API_URL}/boards` com `{ name }`; sucesso atualiza a lista (ou navega direto ao quadro criado); erro exibe toaster por item de `errors[]`.
  - **Aceite:** `fetch` nativo; toasts de sucesso/erro; botão desabilitado durante o submit.
- [ ] 4.3 Cada card de quadro navega para `/boards/[id]`; criar essa rota como **placeholder** (ex.: título do quadro + mensagem "em construção") usando a skill [frontend-next-config](../../../.claude/skills/frontend-next-config) para a estrutura de rota dinâmica.
  - **Não faça:** implementar colunas, cartões ou tempo real nesta rota — é escopo da `009`.
  - **Aceite:** navegação funciona; página busca `GET /boards/:id` e mostra ao menos o nome do quadro; não-membro (id de quadro alheio) recebe tratamento de erro (redirect ou mensagem, não crash).
- [ ] 4.4 Validar manualmente no navegador: criar quadro, ver na lista, abrir o placeholder, renomear e excluir (via UI simples ou diretamente pela API se a UI de rename/delete for mínima nesta change).
  - **Aceite:** evidência dos casos com o tema já existente aplicado.

## 5. Verificação

- [ ] 5.1 Rodar `npx tsc --noEmit` em `apps/backend` e `apps/frontend`; suite completa verde; checagem HTTP final (`POST /boards` → 201 com `BoardMember` owner criado).
  - **Aceite:** `tsc` limpo nos dois apps; testes verdes; `prisma migrate status` em dia; fluxo completo confirmado manualmente.
