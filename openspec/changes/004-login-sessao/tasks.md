> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `003` (registro/`user`). **Nao faca:** abstracao de token/JWT/sessao no
> dominio (nada de `TokenProvider`); refresh token; MFA; RBAC/organizacao/papel na sessao;
> dashboards (destino pos-login e placeholder).

## 1. Negocio (modulo auth)

- [ ] 1.1 Implementar `login-user` com a skill [module-use-case](../../../.claude/skills/module-use-case). Entrada `{ email, password }`; saida `{ id, name, email }` — **sem `password`/hash**. Fluxo: validar entrada (`email`: Required+Email; `password`: Required), buscar por e-mail, comparar via `CryptoProvider.compare`. Credenciais invalidas (inexistente **ou** senha errada) → `DomainError('user.credentials.invalid', 401)` (mesma mensagem). O caso de uso **nao menciona token/JWT**.
  - **Pre:** `003` concluida (`UserRepository`/`CryptoProvider` disponiveis).
  - **Aceite:** `LoginUser`/`LoginUserIn`/`LoginUserOut` no padrao da skill, deps por construtor, export no barrel; constantes de erro exportadas; nenhuma mencao a token.
- [ ] 1.2 Cobrir `login-user` com testes (fakes `FakeUserRepository`/`FakeCryptoProvider`): valido (saida sem `password`), e-mail inexistente, senha incorreta, e-mail vazio, e-mail invalido, senha vazia. **100% de coverage**.
  - **Aceite:** todos os cenarios cobertos; coverage 100% no caso de uso; suite do modulo verde.

## 2. Back-end

- [ ] 2.1 Instalar `jsonwebtoken` e `@types/jsonwebtoken` em `@taskboard/backend`; garantir `JWT_SECRET` no `.env` e `.env.example` (valor de exemplo + aviso de troca em producao).
  - **Aceite:** deps instaladas; `JWT_SECRET` presente nos dois arquivos.
- [ ] 2.2 Criar `jwt.util.ts` em `apps/backend/src/modules/auth` com `signUserToken(user, secret): string`, payload `{ sub, name, email }`, expiracao **7 dias**. Helper exclusivo da camada HTTP — **nao** e provider de dominio nem exportado ao modulo de negocio.
  - **Aceite:** `signUserToken` (subject = id → `sub`; `expiresIn: '7d'`); `exp-iat = 7 dias` validado; nao exportado ao dominio.
- [ ] 2.3 Atualizar `auth.controller.ts` com a skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller): `POST /auth/login` (`@Public()`, 200): injetar `UserRepository`, `CryptoProvider`, `ConfigService`; instanciar `LoginUser` no corpo do metodo, executar e chamar `signUserToken`. Retorno `{ token, user: { id, name, email } }`.
  - **Aceite:** segredo via `configService.getOrThrow('JWT_SECRET')`; retorno `{ token, user }` validado por HTTP (200).
- [ ] 2.4 Confirmar que `apps/backend/src/shared/auth` (`AuthenticatedUser`, `auth-user.mapper.ts`, `jwt.strategy.ts`, `current-user.decorator.ts`, ja existentes da `001`) mapeiam corretamente as claims `sub`/`name`/`email` do payload — sem adicionar nenhum campo novo (nada de `role`/`organizationId`).
  - **Aceite:** `GET` autenticado com Bearer → 200 e `current-user` devolve `{ userId, name, email }`; sem token → 401; nenhuma referencia a organizacao/papel.
- [ ] 2.5 Estender `auth.integration.http` com login: valido (200, `token`+`user`), inexistente (401), senha incorreta (401), e-mail invalido (422), incompleto (422). Validar manualmente.
  - **Aceite:** cenarios cobertos; inexistente e senha errada com o **mesmo** `user.credentials.invalid`; payload do token confere (nome acentuado preservado).

## 3. Front-end

- [ ] 3.1 Instalar `js-cookie` e `@types/js-cookie` em `@taskboard/frontend`.
  - **Aceite:** deps instaladas.
