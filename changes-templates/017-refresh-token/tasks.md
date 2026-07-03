<!-- TEMPLATE — tasks da sessao rotativa. Checkboxes vazios; marque com evidencia. Cada task tem
**Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `005` (login/guard/client), `004`. Condicional: `009b` (par so apos a 2ª
> etapa). **Nao faca:** tela de dispositivos; mudar o armazenamento do access no cliente; SSO;
> refresh como JWT; guardar refresh em claro no banco. **Principio:** reuso de refresh = familia
> revogada.

## 1. Dominio (modulo auth)

- [ ] 1.1 Criar o agregado `refresh-token` (skill [module-aggregate](../../../.claude/skills/module-aggregate)): `familyId`, `userId`, `tokenHash`, `expiresAt`, `revokedAt?`, `replacedByHash?`; contrato do repositorio (skill [module-repository](../../../.claude/skills/module-repository)) com `create`, `findByHash`, `revokeFamily`.
  - **Aceite:** agregado + contrato; nada de token em claro no modelo.
- [ ] 1.2 Casos de uso (skill [module-use-case](../../../.claude/skills/module-use-case)): `issue-refresh-token` (novo familyId no login), `rotate-refresh-token` (valida hash → emite novo elo e encadeia; elo ja usado/revogado → `revoke-family` + erro `auth.refresh_reuse_detected`), `revoke-refresh-family` (logout/admin).
  - **Aceite:** rotacao encadeia; reuso revoga a familia; testes cobrem expirado/revogado/reuso.

## 2. Back-end

- [ ] 2.1 Sincronizar o Prisma (skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module)): model `refresh_token` (indices por familyId e tokenHash unico) + repositorio (skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository)); rotacao em transacao.
  - **Aceite:** migration aplicada; `tokenHash @unique`; rotacao atomica.
- [ ] 2.2 Reduzir o access token para `ACCESS_TOKEN_TTL` (default `15m`) e emitir o **par** no login: refresh opaco em cookie `httpOnly; secure; sameSite=strict; path=/auth/refresh` com `REFRESH_TOKEN_TTL` (default `7d`). **Se `009b`:** o par so nasce em `POST /auth/login/mfa`.
  - **Aceite:** login devolve access curto + cookie httpOnly restrito; com `009b`, a 1ª etapa segue emitindo so o desafio.
- [ ] 2.3 Criar `POST /auth/refresh` (rotaciona e devolve novo access + novo cookie) e `POST /auth/logout` (revoga a familia e limpa o cookie); reuso detectado responde 401 com `auth.refresh_reuse_detected`.
  - **Aceite:** renovacao funciona so pelo cookie; logout revoga (refresh seguinte falha); reuso → familia toda 401.
- [ ] 2.4 Envs no `.env.example` (`ACCESS_TOKEN_TTL=15m`, `REFRESH_TOKEN_TTL=7d`) e chaves i18n novas (pt/en).
  - **Aceite:** envs e i18n atualizados.
- [ ] 2.5 Testes de integracao: fluxo completo (login → access expira → refresh → segue), reuso revogando familia, logout real, expiracao do refresh.
  - **Aceite:** cenarios cobertos; suite verde.

## 3. Front-end

- [ ] 3.1 Interceptor no client HTTP: `401` do access → `POST /auth/refresh` (serializado: uma renovacao por vez; demais requisicoes aguardam) → repete a original; refresh falhou → logout local + redirect `/join`. `AuthContext` reflete a sessao renovada.
  - **Aceite:** sessao renova transparente; expiracao do refresh derruba para o `/join` sem loop.

## 4. Verificacao

- [ ] 4.1 Rodar `npx tsc --noEmit` (backend e frontend), os testes e validar manualmente com `ACCESS_TOKEN_TTL=30s`: navegar alem do TTL (renova sozinho), simular reuso do refresh (familia cai), logout e tentar renovar (401).
  - **Aceite:** `tsc` limpo; testes verdes; validacao manual registrada.
