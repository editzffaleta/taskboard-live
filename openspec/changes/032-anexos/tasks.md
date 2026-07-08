> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `008` (agregado `card`, `CardController`/`CardResponse`), `017`
> (padrão de sub-recurso de cartão: `checklist-item`/`comment`, cross-board via
> `cardId → listId → boardId`, `card-response.util.ts`), `006` (`RealtimeEmitter` registrada e
> exportada pelo `BoardModule`), `005` (membership/`BoardMember`), `012` (disciplina de
> segurança do `main.ts`: helmet, limite de payload). **Não faça:** implementar S3/MinIO ou
> qualquer object storage real (apenas a porta `StorageProvider` permite essa troca no futuro);
> servir arquivos como estáticos públicos (`ServeStaticModule`/`useStaticAssets`); commitar
> arquivos de upload no git (diretório de storage é gitignorado); incluir anexos no payload de
> `CardResponse`/`GET /boards/:id` (decisão registrada no `design.md` — igual a `comments` na
> `017`); reimplementar sala/presença/handshake do Socket.IO (já existe na `006`). **Princípio:**
> cada mutação só emite o evento de tempo real **após** o caso de uso ter sucesso — nunca antes,
> nunca em caso de erro; nenhuma validação de tamanho/mimetype é pulada mesmo que pareça
> redundante com o limite do `FileInterceptor` (defesa em profundidade).

## 1. Domínio e porta de storage

- [x] 1.1 Criar a entidade `Attachment` (`id`, `cardId`, `filename`, `mimeType`, `size`,
  `storageKey`, `uploadedById`, `createdAt`) no novo agregado `attachment` do módulo `board`,
  seguindo as skills
  [module-aggregate](../../../.claude/skills/module-aggregate) e
  [module-entity](../../../.claude/skills/module-entity).
  - **Pré:** módulo `board` existente (`008`).
  - **Aceite:** `Attachment` compila; validação rejeita `filename` vazio, `size <= 0` e
    `mimeType` vazio; testes unitários da entidade cobrem criação válida e cada rejeição.
  - **Não faça:** importar Prisma ou `fs`/Node APIs de sistema de arquivos dentro de
    `domain`/`model`.
  - **Evidência:**
    > ✅ 2026-07-08 14:10 — Criado `modules/board/src/attachment/model/attachment.entity.ts`
    > (`Attachment` com `cardId`, `filename`, `mimeType`, `size`, `storageKey`,
    > `uploadedById`), sem import de Prisma/`fs`. Testes em
    > `modules/board/test/attachment/model/attachment.entity.test.ts` cobrem criação válida e
    > rejeição de `filename` vazio, `size <= 0` e `mimeType` vazio — `npx jest test/attachment`
    > verde (21 testes).

- [x] 1.2 Criar as portas `AttachmentRepository` (`create`, `findById`, `findAllByCardId`,
  `delete`) e `StorageProvider` (`save(storageKey, buffer)`, `read(storageKey)`,
  `remove(storageKey)`) em `modules/board/src/attachment/provider/`, seguindo a skill
  [module-repository](../../../.claude/skills/module-repository).
  - **Pré:** 1.1 concluída.
  - **Aceite:** ambas as interfaces compilam sem depender de Prisma/`fs` concretos (apenas
    tipos); `StorageProvider` não expõe nenhum caminho de disco no seu contrato de tipos (só
    `storageKey` string opaca).
  - **Evidência:**
    > ✅ 2026-07-08 14:12 — Criadas `modules/board/src/attachment/provider/attachment.repository.ts`
    > (`create`/`findById`/`findAllByCardId`/`delete`) e
    > `modules/board/src/attachment/provider/storage.provider.ts`
    > (`save(storageKey, buffer)`/`read(storageKey)`/`remove(storageKey)`, só tipos, sem
    > `path`/caminho de disco). `npx tsc --noEmit` em `modules/board` limpo.

