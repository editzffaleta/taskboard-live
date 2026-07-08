## Contexto

Cada módulo do frontend tem seu próprio helper `request()` (boards, notifications, account,
activity, members) e o `invitations.api` faz `fetch` direto. Nenhum tratava 401 de forma
global — o erro virava toast via `getMessage(code)`, e como o backend (`028`) retorna a
mensagem "Sessão inválida" (não um código i18n), o resultado era "Erro desconhecido: Sessão
inválida".

## Decisão

`shared/lib/session.ts` exporta `handleUnauthorized()`:
- `Cookies.remove('auth_token')` (mesmo cookie do AuthContext, `004`).
- Redireciona para `/join?expirada=1` via `window.location.href`, **exceto** em rotas públicas
  (`/`, `/join`, `/convite`) — evita loop e não desloga quem já está no fluxo público.
- Guardado por uma flag de módulo (`handling`) para não disparar múltiplas vezes na mesma
  navegação (vários requests podem 401 juntos).

Cada helper de request, ao ver `response.status === 401`, chama `handleUnauthorized()` antes de
lançar o `*ApiError`. O AuthContext (`004`) já removia o cookie no logout; aqui o gatilho passa
a ser qualquer 401 de API, cobrindo o caso de conta excluída (`021`) / sessão inválida (`028`).

Arquivos: `apps/frontend/src/shared/lib/session.ts` (novo); helpers em
`apps/frontend/src/modules/{boards/api/boards.api,notifications/api/notifications.api,auth/api/account.api,boards/api/activity.api,boards/api/members.api,boards/api/invitations.api}.ts`.

## Fora de escopo

Refresh token, renovação silenciosa de sessão, mensagem i18n dedicada no /join (o redirect já
resolve o bloqueio; `?expirada=1` fica disponível para um aviso futuro).
