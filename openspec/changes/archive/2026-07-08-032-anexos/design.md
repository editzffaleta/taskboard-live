## Design — 032-anexos

## Contexto

O módulo `board` já tem `board`/`membership` (`005`), `card` (`008`), `RealtimeEmitter` (`006`),
e o padrão de sub-recurso de cartão estabelecido em `label` (`016`) e
`checklist-item`/`card-assignee`/`comment` (`017`): agregado próprio em
`modules/board/src/<agregado>` (domínio, sem Prisma), implementação Prisma + controller em
`apps/backend/src/modules/board`, guard de membership resolvido via `cardId → listId → boardId`
dentro do caso de uso, evento de tempo real emitido **depois** do caso de uso ter sucesso. Esta
change segue exatamente esse padrão, com uma porta nova: `StorageProvider` (o agregado não é só
metadado — precisa gravar/ler/remover bytes em algum lugar).

## Localização no código

```
modules/board/src/attachment/
  model/
    attachment.entity.ts            <- Attachment { id, cardId, filename, mimeType, size,
                                        storageKey, uploadedById, createdAt }
  provider/
    attachment.repository.ts        <- porta: create, findById, findAllByCardId, delete
    storage.provider.ts             <- porta: save(key, buffer) => storageKey,
                                        read(storageKey) => stream/buffer, remove(storageKey)
  usecase/
    add-attachment.usecase.ts
    list-attachments.usecase.ts
    delete-attachment.usecase.ts

apps/backend/src/modules/board/
  attachment.controller.ts          <- /boards/:boardId/cards/:cardId/attachments
  attachment.prisma.ts              <- PrismaAttachmentRepository
  local-disk-storage.provider.ts    <- LocalDiskStorage implements StorageProvider

apps/backend/storage/uploads/       <- diretório gitignorado, criado em runtime se não existir

apps/frontend/src/modules/boards/
  api/card-detail.api.ts            <- ajustado: uploadAttachment, listAttachments,
                                        downloadAttachment (blob), deleteAttachment
  components/card-detail-attachments.component.tsx   <- seção "Anexos" (novo)
  components/card-detail-modal.component.tsx         <- ajustado: monta a seção nova
```

## Modelo de dados

**`Attachment`**: `id` (uuid), `cardId` (FK → `Card`, cascade — excluir cartão remove seus
anexos, mesma decisão de `ChecklistItem`/`Comment` na `017`), `filename` (string, nome original
do arquivo, sanitizado — ver "Segurança"), `mimeType` (string, detectado no upload), `size` (int,
bytes), `storageKey` (string, nome gerado do arquivo no disco — `uuid + extensão original`,
**nunca** o `filename` original, para não colidir nomes nem vazar caminho), `uploadedById` (FK →
`User`, sem cascade — mesma decisão de `Comment.authorId` na `017`: manter o registro do anexo
mesmo se o usuário for removido é fora de escopo), `createdAt`.

Migration: novo model no schema modular (`apps/backend/prisma/models/board.model.prisma`), sem
alterar nenhum model existente.

## Porta `StorageProvider` e `LocalDiskStorage`

```ts
interface StorageProvider {
  save(storageKey: string, content: Buffer): Promise<void>;
  read(storageKey: string): Promise<Buffer>;
  remove(storageKey: string): Promise<void>;
}
```

`LocalDiskStorage` é a única implementação: grava/lê/remove arquivos em
`apps/backend/storage/uploads/`, resolvendo `path.join(UPLOADS_DIR, storageKey)`. O diretório é
criado em runtime (`fs.mkdirSync(..., {recursive: true})`) se não existir, e está listado no
`.gitignore` (nunca commitado, junto de `.env`). **Decisão de produção**: em um ambiente real,
`StorageProvider` teria uma segunda implementação (`S3Storage`, por exemplo) trocada por injeção
de dependência no módulo Nest, sem qualquer mudança nos casos de uso — é exatamente para isso que
a porta existe. Implementar essa segunda variante está fora do escopo desta change (não há
credencial de object storage disponível no ambiente de portfólio/dev).

