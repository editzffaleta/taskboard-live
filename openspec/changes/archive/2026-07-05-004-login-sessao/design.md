## Context

O modulo `auth` (agregado `user`) ja existe com `UserRepository` e `CryptoProvider` (`003`), e o
`user` e simples: `{ id, name, email, password }`, sem organizacao, papel ou status. Aqui se conclui
a autenticacao: login no dominio, geracao de JWT na camada HTTP e sessao em cookie no frontend,
protegendo as rotas privadas.

Principio central: **o modulo de negocio nao conhece JWT, token, sessao nem transporte HTTP**. O
`login-user` devolve apenas atributos publicos; o token e responsabilidade exclusiva do backend.

A base JWT da `001` ja expoe `AuthenticatedUser`, `auth-user.mapper.ts`, `jwt.strategy.ts` e
`current-user.decorator.ts`, prontos para consumir o payload `{ sub, name, email }` sem qualquer
extensao de tenant/papel.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Implementar `login-user` retornando `{ id, name, email }`, com testes cobrindo credenciais
  validas/invalidas.
- Gerar o JWT somente no `auth.controller.ts`, com payload `{ sub, name, email }`.
- Persistir a sessao em cookie `auth_token` e proteger o grupo `(private)` com `AuthGuard`/
  `AuthContext`.
- Expor o `userId` autenticado via `current-user.decorator.ts` para as changes de dominio do kanban
  usarem na autorizacao por quadro (owner/membro).

**Non-Goals:**
- Introduzir qualquer abstracao de token/JWT/sessao no dominio (nada de `TokenProvider`).
- Qualquer nocao de organizacao, papel global ou status de usuario na sessao.
- Refresh token ou MFA.
- Construir dashboards — o destino pos-login e uma rota inicial placeholder.
- Trocar `fetch` nativo por biblioteca HTTP.

## Decisions

- **JWT fora do dominio**: `modules/auth` nao importa nem cria abstracoes de token. A saida de
  `login-user` sao estritamente atributos publicos. Alternativa (`TokenProvider` no dominio)
  descartada por vazar transporte para o negocio.
- **Payload do JWT minimo**: `{ sub, name, email }`. Sem `role`/`organizationId` — o TaskBoard Live
  nao tem RBAC global; a autorizacao por quadro consulta membership no proprio agregado de quadro,
  usando o `userId` (`sub`) do token.
- **Mensagem generica em credenciais invalidas**: usuario inexistente e senha incorreta lancam o
  mesmo `DomainError('user.credentials.invalid', 401)`.
- **Decode UTF-8 do JWT no frontend**: base64url → `Uint8Array` → `TextDecoder('utf-8')`, preservando
  acentuacao.
- **Cookie `auth_token`**: `sameSite: 'lax'`, `secure` em producao, sem `httpOnly` (o client
  reidrata o contexto). Expiracao do token e do cookie **alinhadas em 7 dias**.
- **Destino pos-login placeholder**: a rota privada inicial do app (ex.: lista de quadros, quando
  existir).
- **AuthProvider abrange `(public)` e `(private)`**; **`AuthGuard` envolve o layout `(private)`**.

## Risks / Trade-offs

- [Cookie sem `httpOnly`] → Aceito por necessidade de reidratacao no client; mitigado por
  `sameSite: 'lax'`, `secure` em producao e payload sem dados sensiveis.
- [Flash de conteudo durante hidratacao] → `AuthGuard` renderiza placeholder neutro enquanto
  `status === 'loading'`; `/join` nao renderiza formulario enquanto carrega.
- [Skill indicada nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