- [ ] 3.2 Adicionar a chave i18n `user.credentials.invalid` em `messages.pt.ts` e `messages.en.ts`.
  - **Aceite:** chave presente em pt e en (paridade garantida pelo tipo derivado).
- [ ] 3.3 Criar `apps/frontend/src/modules/auth/util/jwt.util.ts` com `decodeJwtPayload(token): { sub, name, email } | null` usando base64url → `Uint8Array` → `TextDecoder('utf-8')`. Validar com token de nome acentuado.
  - **Aceite:** decodifica com acentuacao; token malformado/sem claims → `null`.
- [ ] 3.4 Criar `AuthContext` (`modules/auth/context/auth.context.tsx`), com a skill [spec-frontend-auth](../../../.claude/skills/spec-frontend-auth): estado `{ user, token, status: 'loading'|'authenticated'|'unauthenticated' }`; na montagem le o cookie `auth_token`, decodifica e hidrata (invalido/ausente → `unauthenticated`); API `login(token)` (grava cookie + hidrata), `logout()` (remove cookie + limpa); hook `useAuth()`.
  - **Aceite:** hidratacao na montagem; `login` grava cookie `expires: 7` / `sameSite: 'lax'` / `secure` em producao; `useAuth()` lanca fora do provider.
- [ ] 3.5 Criar `AuthGuard` (`modules/auth/guard/auth.guard.tsx`): `loading` → placeholder neutro; `unauthenticated` → `router.replace('/join')` + `null`; `authenticated` → `children`.
  - **Aceite:** placeholder neutro com `aria-busy`; redirect via `useEffect`.
- [ ] 3.6 Registrar o `<AuthProvider>` no `app/layout.tsx` raiz (cobrindo `(public)` e `(private)`, dentro do ThemeProvider) e envolver `app/(private)/layout.tsx` com `<AuthGuard>`.
  - **Aceite:** provider no root (dentro do ThemeProvider); guard no layout privado; TODO de guard removido.
- [ ] 3.7 Substituir os valores hardcoded de usuario no `AdminShell` por `useAuth()`; `onLogout` chama `auth.logout()` + `router.push('/join')`.
  - **Aceite:** header consome `name`/`email` do contexto; logout limpa a sessao e redireciona.
- [ ] 3.8 Integrar o formulario de **login** (onde ele vive — tipicamente `app/(public)/join/page.tsx`): `POST {NEXT_PUBLIC_API_URL}/auth/login` com `{ email, password }`; sucesso (200) → `auth.login(token)` + `router.push` para a rota privada inicial (placeholder); erro → iterar `errors[]` com um `toast.error(getMessage(code))` por item.
  - **Aceite:** inputs controlados; sucesso grava sessao e redireciona; erro com toasts por item + fallback; botao em estado "Entrando…".
- [ ] 3.9 Em `/join`, detectar sessao ativa via `useAuth()` e redirecionar para a rota privada inicial quando `authenticated`; enquanto `loading`, nao renderizar formulario.
  - **Aceite:** `router.replace` quando autenticado; placeholder neutro enquanto carrega (sem flash).
- [ ] 3.10 Validar manualmente no navegador: login valido (cookie, redirect, nome acentuado no header); senha errada → toaster generico, sem cookie; reload mantem sessao sem flash; rota privada deslogado → `/join`; `/join` logado → rota inicial; logout remove cookie e volta a `/join`.
  - **Aceite:** evidencia dos cenarios acima.

## 4. Verificacao

- [ ] 4.1 Rodar `npx tsc --noEmit` em `apps/backend` e `apps/frontend` sem erros; confirmar que `modules/auth` **nao** referencia token/JWT/sessao (ex.: `grep -riE 'jwt|token|sess' modules/auth/src`).
  - **Aceite:** `tsc` limpo nos dois apps; grep sem ocorrencias no dominio; testes de todos os workspaces verdes.
