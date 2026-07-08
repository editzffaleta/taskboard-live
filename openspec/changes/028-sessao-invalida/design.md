## Context

O `JwtAuthModule` (`apps/backend/src/shared/auth/jwt-auth.module.ts`) é a base compartilhada de
autenticação da `001`: registra `PassportModule`, `JwtModule` e a `JwtStrategy`
(`jwt.strategy.ts`), usada pelo `JwtAuthGuard` (`jwt-auth.guard.ts`, guard global via `APP_GUARD`
em `app.module.ts`). Hoje `JwtStrategy.validate(payload: JwtPayload): AuthenticatedUser` é
**síncrono** e só chama `mapJwtPayloadToAuthenticatedUser(payload)` (`auth-user.mapper.ts`) — pura
transformação de claims, sem I/O.

O `UserRepository` (interface em `modules/auth/src/user/provider/user.repository.ts`, método
`findById(id): Promise<User | null>` já existente) é implementado por `PrismaUserRepository`
(`apps/backend/src/modules/auth/user.prisma.ts`) e provido/exportado pelo `AuthModule`
(`apps/backend/src/modules/auth/auth.module.ts`, `providers`/`exports: [PrismaUserRepository, ...]`).

A `021` (excluir conta) apaga a linha de `User` no banco; o JWT emitido antes da exclusão continua
válido (assinatura íntegra, não expirado) até o `exp` — hoje isso basta para "autenticar".

Referências compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- `JwtStrategy.validate` passa a confirmar, com uma consulta ao `UserRepository`, que o usuário do
  `sub` existe; caso contrário, lança `UnauthorizedException` — o Passport intercepta essa exceção
  e a requisição nunca alcança controller/caso de uso, então nenhum 500 de FK acontece depois.
- Resolver o wiring (`JwtAuthModule` precisa do `UserRepository`) sem dependência circular.
- Cobrir explicitamente o caso de conta excluída (`021`) como motivo concreto do bug.

**Non-Goals:**
- Refresh token, blacklist de tokens, sessão em banco (session store) — não é o problema aqui; o
  problema é apenas "o usuário ainda existe?", resolvido com uma leitura simples.
- Revogação de token antes da expiração por outros motivos (troca de senha, logout de outros
  dispositivos) — fora de escopo; isso seria uma change de "invalidação ativa de sessão", diferente
  de "usuário não existe mais".
- Qualquer mudança de UI/UX no frontend — o 401 já é tratado (logout) desde a `004`.

## Decisions

- **Abordagem escolhida: `JwtStrategy.validate` assíncrono + injeção do `PrismaUserRepository`.**
  Alternativas descartadas:
  - *Guard/interceptor dedicado pós-Passport*: adicionaria uma segunda camada de verificação
    fora da estratégia, duplicando a leitura de `sub` e criando uma janela onde
    `@CurrentUser()` já teria sido resolvido com um usuário inexistente antes do guard rodar.
    A validação pertence à própria estratégia, que é o ponto único de "isso é um usuário válido?".
  - *Checar existência em cada caso de uso*: repetiria a regra em toda feature nova; a
    `JwtStrategy` já é o ponto central por onde toda requisição autenticada passa.
  - **Escolhida:** verificar dentro do `validate()` da estratégia — Passport já suporta
    `validate` assíncrono (retorna `Promise<AuthenticatedUser>`) e lança `UnauthorizedException`
    normalmente a partir dali.
- **Wiring sem ciclo:** `JwtAuthModule` passa a `imports: [..., AuthModule]` para poder injetar
  `PrismaUserRepository` no `JwtStrategy`. Isso é seguro porque `AuthModule` **não** importa
  `JwtAuthModule` (verificado em `auth.module.ts`: importa apenas `DbModule` e
  `forwardRef(() => BoardModule)`); o único lugar que importa ambos os módulos lado a lado é
  `app.module.ts`, no nível da raiz, onde ordem de import não cria ciclo. Não é necessário
  `forwardRef` nessa direção.
- **Custo aceito:** uma consulta a mais (`findById`) por request autenticado. É o preço correto de
  fechar o buraco de robustez; o volume de requests autenticadas do TaskBoard Live não justifica
  cache/otimização nesta change — se a carga exigir, é uma change futura de performance.
- **Efeito no cliente:** o token de um usuário inexistente passa a devolver **401** (em vez de 500
  na primeira operação com FK). O frontend já trata 401 fazendo logout (guard de auth herdado da
  `004`) — nenhuma mudança de comportamento do cliente é necessária; a diferença é que agora o
  401 acontece **imediatamente** na primeira requisição autenticada após a exclusão da conta, não
  apenas na primeira operação que usa `userId` como FK.
- **(Opcional) rede de segurança no `ApiExceptionFilter`:** mapear
  `PrismaClientKnownRequestError` com `code === 'P2003'` (violação de FK) para um erro tratado
  (ex.: 400 com mensagem genérica) em vez de vazar 500 cru, cobrindo qualquer FK órfã não coberta
  pelo fix principal. Simples, sem introduzir lógica de negócio no filtro.
- **Skills:** backend-nest-config (wiring de módulo/estratégia), backend-nest-controller (se o
  filtro de exceção for tocado).

## Risks / Trade-offs

- [Uma consulta extra por request autenticado] → Aceito; correto e barato (leitura por chave
  primária/índice único).
- [`JwtAuthModule` ganhar dependência de `AuthModule`] → Unidirecional, sem ciclo (`AuthModule` não
  importa `JwtAuthModule`); validado por leitura de `auth.module.ts`.
- [Confundir esta change com revogação ativa de sessão] → Fora de escopo; guardrail explícito nas
  tasks (não fazer refresh token/blacklist/sessão em banco).
- [Regressão em testes de integração que assumem qualquer `sub` válido sem usuário no banco] →
  Tasks cobrem os dois caminhos (usuário existente segue normal; usuário inexistente → 401) e
  pedem rodar a suíte completa do backend para flagrar qualquer teste que dependesse do
  comportamento antigo.
