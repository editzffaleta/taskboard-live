<!--
TEMPLATE DE CHANGE — 018-upload-arquivos (storage local/S3 com validacao + registro).
Extensao transversal (opcional). O volume ../files/uploads dos Dockerfiles ja previa isto.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/armazenamento-de-arquivos/spec.md` (se existir) · esta
> change (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md`
> citar nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

Nenhum fluxo do nucleo consegue receber um arquivo — e avatar (`010`), anexos e documentos sao
pedidos inevitaveis de qualquer produto. Esta mudanca cria o **armazenamento de arquivos** com
port unico e dois drivers (disco local persistente ou S3-compativel), validacao rigorosa e
registro por organizacao, sem acoplar o dominio a vendor.

## What Changes

- **Port `storage.provider.ts`** no novo modulo `files` (`put`, `getStream`, `delete`,
  `getSignedUrl?`), com drivers:
  - `local` (default): grava em `UPLOAD_DIR` (default `./uploads` — em producao, o bind
    `../files/uploads` que os Dockerfiles ja montam);
  - `s3`: S3-compativel (AWS/R2/MinIO) por env (`S3_ENDPOINT/REGION/BUCKET/KEY/SECRET`),
    com URL assinada para download.
- **Agregado `stored-file`**: `id`, `ownerId`, `organizationId`, `originalName`, `mimeType`,
  `size`, `storageKey` (UUID + extensao — nunca o nome original no disco), `createdAt`.
- **Validacao no upload**: tamanho maximo (`UPLOAD_MAX_MB`, default 5), allowlist de mimetypes
  (`UPLOAD_ALLOWED_MIME`, default imagens + pdf), verificacao de assinatura (magic bytes) alem do
  header, nome sanitizado.
- **Endpoints autenticados**: `POST /files` (multipart, registra e devolve o `stored-file`) e
  `GET /files/:id` (dono ou admin da organizacao; `local` → stream, `s3` → redirect assinado);
  `DELETE /files/:id` (dono/admin).
- **Integracao condicional (`010`)**: avatar no perfil (B9) passa a usar o upload, guardando o
  `fileId` no user.

## Capabilities

### New Capabilities
- `armazenamento-de-arquivos`: upload validado, armazenamento por driver (local/S3) e acesso
  autorizado a arquivos do {{produto}}, escopado por organizacao.

### Modified Capabilities
<!-- Nenhuma reescrita: o avatar (010) e ponto de extensao condicional. -->

## Impact

- **Dominio**: novo modulo `files` (agregado + contrato + use cases `upload/get/delete-file`).
- **Backend**: drivers `local`/`s3` (SDK S3 apenas no driver), migration `stored_file`,
  controller multipart com validacao; envs novas no `.env.example`.
- **Frontend**: componente de upload reutilizavel; avatar na B9 **se `010`** aplicada.
- **Dependencias**: `001`, `004` (user/organizacao). Condicionais: `010` (avatar), `012` (o
  limite de body JSON nao se aplica a multipart — limite proprio aqui).
- **Habilita**: anexos de dominio (documentos, comprovantes) sobre o mesmo port.
