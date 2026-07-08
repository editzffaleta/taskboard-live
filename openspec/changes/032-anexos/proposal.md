> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/anexos/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/anexos/spec.md`) ·
> `openspec/changes/032-anexos/mockups/` (`Quadro ao Vivo.dc.html`, seção "Anexos" do detalhe do
> cartão) · e, **somente se o `design.md` citar nominalmente**: arquivos de código listados,
> `openspec/templates/`, `openspec/memory/`. **NÃO ler:** o repositório inteiro, outras changes,
> `openspec/changes/archive/`. Faltou contexto? O defeito é do `design.md` — pare e corrija o
> trilho; não abra o contexto. **Ao concluir:** `/portao` verde → commit → `/openspec:archive` →
> atualizar `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O detalhe do cartão (`018`) já mostra prazo, checklist, responsáveis, etiquetas, comentários e
atividade — mas a seção **"Anexos"** do mockup (`Quadro ao Vivo.dc.html`) sempre ficou vazia:
existe o botão "Anexo" na barra "Adicionar ao cartão" e o layout da lista de arquivos (ícone por
tipo, nome, tamanho, data, botão de download), mas nunca houve backend para upload/armazenamento/
download/remoção de arquivo. Esta change é **full-stack**: entrega o agregado `Attachment` do
módulo `board` (upload multipart, listagem de metadados, download autenticado, remoção) e a UI
correspondente na seção "Anexos" do detalhe do cartão, fechando o último item do mockup sem
backend.

**Decisão de armazenamento (explícita):** não há S3/MinIO no projeto. O arquivo é salvo em
**disco local**, num diretório fora do controle de versão
(`apps/backend/storage/uploads/`, adicionado ao `.gitignore`), atrás de uma porta
`StorageProvider` com implementação `LocalDiskStorage`. Isso é adequado a um ambiente de
desenvolvimento/portfólio rodando num único processo/host; **em produção**, o mesmo contrato de
porta trocaria de implementação para um object storage (S3, R2, GCS, etc.) sem tocar nos casos de
uso — decisão registrada e justificada no `design.md`, fora de escopo implementar aqui. Arquivos
nunca são servidos como estáticos públicos: todo acesso passa por um endpoint de download
autenticado com checagem de membership do quadro, igual a qualquer outro sub-recurso do cartão.

## What Changes

- Novo agregado `attachment` no módulo `board`: entidade `Attachment { id, cardId, filename,
  mimeType, size, storageKey, uploadedById, createdAt }`, porta `AttachmentRepository` e porta
  `StorageProvider` (salvar/ler/remover arquivo por `storageKey`), seguindo o mesmo padrão de
  `comment`/`checklist-item` da `017`.
- Casos de uso `add-attachment` (valida tamanho/mimetype/extensão, gera `storageKey` único,
  delega o `save` ao `StorageProvider`, persiste o registro), `list-attachments` (metadados,
  sem o conteúdo do arquivo), `delete-attachment` (autor do upload ou owner do quadro; remove do
  disco e do banco).
- Implementação `LocalDiskStorage` do `StorageProvider`: grava/lê/remove arquivos em
  `apps/backend/storage/uploads/`, diretório fora do git (`.gitignore`), nunca expõe o caminho
  físico ao cliente (apenas `storageKey` interno, nunca retornado nas respostas da API).
- Migration Prisma `Attachment` (FK `cardId` → `Card` cascade, FK `uploadedById` → `User`).
- Endpoints sob `/boards/:boardId/cards/:cardId/attachments`:
  `POST` (multipart, `FileInterceptor`, guard de membership, limite de 10MB, allowlist de
  mimetype/extensão), `GET` (lista metadados), `GET /:id/download` (stream autenticado com
  `Content-Type`/`Content-Disposition`, guard de membership), `DELETE /:id` (autor do upload ou
  owner do quadro).
- Emissão de `card.updated` após criar/remover anexo (mesma decisão da `017` para sub-recursos
  do cartão que não justificam evento dedicado — ver `design.md` para o porquê de não reaproveitar
  o payload completo do `CardResponse` com a lista de anexos).
- Frontend: seção "Anexos" do detalhe do cartão (`018`) ganha upload (seletor de arquivo, barra/
  spinner de progresso, erros por toast), lista de anexos (ícone por tipo de arquivo, nome,
  tamanho formatado, data relativa, botão de download que baixa via `fetch` autenticado + blob),
  e remoção. i18n via `getMessage`.

## Fora de escopo (limite explícito)

- Object storage (S3/MinIO/R2) — arquitetura de porta permite trocar depois, mas a implementação
  concreta desta change é só `LocalDiskStorage`.
- Servir arquivos como estáticos públicos (`app.useStaticAssets`) — todo acesso é via endpoint
  autenticado.
- Versionamento de anexos, preview inline de imagem/PDF, edição de anexo — apenas
  criar/listar/baixar/excluir.
- Antivírus/varredura de malware — fora de escopo; mitigação é allowlist de mimetype/extensão +
  checagem básica de magic bytes, documentada como suficiente para o contexto de
  portfólio/dev, não para produção real com uploads de terceiros não confiáveis.

## Capabilities

### New Capabilities
- `anexos`: novo agregado `attachment` do módulo `board` do TaskBoard Live — upload multipart de
  arquivo em cartão (validação de tamanho/mimetype/extensão), armazenamento em disco local via
  porta `StorageProvider`/`LocalDiskStorage`, persistência Prisma do metadado (`Attachment`),
  listagem de metadados, download autenticado por stream (guard de membership do quadro),
  remoção (autor do upload ou owner do quadro), emissão de `card.updated` via `RealtimeEmitter`
  após cada mutação, e UI da seção "Anexos" no detalhe do cartão (upload, lista, download,
  remoção).

### Modified Capabilities
<!-- Nenhuma: o módulo `board` é estendido com o agregado `attachment`, sem alterar o
comportamento de `board`/`membership`/`card`/`cartao-rico`/`etiquetas` existentes. -->

## Impact

- **Backend**: novo agregado `attachment` (`modules/board/src/attachment/`: entidade, porta
  `AttachmentRepository`, porta `StorageProvider`, casos de uso); implementação
  `LocalDiskStorage` (`apps/backend/src/modules/board/local-disk-storage.provider.ts`);
  repositório Prisma `PrismaAttachmentRepository`; `attachment.controller.ts` (upload/list/
  download/delete); model `Attachment` + migration no schema Prisma modular; `main.ts` sem
  mudança de limite de payload JSON (upload é multipart, não JSON — `multer` já é dependência
  via `@nestjs/platform-express`); diretório `apps/backend/storage/uploads/` criado e
  gitignorado.
- **Frontend**: componente `card-detail-attachments.component.tsx` na tela de detalhe do cartão
  (`018`); chamadas em `card-detail.api.ts` (upload multipart, listar, download via blob,
  remover); i18n.
- **Dependências**: `008` (agregado `card`), `005` (membership/`BoardMember`), `006`
  (`RealtimeEmitter`), `012` (limite de payload/segurança do `main.ts` — helmet, `json({limit})`,
  esta change adiciona a mesma disciplina de validação para multipart), `018` (detalhe do
  cartão — seção "Anexos" já existente no layout, vazia até esta change).
- **Habilita**: mockup do detalhe do cartão fica 100% implementado (nenhuma seção sem backend).
