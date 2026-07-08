> **Pré:** `028` (backend retorna 401 para sessão inválida). **Não faça:** refresh token,
> sessão em banco, backend.

## 1. Tratamento global de 401

- [x] 1.1 Criar `apps/frontend/src/shared/lib/session.ts` com `handleUnauthorized()` (remove o
  cookie `auth_token` e redireciona para `/join`, guardado contra loop e sem redirecionar em
  rotas públicas).
  - **Aceite:** util idempotente por navegação; não redireciona em `/`, `/join`, `/convite`.
  > ✅ 2026-07-08 — session.ts criado com guarda `handling` e checagem de rota pública.
- [x] 1.2 Ligar `handleUnauthorized()` em todos os helpers de request (boards, notifications,
  account, activity, members, invitations): ao detectar `response.status === 401`, chamar antes
  de lançar o erro.
  - **Aceite:** os 6 módulos tratam 401 chamando `handleUnauthorized()`.
  > ✅ 2026-07-08 — hook inserido antes de `if (!response.ok)` em cada helper.

## 2. Verificação

- [x] 2.1 `npx turbo run lint check-types --filter=@taskboard/frontend` e build verdes.
  - **Aceite:** tsc/lint/build limpos.
  > ✅ 2026-07-08 — lint/check-types/build verdes (1 warning pré-existente não relacionado).
