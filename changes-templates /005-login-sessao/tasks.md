<!-- TEMPLATE — tasks do login/sessao. Checkboxes vazios; marque com evidencia.
Cada task tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `003` (escopo de tenant) e `004` (registro/`user`). **Nao faca:** abstracao de
> token/JWT/sessao no dominio (nada de `TokenProvider`); gating de sidebar/autorizacao por permissao
> (e a `006`); dashboards por papel (destino pos-login e placeholder ate as mudancas de dashboard).

## 1. Negocio (modulo auth)

- [ ] 1.1 Implementar `login-user` com a skill [module-use-case](../../../.claude/skills/module-use-case). Entrada `{ email, password }`; saida `{ id, name, email, role, organizationId }` — **sem `password`/hash**. Fluxo: validar entrada (`email`: Required+Email; `password`: Required), buscar por e-mail, comparar via `CryptoProvider.compare`. Credenciais invalidas (inexistente **ou** senha errada) → `DomainError('user.credentials.invalid', 401)` (mesma mensagem). O caso de uso **nao menciona token/JWT**.
  - **Aceite:** `LoginUser`/`LoginUserIn`/`LoginUserOut` no padrao da skill, deps por construtor, export no barrel; constantes de erro exportadas; nenhuma mencao a token.
- [ ] 1.2 Adicionar o **gate de status**: apos validar as credenciais, se `user.status !== 'active'`, lancar `DomainError('user.inactive', 403)`.
  - **Aceite:** gate apos a comparacao de senha (conta inativa so e revelada com credenciais corretas).
- [ ] 1.3 Cobrir `login-user` com testes (fakes `FakeUserRepository`/`FakeCryptoProvider`): valido (saida sem `password`), e-mail inexistente, senha incorreta, e-mail vazio, e-mail invalido, senha vazia, inativo (403). **100% de coverage**.
  - **Aceite:** todos os cenarios cobertos; coverage 100% no caso de uso; suite do modulo verde.

## 2. Back-end

- [ ] 2.1 Instalar `jsonwebtoken` e `@types/jsonwebtoken` em `@{{namespace}}/backend`; garantir `JWT_SECRET` no `.env` e `.env.example` (valor de exemplo + aviso de troca em producao).
  - **Aceite:** deps instaladas; `JWT_SECRET` presente nos dois arquivos.
- [ ] 2.2 Criar `jwt.util.ts` em `apps/backend/src/modules/auth` com `signUserToken(user, secret): string`, payload `{ sub, name, email, role, organizationId }`, expiracao **7 dias**. Helper exclusivo da camada HTTP — **nao** e provider de dominio nem exportado ao modulo de negocio.
  - **Aceite:** `signUserToken` (subject = id → `sub`; `expiresIn: '7d'`); `exp-iat = 7 dias` validado; nao exportado ao dominio.
- [ ] 2.3 Atualizar `auth.controller.ts` com `POST /auth/login` (`@Public()`, 200): injetar `UserRepository`, `CryptoProvider`, `ConfigService`; instanciar `LoginUser` no corpo do metodo, executar e chamar `signUserToken`. Retorno `{ token, user: { id, name, email, role, organizationId } }`.
  - **Aceite:** segredo via `configService.getOrThrow('JWT_SECRET')`; retorno `{ token, user }` validado por HTTP (200).
- [ ] 2.4 **Binding de tenant (adiamento da `003`)**: estender `apps/backend/src/shared/auth` — `AuthenticatedUser` e `auth-user.mapper.ts` passam a expor `organizationId` e `role` das claims (ajustar `JwtPayload` se preciso). Criar `shared/decorators/current-organization.decorator.ts` espelhando `current-user.decorator.ts`.
  - **Aceite:** claims `role`/`organizationId` mapeadas (com guarda de tipo); decorator devolve `request.user?.organizationId`; `GET` autenticado com Bearer → 200, sem token → 401.
- [ ] 2.5 Estender `auth.integration.http` com login: valido (200, `token`+`user` com `role`/`organizationId`), inexistente (401), senha incorreta (401), e-mail invalido (422), incompleto (422), inativo (403). Validar manualmente.
  - **Aceite:** cenarios cobertos; inexistente e senha errada com o **mesmo** `user.credentials.invalid`; inativo 403; payload do token confere (nome acentuado preservado).

