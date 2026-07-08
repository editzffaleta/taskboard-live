## Causa-raiz

`GET .../comments` retorna `{ comments: CommentResponse[], total, page, pageSize }`. O tipo
`ListCommentsResult` do frontend declarava `items: CommentDto[]`; a inicialização fazia
`setComments(result.items)` → `undefined` → o estado `comments` virava `undefined` e
`comments.length` estourava no render.

## Correção

- `ListCommentsResult.items` → `comments`.
- `result.items` → `result.comments` na carga inicial e no `loadMore`, com `?? []` defensivo.

Arquivos: `apps/frontend/src/modules/boards/api/card-detail.api.ts`,
`apps/frontend/src/modules/boards/components/card-detail-comments.component.tsx`.
