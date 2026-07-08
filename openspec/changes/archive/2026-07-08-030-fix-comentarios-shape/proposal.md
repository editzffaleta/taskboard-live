> **CONTRATO DE LEITURA (obrigatório):** `openspec/project.md` · `AGENTS.md` ·
> `openspec/EXECUTION-LOG.md` · `openspec/shared/` · esta change.
> **NÃO ler** o repositório inteiro nem `openspec/changes/archive/`.

## Why

Abrir o detalhe de um cartão estourava o error boundary ("Algo deu errado"):
`TypeError: Cannot read properties of undefined (reading 'length')` em
`card-detail-comments.component.tsx`. Causa: descasamento de contrato — o endpoint
`GET /boards/:boardId/cards/:cardId/comments` (017) retorna `{ comments, total, page, pageSize }`,
mas o cliente frontend tipava/lia o campo como `items`, tornando a lista `undefined`.

## What Changes

- Alinhar o cliente frontend ao shape real do backend: `ListCommentsResult.comments` (era `items`);
  ler `result.comments` na carga inicial e no "carregar mais", com guarda defensiva `?? []`.

## Capabilities

### Modified Capabilities
- `detalhe-cartao`: corrige a leitura da lista de comentários (campo `comments`), evitando o crash
  ao abrir o detalhe do cartão.

## Impact

- **Frontend**: `modules/boards/api/card-detail.api.ts` e `components/card-detail-comments.component.tsx`.
- **Sem backend**: apenas alinhamento ao contrato já existente.