## 3. Front-end

- [ ] 3.1 Instalar `js-cookie` e `@types/js-cookie` em `@{{namespace}}/frontend`.
  - **Aceite:** deps instaladas.
- [ ] 3.2 Adicionar as chaves i18n `user.credentials.invalid` e `user.inactive` em `messages.pt.ts` e `messages.en.ts`.
  - **Aceite:** chaves presentes em pt e en (paridade garantida pelo tipo derivado).
- [ ] 3.3 Criar `apps/frontend/src/modules/auth/util/jwt.util.ts` com `decodeJwtPayload(token): { sub, name, email, role, organizationId } | null` usando base64url → `Uint8Array` → `TextDecoder('utf-8')`. Validar com token de nome acentuado.
  - **Aceite:** decodifica com acentuacao; le `role`/`organizationId`; token malformado/sem claims → `null`.
- [ ] 3.4 Criar `AuthContext` (`modules/auth/context/auth.context.tsx`): estado `{ user, token, status: 'loading'|'authenticated'|'unauthenticated' }`; na montagem le o cookie `auth_token`, decodifica e hidrata (invalido/ausente → `unauthenticated`); API `login(token)` (grava cookie + hidrata), `logout()` (remove cookie + limpa); hook `useAuth()`.
  - **Aceite:** hidratacao na montagem; `login` grava cookie `expires: 7` / `sameSite: 'lax'` / `secure` em producao; `useAuth()` lanca fora do provider.
- [ ] 3.5 Criar `AuthGuard` (`modules/auth/guard/auth.guard.tsx`): `loading` → placeholder neutro; `unauthenticated` → `router.replace('/join')` + `null`; `authenticated` → `children`.
  - **Aceite:** placeholder neutro com `aria-busy`; redirect via `useEffect`.
- [ ] 3.6 Envolver `app/(private)/layout.tsx` com `<AuthGuard>` e garantir o `<AuthProvider>` cobrindo `(public)` e `(private)` (provider no `app/layout.tsx` raiz). Substituir os valores hardcoded de usuario no `AdminShell` por `useAuth()`; `onLogout` chama `auth.logout()` + `router.push('/join')`.
  - **Aceite:** provider no root (dentro do ThemeProvider); guard no layout privado; header consome `name`/`email` do contexto; TODO de guard removido.
- [ ] 3.7 Integrar o formulario de **login** (onde ele vive — tipicamente `app/(public)/join/page.tsx`): `POST {NEXT_PUBLIC_API_URL}/auth/login` com `{ email, password }`; sucesso (200) → `auth.login(token)` + `router.push` para a rota privada inicial (placeholder); erro → iterar `errors[]` com um `toast.error(getMessage(code))` por item.
  - **Aceite:** inputs controlados; sucesso grava sessao e redireciona; erro com toasts por item + fallback; botao em estado "Entrando…".
- [ ] 3.8 Em `/join`, detectar sessao ativa via `useAuth()` e redirecionar para a rota privada inicial quando `authenticated`; enquanto `loading`, nao renderizar formulario.
  - **Aceite:** `router.replace` quando autenticado; placeholder neutro enquanto carrega (sem flash).
- [ ] 3.9 Validar manualmente no navegador: login valido (cookie, redirect, nome acentuado no header); senha errada → toaster generico, sem cookie; inativo → toaster `user.inactive`; reload mantem sessao sem flash; rota privada deslogado → `/join`; `/join` logado → rota inicial; logout remove cookie e volta a `/join`.
  - **Aceite:** evidencia dos cenarios acima.

## 4. Verificacao

- [ ] 4.1 Rodar `npx tsc --noEmit` em `apps/backend` e `apps/frontend` sem erros; confirmar que `modules/auth` **nao** referencia token/JWT/sessao (ex.: `grep -riE 'jwt|token|sess' modules/auth/src`).
  - **Aceite:** `tsc` limpo nos dois apps; grep sem ocorrencias no dominio; testes de todos os workspaces verdes.
