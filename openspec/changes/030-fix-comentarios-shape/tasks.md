> **Pré:** `017` (comentários), `018` (detalhe do cartão). **Não faça:** backend.

## 1. Alinhar o contrato de comentários

- [x] 1.1 `ListCommentsResult.items` → `comments` no cliente; ler `result.comments` (com `?? []`)
  na carga inicial e no "carregar mais".
  - **Aceite:** abrir o detalhe do cartão não estoura; comentários listam; `tsc` limpo.
  > ✅ 2026-07-08 — campo alinhado ao backend ({comments,total,page,pageSize}); tsc verde; shape confirmado via curl.

## 2. Verificação

- [x] 2.1 `npx turbo run lint check-types --filter=@taskboard/frontend` e build verdes.
  - **Aceite:** tsc/lint/build limpos.
  > ✅ 2026-07-08 — verdes.