`storageKey` é sempre gerado no backend (`crypto.randomUUID() + extensão sanitizada do arquivo
original`) — nunca deriva do `filename` do usuário, eliminando path traversal
(`../../etc/passwd`) e colisão de nomes por construção, sem precisar de sanitização adicional na
escrita. O `filename` original é sanitizado só para exibição/`Content-Disposition` (remove
separadores de caminho `/`, `\`, `..` e caracteres de controle antes de persistir).

## Casos de uso

- **`add-attachment(cardId, boardId, requesterId, file: {originalName, mimeType, size, buffer})`**:
  1. valida membership do quadro (via `cardId → listId → boardId`, padrão cross-board da `008`/
     `016`/`017`);
  2. valida `size <= 10 * 1024 * 1024` (10MB) — rejeita antes de gravar no disco;
  3. valida `mimeType` contra a allowlist (ver "Validação" abaixo) — rejeita antes de gravar;
  4. sanitiza `originalName` (remove separadores de caminho/caracteres de controle) só para
     exibição;
  5. gera `storageKey = randomUUID() + extensão sanitizada`;
  6. chama `StorageProvider.save(storageKey, buffer)`;
  7. persiste `Attachment` via `AttachmentRepository.create`;
  8. retorna o metadado criado (nunca o `storageKey` na resposta da API — campo interno).
- **`list-attachments(cardId, boardId, requesterId)`**: valida membership; retorna metadados
  (`id, filename, mimeType, size, createdAt, uploadedBy: {id, name}`), sem `storageKey`.
- **`delete-attachment(attachmentId, cardId, boardId, requesterId)`**: valida membership; valida
  que o anexo pertence ao `cardId` da rota (cross-card, mesmo padrão de `checklist-item`);
  autoriza a exclusão apenas se `requesterId === attachment.uploadedById` **ou** `requesterId`
  é `owner` do quadro (decisão: diferente de `Comment`, que é autor-only puro — aqui o owner do
  quadro também pode remover, pois anexos podem violar política do quadro e o owner precisa
  poder agir mesmo que não seja quem enviou); chama `StorageProvider.remove(storageKey)` e
  `AttachmentRepository.delete`, nessa ordem (se a remoção do disco falhar, não remove o
  registro — evita órfão de metadado sem arquivo; se o registro no banco falhar após remover do
  disco, é um cenário aceito como raro/idempotente na re-tentativa, documentado, não tratado com
  transação distribuída nesta change).

## Validação de upload (tamanho, mimetype, extensão, magic bytes)

- **Tamanho**: limite de 10MB, configurado no `FileInterceptor` (`limits.fileSize`) *e*
  revalidado no caso de uso (defesa em profundidade) — rejeita com erro 413/422 antes de
  qualquer escrita em disco.
- **Allowlist de mimetype + extensão** (avaliação conjunta — o mimetype declarado pelo cliente é
  o dado disponível sem dependência nova; ver nota de magic bytes abaixo):
  - Imagens: `image/png` (`.png`), `image/jpeg` (`.jpg`/`.jpeg`), `image/gif` (`.gif`),
    `image/webp` (`.webp`).
  - Documentos: `application/pdf` (`.pdf`), `text/plain` (`.txt`),
    `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (`.docx`).
  - Qualquer mimetype/extensão fora dessa lista é rejeitado com erro 422 antes de gravar no
    disco.
- **Magic bytes (assinatura binária)**: para as imagens e o `.pdf` (formatos com assinatura de
  bytes estável e bem documentada: PNG `89 50 4E 47`, JPEG `FF D8 FF`, GIF `47 49 46 38`, WEBP
  `RIFF....WEBP`, PDF `25 50 44 46`), o caso de uso confere os primeiros bytes do buffer contra
  a assinatura esperada do mimetype declarado, rejeitando divergência (ex.: um `.exe` renomeado
  para `.png`). Para `.txt`/`.docx` (sem assinatura binária simples/`.docx` é um zip — checagem
  de assinatura `PK\x03\x04` é suficiente e é aplicada) a checagem cobre o que é
  razoável sem uma lib de detecção de tipo dedicada (`file-type` ou similar não é dependência
  do projeto; adicionar uma lib nova só para isso é decisão consciente de não fazer nesta
  change — registrado aqui como limite: suficiente para o ethos de segurança do projeto no
  contexto de portfólio, insuficiente para um produto que aceita upload de terceiros não
  confiáveis em produção).
- Erros de validação retornam o padrão `ApiErrorResponse` já usado pelo backend; nenhum arquivo é
  gravado em disco nem registro criado quando a validação falha.

## Endpoints e autorização

Protegidos pelo guard de autenticação JWT global (`004`) e por checagem de `BoardMember` do
quadro (`005`) — resolução cross-board `cardId → listId → boardId` idêntica à de `checklist-item`
(`017`):

- `POST /boards/:boardId/cards/:cardId/attachments` — multipart/form-data, campo `file`,
  `FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } })` → `add-attachment`.
  Resposta: metadado do anexo criado.
- `GET /boards/:boardId/cards/:cardId/attachments` → `list-attachments`. Resposta: array de
  metadados.
- `GET /boards/:boardId/cards/:cardId/attachments/:id/download` → `list-attachments` (para
  achar o registro) + `StorageProvider.read`; resposta é um stream com
  `Content-Type: <mimeType>` e `Content-Disposition: attachment; filename="<filename
  sanitizado>"`. **Nunca** serve o arquivo por caminho estático público — a rota exige o mesmo
  JWT + membership de qualquer outro endpoint do backend.
- `DELETE /boards/:boardId/cards/:cardId/attachments/:id` → `delete-attachment` (403 se
  requisitante não é nem autor do upload nem owner do quadro).

## Board-detail e payload do cartão: anexos ficam fora (decisão registrada)

Diferente de `labels`/`dueDate`/`assignees`/`checklist` (hidratados em todo `CardResponse` desde
`016`/`017`), **anexos não entram no payload do cartão nem no `GET /boards/:id`**. Motivo: o
metadado de anexo é pesado o bastante (e potencialmente numeroso) para não valer a pena incluir
em toda carga do quadro e em todo evento `card.updated` disparado por qualquer outra mutação do
cartão (mover, editar, etiquetar) — mesmo raciocínio que a `017` já registrou para excluir
`comments` do payload. A `018` chama `GET .../attachments` sob demanda quando abre o detalhe do
cartão, do mesmo jeito que já faz para `GET .../comments`.

**Evento de tempo real**: `add-attachment`/`delete-attachment` emitem `card.updated` com o
`CardResponse` completo (sem lista de anexos, pelo motivo acima) — serve apenas para notificar
que o cartão mudou (outro cliente pode então re-chamar `GET .../attachments` se tiver o detalhe
aberto). Alternativa considerada e descartada: evento dedicado `attachment.created`/
`attachment.deleted` — mantido `card.updated` por simplicidade e por já ser o sinal que o
frontend usa para saber "este cartão mudou, refaça a leitura sob demanda se estiver com o
detalhe aberto"; caso a `018` precise de granularidade maior no futuro, é extensão aditiva, não
breaking.

## Frontend: upload multipart e download autenticado via blob

- **Upload**: input `<input type="file">` oculto, disparado pelo botão "Anexo"; ao selecionar,
  monta um `FormData` com o arquivo e chama `fetch(url, { method: 'POST', headers: {
  Authorization: 'Bearer <token>' }, body: formData })` — **sem** `Content-Type` manual (o
  browser define o `boundary` do multipart sozinho). Exibe spinner/barra durante o upload;
  erro (tamanho/tipo) vira toast com a mensagem do `ApiErrorResponse`.
- **Listagem**: `GET .../attachments` no `useEffect` de abertura do detalhe do cartão (mesmo
  padrão de `list-comments` da `018`), com ícone por `mimeType` (pdf, imagem, genérico),
  `filename`, tamanho formatado (`KB`/`MB`) e data relativa (mesma função de data relativa já
  usada pelos comentários/atividade).
- **Download**: como o endpoint exige `Authorization`, não é possível usar um `<a href>` puro
  (o browser não manda header customizado em navegação simples). O botão de download chama
  `fetch(url, { headers: { Authorization: 'Bearer <token>' } })`, lê a resposta como `blob()`,
  cria uma URL de objeto (`URL.createObjectURL`) e dispara um `<a>` temporário com `download=
  filename`, revogando a URL depois (`URL.revokeObjectURL`) para não vazar memória.
- **Remoção**: `DELETE .../attachments/:id`, com confirmação simples (mesmo padrão de exclusão
  de comentário/checklist), atualiza a lista local e deixa o `card.updated` reconciliar o resto.

## Segurança (resumo, ver também `.claude/skills/security-review`)

- **Path traversal**: eliminado por construção — `storageKey` nunca deriva de entrada do
  usuário (sempre `randomUUID()` + extensão sanitizada); leitura/escrita sempre resolvem dentro
  de `UPLOADS_DIR` via `path.join`, nunca concatenação direta de string vinda do cliente.
  `filename` original só é usado para `Content-Disposition` (sanitizado, sem separador de
  caminho).
- **Sem estático público**: nenhuma rota `app.useStaticAssets`/`ServeStaticModule` aponta para
  `storage/uploads/` — todo acesso passa pelo guard de membership do endpoint de download.
- **Allowlist + tamanho + magic bytes**: ver seção de validação acima.
- **Segredos**: diretório de storage não contém segredo algum, mas fica fora do git por
  disciplina (arquivos de usuário não pertencem ao histórico do repositório).

## Fora de escopo

- Implementação de object storage real (S3/MinIO) — só a porta permite a troca futura.
- Servir arquivo como estático público.
- Antivírus/detecção de malware além de allowlist + magic bytes básicos.
- Preview inline de imagem/PDF no navegador, versionamento de anexo, edição de anexo.
- Inclusão de anexos no payload de `CardResponse`/`GET /boards/:id` (decisão registrada acima).