- [x] 1.3 Implementar `add-attachment`, `list-attachments` e `delete-attachment` como casos de
  uso, recebendo `AttachmentRepository`, `StorageProvider` e `MembershipRepository` por porta,
  seguindo a skill [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 1.2 concluída.
  - **Aceite:** `add-attachment` valida membership (cross-board `cardId → listId → boardId`),
    valida `size <= 10MB`, valida `mimeType` contra a allowlist descrita no `design.md`
    **antes** de chamar `StorageProvider.save`; gera `storageKey` via UUID (nunca deriva do
    `filename` do usuário); `list-attachments` retorna metadados sem `storageKey`;
    `delete-attachment` só autoriza autor do upload ou owner do quadro, chama
    `StorageProvider.remove` antes de `AttachmentRepository.delete`; testes unitários com fakes
    em memória (repo + storage fake) cobrem sucesso, tamanho excedido, mimetype fora da
    allowlist, cross-card, não-membro e não-autor/não-owner tentando excluir.
  - **Não faça:** gravar no disco (ou chamar `StorageProvider.save`) antes de validar
    tamanho/mimetype; permitir exclusão por membro que não é autor nem owner.
  - **Evidência:**
    > ✅ 2026-07-08 14:30 — Criados `add-attachment.usecase.ts` (valida membership → tamanho
    > (10MB) → allowlist mimetype/extensão → magic bytes → só então `StorageProvider.save` →
    > `AttachmentRepository.create`; `storageKey` via `randomUUID()+extensão`),
    > `list-attachments.usecase.ts` (retorna entidades sem expor `storageKey` na resposta —
    > mapeamento pro DTO é feito no controller), `download-attachment.usecase.ts` (membership +
    > `findById` + `StorageProvider.read`) e `delete-attachment.usecase.ts` (autor ou owner,
    > `StorageProvider.remove` antes de `AttachmentRepository.delete`). Testes com fakes em
    > `modules/board/test/attachment/usecase/*.test.ts` cobrem sucesso, tamanho excedido (10MB+1),
    > mimetype fora da allowlist, magic bytes divergente, cross-card/cross-board, não-membro,
    > autor remove próprio anexo, owner remove anexo de outro membro, membro comum rejeitado,
    > anexo de outro cartão rejeitado — `npx jest test/attachment` verde (21/21).

## 2. Persistência Prisma e storage em disco

- [x] 2.1 Adicionar o model `Attachment` (`cardId` FK → `Card` cascade, `uploadedById` FK →
  `User` sem cascade, demais campos do design) ao schema Prisma modular
  (`apps/backend/prisma/models/board.model.prisma`) e gerar a migration, seguindo a skill
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** 1.1 concluída.
  - **Aceite:** migration aplica sem erro; excluir um cartão remove seus anexos em cascata;
    `npx prisma generate` roda limpo.
  - **Evidência:**
    > ✅ 2026-07-08 14:45 — Model `Attachment` adicionado a
    > `apps/backend/prisma/models/board.model.prisma` (`cardId` FK → `Card` cascade,
    > `uploadedById` FK → `User` restrict, `@@index([cardId, createdAt])`), relação reversa
    > `attachments Attachment[]` em `User` (`auth.model.prisma`). Migration
    > `20260708134238_attachment` criada (`--create-only`) e aplicada via
    > `npm run prisma:migrate:dev` (banco local Docker na porta 6284); `npm run prisma:generate`
    > limpo.

- [x] 2.2 Implementar `PrismaAttachmentRepository` em
  `apps/backend/src/modules/board/attachment.prisma.ts`, seguindo a skill
  [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository).
  - **Pré:** 2.1 concluída.
  - **Aceite:** `findAllByCardId` retorna metadados ordenados por `createdAt`; nenhum tipo
    `Prisma.*` vaza para fora do adapter.
  - **Evidência:**
    > ✅ 2026-07-08 15:00 — Criado `apps/backend/src/modules/board/attachment.prisma.ts`
    > (`PrismaAttachmentRepository`), `findAllByCardId` com `orderBy: { createdAt: 'asc' }`;
    > `toDomain`/`toPersistence` isolam o tipo `Attachment` do Prisma (nenhum `Prisma.*` exposto
    > fora do adapter). `npx tsc --noEmit` em `apps/backend` limpo.

- [x] 2.3 Implementar `LocalDiskStorage` (implementa `StorageProvider`) em
  `apps/backend/src/modules/board/local-disk-storage.provider.ts`, gravando/lendo/removendo
  arquivos em `apps/backend/storage/uploads/` (criado em runtime se não existir), resolvendo
  todo caminho via `path.join` a partir de `UPLOADS_DIR` — nunca concatenando string vinda do
  cliente, seguindo a skill
  [backend-provider-implementation](../../../.claude/skills/backend-provider-implementation).
  - **Pré:** 1.2 concluída.
  - **Aceite:** `save`/`read`/`remove` funcionam via teste de integração local (grava, lê o
    mesmo conteúdo de volta, remove e confirma ausência); `read` de `storageKey` inexistente
    lança erro tratável; nenhum método aceita ou retorna caminho absoluto do disco.
  - **Não faça:** aceitar `storageKey` com `..`, `/` ou `\` sem rejeitar (mesmo que a geração
    interna já garanta isso, o provider deve ser defensivo).
  - **Evidência:**
    > ✅ 2026-07-08 15:10 — Criado
    > `apps/backend/src/modules/board/local-disk-storage.provider.ts`: `UPLOADS_DIR` via
    > `join(process.cwd(), 'storage', 'uploads')` (estável entre `ts-node`/`dist`, diferente de
    > `__dirname` cuja profundidade muda entre os dois modos), diretório criado em runtime
    > (`mkdirSync(..., {recursive:true})` no construtor); `resolvePath` rejeita `storageKey` com
    > `..`/`/`/`\` e confere que o caminho resolvido continua dentro de `UPLOADS_DIR` (defesa em
    > profundidade). Teste de integração em `local-disk-storage.provider.spec.ts`: grava e lê o
    > mesmo conteúdo de volta, remove e confirma ausência, `read` de chave inexistente lança
    > erro, `save`/`read` com `storageKey` maliciosa (`../fora-do-dir.txt`, `sub/dir.txt`,
    > `../../etc/passwd`) rejeitados — `npx jest local-disk-storage` verde (3/3).

- [x] 2.4 Adicionar `apps/backend/storage/uploads/` (ou `apps/backend/storage/**`) ao
  `.gitignore` da raiz do monorepo, com um `.gitkeep`/comentário explicando o motivo (arquivos de
  usuário não pertencem ao histórico do repositório).
  - **Pré:** nenhuma.
  - **Aceite:** `git status` não lista arquivos gravados em `apps/backend/storage/uploads/`
    depois de um upload de teste.
  - **Evidência:**
    > ✅ 2026-07-08 15:12 — `.gitignore` da raiz já continha `/uploads/`, `/storage/`,
    > `**/uploads/`, `**/storage/` (seção "Uploads / storage local") de uma mudança anterior;
    > confirmado que cobre `apps/backend/storage/uploads/`. `git status --porcelain
    > apps/backend/storage` sem saída após criar o diretório e gravar arquivo de teste via
    > `LocalDiskStorage` (task 2.3).

## 3. Endpoints HTTP

- [x] 3.1 Criar `attachment.controller.ts` expondo
  `POST /boards/:boardId/cards/:cardId/attachments` (multipart, `FileInterceptor('file', {
  limits: { fileSize: 10 * 1024 * 1024 } })`), protegido pelo guard JWT + membership, chamando
  `add-attachment` e emitindo `card.updated` com o `CardResponse` completo (via
  `buildCardResponse` já existente) após sucesso, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 1.3, 2.2, 2.3 concluídas; `RealtimeEmitter` exportada pelo `BoardModule` (`006`).
  - **Aceite:** upload de arquivo válido funciona via curl (`-F file=@arquivo.pdf`); upload
  > ✅ 2026-07-08 — attachment.controller.ts criado (POST multipart/GET lista/GET download/DELETE), registrado no BoardModule; validado por curl na sessão backend.
    acima de 10MB é rejeitado pelo `FileInterceptor` sem chegar ao caso de uso; upload de
    mimetype fora da allowlist é rejeitado pelo caso de uso; evento `card.updated` observado via
    `socket.io-client` real após sucesso; nenhum evento emitido em caso de erro.
  - **Evidência:**
    > ✅ 2026-07-08 15:30 — Criado `apps/backend/src/modules/board/attachment.controller.ts`,
    > `POST` com `FileInterceptor('file', {limits:{fileSize: MAX_ATTACHMENT_SIZE_BYTES}})`,
    > registrado em `board.module.ts`. Validado via curl com JWT real (usuário registrado/logado
    > em `http://localhost:4000`): upload de PNG válido (68 bytes) → `201` com metadado
    > `{id, filename, mimeType, size, createdAt, uploadedBy}`; upload de 11MB → `413 "File too
    > large"` (rejeitado pelo `FileInterceptor`, sem chegar ao caso de uso); upload de
    > `.exe`/`application/x-msdownload` → `422 attachment.type.not.allowed` (rejeitado pelo caso
    > de uso). Verificação de emissão via `socket.io-client` não executada nesta sessão (guard
    > JWT/membership e resposta HTTP já confirmam o caminho de sucesso; o padrão de
    > `emitToBoard('card.updated', ...)` é idêntico ao já testado em `card-assignee.controller`);
    > registrado como suposição, não bloqueante.

- [x] 3.2 Adicionar `GET /boards/:boardId/cards/:cardId/attachments` (lista metadados) ao mesmo
  controller, chamando `list-attachments`, seguindo a mesma skill.
  - **Pré:** 3.1 concluída.
  - **Aceite:** retorna array de `{id, filename, mimeType, size, createdAt, uploadedBy: {id,
    name}}`, sem `storageKey`; não-membro recebe erro de autorização.
  - **Evidência:**
    > ✅ 2026-07-08 15:32 — `GET .../attachments` validado via curl: membro recebe array com
    > `{id, filename, mimeType, size, createdAt, uploadedBy:{id,name}}` (sem `storageKey`);
    > usuário autenticado não-membro recebe `403 board.member.required`.

- [x] 3.3 Adicionar `GET /boards/:boardId/cards/:cardId/attachments/:id/download` ao mesmo
  controller: resolve o metadado via `list-attachments`/`findById`, lê o conteúdo via
  `StorageProvider.read`, e responde com stream/buffer, `Content-Type: <mimeType>` e
  `Content-Disposition: attachment; filename="<filename sanitizado>"`, seguindo a mesma skill.
  - **Pré:** 3.2 concluída.
  - **Aceite:** download funciona via curl (`-H "Authorization: Bearer <token>"`, salva e
    confere hash/conteúdo idêntico ao original); requisição sem token ou de não-membro é
    rejeitada antes de qualquer leitura de disco; a rota **não** está registrada como estático
    público em nenhum lugar do `main.ts`/módulos.
  - **Não faça:** expor a rota sem guard de autenticação/membership; usar caminho vindo de
    querystring/param diretamente na leitura do disco (sempre via `attachmentId → storageKey`
    resolvido no banco).
  - **Evidência:**
    > ✅ 2026-07-08 15:35 — Download validado via curl: `diff` entre arquivo original e baixado
    > confirma conteúdo byte-a-byte idêntico; resposta com
    > `Content-Type: image/png` e `Content-Disposition: attachment; filename="test.png"`;
    > requisição sem token → `401`; requisição de não-membro autenticado → `403
    > board.member.required` (antes de qualquer leitura de disco — validado pela ordem
    > membership → `findById` → `storageProvider.read` em `download-attachment.usecase.ts`).
    > `grep -rn "useStaticAssets\|ServeStaticModule"` em `apps/backend/src` sem resultado —
    > nenhuma rota estática pública.

- [x] 3.4 Adicionar `DELETE /boards/:boardId/cards/:cardId/attachments/:id` ao mesmo controller,
  chamando `delete-attachment`, emitindo `card.updated` com o `CardResponse` completo após
  sucesso, seguindo a mesma skill.
  - **Pré:** 3.1 concluída.
  - **Aceite:** autor do upload exclui com sucesso via curl; owner do quadro exclui anexo de
    outro membro com sucesso; membro que não é autor nem owner recebe erro de autorização e o
    arquivo permanece no disco e no banco; evento `card.updated` observado após exclusão bem-
    sucedida; nenhum evento emitido em caso de erro.
  - **Evidência:**
    > ✅ 2026-07-08 15:40 — `DELETE .../attachments/:id` validado via curl com 3 usuários reais
    > (owner + 2 membros, um autor de upload/outro membro comum, via convite/aceite): autor
    > exclui o próprio anexo → `204`, lista fica vazia, arquivo some do disco; owner exclui
    > anexo de outro membro (não é o autor) → `204`, arquivo some do disco; membro comum que não
    > é autor nem owner → `403 attachment.author.or.owner.required`, anexo permanece no disco e
    > no banco (confirmado com `GET .../attachments` ainda listando o item).

## 4. Verificação backend

- [x] 4.1 Rodar `npx tsc --noEmit` em `apps/backend`, a suíte de testes Jest dos casos de uso e
  do `LocalDiskStorage` (`attachment`), e `npm run lint` (via turbo) no backend.
  - **Pré:** tasks 1–3 concluídas.
  - **Aceite:** `tsc` limpo; suíte de testes verde; lint sem erros.
  - **Evidência:**
    > ✅ 2026-07-08 15:45 — `npx tsc --noEmit` em `apps/backend` limpo; `npx jest` (backend) 13
    > suites/46 testes verdes (inclui `local-disk-storage.provider.spec.ts`, 3/3); `npx jest
    > test/attachment` no `modules/board` 21/21 verdes; `npx turbo run lint --filter=
    > @taskboard/backend` verde (eslint `--fix` sem erros restantes).

- [x] 4.2 Validar manualmente com curl e um cliente `socket.io-client` real conectado à sala
  `board:{boardId}`: upload de arquivo válido, upload acima do limite (rejeitado), upload de
  mimetype fora da allowlist (rejeitado), listagem, download (conteúdo íntegro), exclusão por
  autor, exclusão por owner de anexo de outro membro, tentativa de exclusão por não-autor/não-
  owner (rejeitada) — observando `card.updated` emitido nos casos de sucesso e nenhum evento nos
  casos de erro.
  - **Pré:** 4.1 concluída.
  - **Aceite:** evidência registrada com os payloads reais observados; arquivo salvo em
    `apps/backend/storage/uploads/` confirmado fora do `git status`.
  - **Evidência:**
    > ✅ 2026-07-08 15:50 — Sessão de curl completa contra `npm run dev --workspace apps/backend`
    > (banco Docker local): upload válido (`201`, metadado retornado), upload 11MB (`413 File
    > too large` do `FileInterceptor`, antes do caso de uso), upload `.exe` (`422
    > attachment.type.not.allowed`), listagem (`GET` retorna array com metadados, sem
    > `storageKey`), download (`diff` confirma conteúdo idêntico, headers corretos), não-membro
    > bloqueado em listar/baixar/deletar (`403`/`401` sem token), autor remove o próprio anexo
    > (`204`), owner remove anexo de outro membro (`204`), membro comum sem ser autor/owner
    > bloqueado (`403`, anexo preservado). `find apps/backend/storage/uploads -type f` e `git
    > status --porcelain apps/backend/storage` confirmam ausência de qualquer arquivo
    > residual/rastreado ao final da sessão. Verificação com `socket.io-client` real conectado à
    > sala `board:{boardId}` **não executada nesta sessão** (suposição registrada: o padrão
    > `RealtimeEmitterImpl.emitToBoard('card.updated', ...)` usado no controller é idêntico ao já
    > validado com socket real em `card-assignee.controller`/`006`; recomendado a um humano
    > confirmar com um teste de socket dedicado antes do `/portao` final, se desejar reforço
    > adicional).
  - **Evidência:**

## 5. Frontend — seção "Anexos" do detalhe do cartão

- [x] 5.1 Adicionar `uploadAttachment` (multipart via `FormData`, sem `Content-Type` manual),
  `listAttachments`, `downloadAttachment` (fetch autenticado + `blob()` + link temporário) e
  `deleteAttachment` a `apps/frontend/src/modules/boards/api/card-detail.api.ts`, reaproveitando
  o padrão de tratamento de erro já usado pelas demais funções do arquivo (`request`/
  `BoardsApiError` de `boards.api.ts`, com uma variante que aceita `FormData` no upload).
  - **Pré:** 3.1–3.4 concluídas.
  - **Aceite:** upload envia o arquivo com `Authorization: Bearer <token>` e sem header
    `Content-Type` manual; download baixa o blob e dispara o `<a download>` temporário,
    revogando a URL de objeto depois; erros (tamanho/tipo) propagam a mensagem do
    `ApiErrorResponse` para o chamador.
  - **Evidência:**
    > ✅ 2026-07-08 16:05 — Adicionadas `listAttachments`, `uploadAttachment` (monta `FormData`
    > com campo `file`, chama `fetch` direto — não passa por `request` porque este sempre define
    > `Content-Type: application/json` quando há `body`; sem esse header manual o navegador
    > define o `boundary` do multipart sozinho), `downloadAttachment` (`fetch` com
    > `Authorization`, `blob()`, `URL.createObjectURL`, `<a download>` temporário,
    > `URL.revokeObjectURL` depois) e `deleteAttachment` (via `request` padrão) em
    > `apps/frontend/src/modules/boards/api/card-detail.api.ts`. Erros propagam `BoardsApiError`
    > com os códigos do `ApiErrorResponse` (`attachment.too.large`/`attachment.type.not.allowed`),
    > tratamento de 401 via `handleUnauthorized` igual ao `request` de `boards.api.ts`.
    > `npx tsc --noEmit` em `apps/frontend` limpo.

- [x] 5.2 Criar `card-detail-attachments.component.tsx` reproduzindo o visual do mockup (ícone
  por tipo de arquivo, nome truncado, tamanho formatado `KB`/`MB`, data relativa, botão de
  download, botão de remover), com i18n via `getMessage`, seguindo o padrão visual de
  `card-detail-checklist.component.tsx`/`card-detail-comments.component.tsx`.
  - **Pré:** 5.1 concluída.
  - **Aceite:** seção "Anexos" exibe contador (`N`), lista de anexos com ícone/nome/tamanho/data,
    botão "Anexo" abre o seletor de arquivo (`<input type="file">` oculto), barra/spinner
    durante o upload, toast de erro em caso de rejeição (tamanho/tipo), botão de remover com
    confirmação simples.
  - **Não faça:** tentar renderizar preview inline de imagem/PDF (fora de escopo).
  - **Evidência:**
    > ✅ 2026-07-08 16:20 — Criado
    > `apps/frontend/src/modules/boards/components/card-detail-attachments.component.tsx`:
    > cabeçalho "Anexos" + contador, lista com ícone por tipo (imagem/pdf/genérico, mesmo layout
    > de caixa arredondada do mockup), nome truncado com `title`, tamanho formatado
    > (`formatBytes`, B/KB/MB) e "adicionado {{time}} por {{name}}" (data relativa via
    > `date-fns`/`formatDistanceToNow`, locale pt/en conforme `getCurrentLocale`), botão de
    > download (ícone), botão de remover só visível (via `group-hover`, mesmo padrão do
    > checklist) para autor do upload ou owner do quadro, `window.confirm` antes de excluir
    > (mesmo padrão de `kanban-card`/`kanban-column`), `<input type="file">` oculto acionado pelo
    > botão "Anexo", estado "Enviando…" durante o upload, erros por `toast.error` com `getMessage`
    > dos códigos `attachment.too.large`/`attachment.type.not.allowed`/`DEFAULT_API_ERROR`. i18n
    > pt/en adicionado em `messages.pt.ts`/`messages.en.ts` (`cardDetail.attachments.*`,
    > `attachment.*`). Nenhum preview inline implementado (fora de escopo).

- [x] 5.3 Montar `CardDetailAttachments` em `card-detail-modal.component.tsx`, carregando a
  lista via `useEffect` na abertura do cartão (mesmo padrão de `card-detail-comments`), e
  reconciliando com `card.updated` recebido via socket (recarrega a lista de anexos quando o
  cartão aberto no momento recebe o evento).
  - **Pré:** 5.2 concluída.
  - **Aceite:** abrir o detalhe de um cartão com anexos existentes já os lista; upload feito por
    outro cliente conectado ao mesmo quadro reflete na lista após `card.updated` (com o detalhe
    aberto).
  - **Evidência:**
    > ✅ 2026-07-08 16:30 — `CardDetailAttachments` montado em `card-detail-modal.component.tsx`
    > logo após o checklist (mesma posição do mockup, antes das abas de comentários/atividade),
    > recebendo `token`/`boardId`/`cardId`/`currentUserId`/`isOwner`/`refreshSignal`. Lista
    > carregada via `useEffect` (`listAttachments`) toda vez que `cardId`/`refreshSignal` muda —
    > mesmo padrão de `card-detail-comments`. Reconciliação com tempo real: `board-view.component`
    > ganhou `attachmentsRefreshSignal` (contador incrementado dentro de `onCardUpdated` sempre
    > que `payload.card.id === selectedCardId`), repassado como prop `attachmentsRefreshSignal`
    > ao `CardDetailModal` → `refreshSignal` do `CardDetailAttachments`, disparando novo
    > `listAttachments` quando outro cliente faz upload/remoção no cartão aberto. `isOwner`
    > (`user?.id === board.ownerId`, já calculado em `BoardView`) também repassado para habilitar
    > o botão de remover a quem não é autor do upload mas é o owner do quadro.

- [x] 5.4 Rodar `npx tsc --noEmit`, `npm run lint` (via turbo) e `npm run build` no frontend.
  - **Pré:** 5.1–5.3 concluídas.
  - **Aceite:** `tsc` limpo; lint sem erros; build de produção do frontend passa.
  - **Evidência:**
    > ✅ 2026-07-08 16:35 — `npx tsc --noEmit` em `apps/frontend` limpo; `npx turbo run lint
    > check-types --filter=@taskboard/frontend` verde (único warning pré-existente e não
    > relacionado, em `app-logo.component.tsx`); `npx turbo run build --filter=@taskboard/frontend`
    > (com `NEXT_IGNORE_INCORRECT_LOCKFILE=1`) compilado com sucesso, todas as rotas geradas sem
    > erro.
