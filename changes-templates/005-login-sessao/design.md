<!-- TEMPLATE — design do login/sessao. Placeholders: {{produto}}, {{namespace}}. -->

## Context

O modulo `auth` (agregado `user`) ja existe com `UserRepository` e `CryptoProvider` (`004`), e o
`user` e multi-tenant (`organizationId`, `role`, `status`). A `003` deixou a convencao de escopo por
`organizationId` pronta, adiando para esta mudanca o binding com a sessao. Aqui se conclui a
autenticacao: login no dominio, geracao de JWT na camada HTTP (com `organizationId`/`role`), sessao
em cookie no frontend e protecao das rotas privadas.

Principio central: **o modulo de negocio nao conhece JWT, token, sessao nem transporte HTTP**. O
`login-user` devolve apenas atributos publicos; o token e responsabilidade exclusiva do backend.

A base JWT da `001` ja expoe `AuthenticatedUser`, `auth-user.mapper.ts`, `jwt.strategy.ts` e
`current-user.decorator.ts`; o `JwtPayload` aceita claims customizadas. Esta mudanca estende esse
contrato para carregar tenant e papel.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Implementar `login-user` retornando `{ id, name, email, role, organizationId }`, com gate de status
  e testes cobrindo credenciais validas/invalidas e inativo.
- Gerar o JWT somente no `auth.controller.ts`, com payload `{ sub, name, email, role, organizationId }`.
- Ativar o binding de tenant: `AuthenticatedUser`/mapper expoem `organizationId` e `role`; novo
  `current-organization.decorator`.
- Persistir a sessao em cookie `auth_token` e proteger o grupo `(private)` com `AuthGuard`/`AuthContext`.

**Non-Goals:**
- Introduzir qualquer abstracao de token/JWT/sessao no dominio (nada de `TokenProvider`).
- Aplicar gating de sidebar por papel ou autorizacao por permissao — e a `006`.
- Construir dashboards por papel — o destino pos-login e uma rota inicial placeholder.
- Trocar `fetch` nativo por biblioteca HTTP.

## Decisions

- **JWT fora do dominio**: `modules/auth` nao importa nem cria abstracoes de token. A saida de
  `login-user` sao estritamente atributos publicos. Alternativa (`TokenProvider` no dominio)
  descartada por vazar transporte para o negocio.
- **Payload do JWT com `role` e `organizationId`**: necessario para o escopo multi-tenant e o gating
  por papel. O `current-organization.decorator` le `organizationId` das claims, espelhando o
  `current-user.decorator`.
- **Mensagem generica em credenciais invalidas**: usuario inexistente e senha incorreta lancam o
  mesmo `DomainError('user.credentials.invalid', 401)`.
- **Gate de status no login (seguranca)**: apos validar as credenciais, se `status !== 'active'`,
  lancar `DomainError('user.inactive', 403)`. Os estados `pending`/`inactive` que o disparam sao
  produzidos por fluxos posteriores (aprovacao na `008`, CRUD admin). Trade-off aceito: a mensagem
  dedicada melhora a UX sem expor dados sensiveis.
- **Decode UTF-8 do JWT no frontend**: base64url → `Uint8Array` → `TextDecoder('utf-8')`, preservando
  acentuacao; `decodeJwtPayload` tambem le `role` e `organizationId`.
- **Cookie `auth_token`**: `sameSite: 'lax'`, `secure` em producao, sem `httpOnly` (o client
  reidrata o contexto). Expiracao do token e do cookie **alinhadas em 7 dias**. A `009b` (MFA) reforca
  a autenticacao; refresh/sessoes curtas podem ser revisitados la.
- **Destino pos-login placeholder**: a rota privada inicial do app. O destino por papel e definido
  quando os dashboards existirem.
- **AuthProvider abrange `(public)` e `(private)`**; **`AuthGuard` envolve o layout `(private)`**.

## Risks / Trade-offs

- [Cookie sem `httpOnly`] → Aceito por necessidade de reidratacao no client; mitigado por
  `sameSite: 'lax'`, `secure` em producao e payload sem dados sensiveis.
- [Gate de status revela conta inativa] → Aceito; mensagem dedicada `user.inactive` melhora a UX sem
  expor dados sensiveis.
- [Flash de conteudo durante hidratacao] → `AuthGuard` renderiza placeholder neutro enquanto
  `status === 'loading'`; `/join` nao renderiza formulario enquanto carrega.
- [Skill indicada nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
