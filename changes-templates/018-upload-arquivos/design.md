<!-- TEMPLATE — design do armazenamento de arquivos. Placeholders: {{produto}}, {{namespace}}. -->

## Context

Os Dockerfiles ja montam `../files/uploads` (persistencia fora do `code/` efemero do Dokploy) e o
perfil (`010`) pede avatar — faltava o mecanismo. Padrao dos providers do template: port no
dominio, driver por env, vendor so na implementacao.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Um port, dois drivers (local persistente e S3-compativel), troca por env sem tocar codigo.
- Upload seguro: limite de tamanho, allowlist de mimetype com magic bytes, chave UUID no disco.
- Acesso autorizado (dono/admin, mesma organizacao) e registro consultavel.

**Non-Goals:**
- Processamento de imagem (resize/thumbnail) — change futura sobre o mesmo port.
- Upload direto do browser ao S3 (presigned PUT) — otimizacao futura; aqui o backend intermedia.
- Antivirus/scan de conteudo — integravel depois no mesmo funil de validacao.
- Quota por organizacao — politica de produto futura.

## Decisions

- **Backend intermedia o upload**: validacao (tamanho, mime, magic bytes) acontece **antes** de
  tocar o storage, igual nos dois drivers. Alternativa (upload direto ao S3) descartada nesta
  fase: perderia o funil unico de validacao.
- **`storageKey` = UUID + extensao normalizada**: nome original so no registro; evita path
  traversal, colisao e vazamento de informacao pelo nome.
- **Download por autorizacao, nunca por URL publica**: `local` faz stream autenticado; `s3`
  responde redirect com URL assinada de vida curta. Bucket privado sempre.
- **Multipart com limite proprio** (`UPLOAD_MAX_MB`): o limite de body JSON (`012`, se aplicada)
  nao cobre multipart — o limite e declarado no interceptor de upload.
- **Skills**: config-new-module (modulo files), module-aggregate, module-repository,
  module-use-case, backend-provider-implementation (drivers), backend-prisma-sync-module,
  backend-prisma-repository, backend-nest-controller.

## Risks / Trade-offs

- [Mimetype forjado] → Magic bytes + allowlist; extensao normalizada pela assinatura real.
- [Disco local cheio] → Limite por arquivo + monitoramento via `013` (se aplicada); quota e futura.
- [Arquivo orfao (registro sem blob ou vice-versa)] → Escrita: storage primeiro, registro depois;
  falha no registro remove o blob (compensacao no use case).
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
