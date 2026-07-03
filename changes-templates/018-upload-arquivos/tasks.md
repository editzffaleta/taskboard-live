<!-- TEMPLATE — tasks do armazenamento de arquivos. Checkboxes vazios; marque com evidencia. Cada
task tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `001`, `004`. Condicionais: `010` (avatar), `012` (nota do limite multipart).
> **Nao faca:** resize/thumbnail; presigned PUT direto do browser; antivirus; quota; bucket publico.
> **Principio:** validacao antes do storage, chave UUID no disco, acesso sempre autorizado.

## 1. Dominio (novo modulo files)

- [ ] 1.1 Criar o modulo `files` (skill [config-new-module](../../../.claude/skills/config-new-module)) com o agregado `stored-file` (skill [module-aggregate](../../../.claude/skills/module-aggregate)): `ownerId`, `organizationId`, `originalName`, `mimeType`, `size`, `storageKey`, `createdAt`; contrato do repositorio (skill [module-repository](../../../.claude/skills/module-repository)).
  - **Aceite:** agregado + contrato; `storageKey` nunca deriva do nome original.
- [ ] 1.2 Definir o port `storage.provider.ts` (`put`, `getStream`, `delete`, `getSignedUrl?`) e os use cases (skill [module-use-case](../../../.claude/skills/module-use-case)) `upload-file` (valida → storage → registro, com compensacao se o registro falhar), `get-file` (autoriza dono/admin da mesma organizacao) e `delete-file`.
  - **Aceite:** validacoes no use case (tamanho, mime allowlist, magic bytes); compensacao testada; autorizacao coberta.

## 2. Back-end

- [ ] 2.1 Implementar os drivers (skill [backend-provider-implementation](../../../.claude/skills/backend-provider-implementation)): `local.storage.provider` (grava em `UPLOAD_DIR`, default `./uploads`; stream no download) e `s3.storage.provider` (S3-compativel por env; `getSignedUrl` curta). Selecao por `STORAGE_DRIVER` (`local` default).
  - **Aceite:** driver por env; local persiste no diretorio configurado; s3 assina URL de vida curta.
- [ ] 2.2 Sincronizar o Prisma (skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module)): model `stored_file` (indice por organizacao) + repositorio (skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository)).
  - **Aceite:** migration aplicada; repositorio implementa o contrato.
- [ ] 2.3 Controller (skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller)): `POST /files` (multipart com limite `UPLOAD_MAX_MB`), `GET /files/:id` (local → stream; s3 → redirect assinado), `DELETE /files/:id` — todos autenticados e escopados (dono ou admin da organizacao).
  - **Aceite:** upload valido registra e devolve o arquivo; mime fora da allowlist → 422; acima do limite → 413; acesso de outra organizacao → 403/404.
- [ ] 2.4 Envs no `.env.example` (`STORAGE_DRIVER=local`, `UPLOAD_DIR=./uploads`, `UPLOAD_MAX_MB=5`, `UPLOAD_ALLOWED_MIME=image/jpeg,image/png,image/webp,application/pdf`, `S3_ENDPOINT/REGION/BUCKET/KEY/SECRET` vazios) e testes de integracao dos cenarios acima.
  - **Aceite:** envs documentadas; suite verde.

## 3. Front-end

- [ ] 3.1 Componente de upload reutilizavel (input + progresso + erros i18n). **Se `010`:** avatar na B9 usando o componente, guardando `fileId` no user e exibindo via `GET /files/:id`.
  - **Aceite:** componente funcional; avatar presente apenas com a `010` aplicada.

## 4. Verificacao

- [ ] 4.1 Rodar `npx tsc --noEmit` (backend e frontend), os testes e validar manualmente nos dois drivers (local; s3 com MinIO/R2 de teste se disponivel): upload, download autorizado, negacao cross-organizacao, delete.
  - **Aceite:** `tsc` limpo; testes verdes; validacao registrada por driver disponivel.
