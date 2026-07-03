<!-- TEMPLATE — tasks do login em duas etapas (desafio MFA + tela A2). Checkboxes vazios; marque com
evidencia. Cada task tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `009a` (mecanismo MFA/`verify-mfa`), `005` (login/`AuthContext`).
> **Nao faca:** mexer no dominio (`login-user` fica como esta; a decisao e do controller);
> setup/confirmacao/desativacao de MFA (`009a`); recuperacao de senha/primeiro acesso (`009c`);
> "lembrar dispositivo". **Principio:** nenhum JWT de sessao antes do segundo fator.

## 1. Back-end

- [ ] 1.1 Ajustar `POST /auth/login` no `auth.controller.ts`: quando o usuario autenticado pelas credenciais tem `mfaEnabled`, responder `{ mfaRequired: true, challengeToken }` (token curto, assinado, expiracao em minutos, proposito exclusivo de desafio) em vez de `{ token, user }`.
  - **Aceite:** com MFA → desafio sem token de sessao; sem MFA → resposta atual `{ token, user }` inalterada.
- [ ] 1.2 Criar `POST /auth/login/mfa`: valida o `challengeToken` (assinatura, expiracao, proposito), executa `verify-mfa` (`009a`) com o codigo recebido e, se valido, emite o JWT devolvendo `{ token, user }`.
  - **Aceite:** desafio valido + codigo valido → `{ token, user }`; codigo invalido → 401 sem sessao; desafio expirado/reutilizado → rejeitado; `challengeToken` nao autentica nenhuma outra rota.
- [ ] 1.3 Estender `auth.integration.http`: login com MFA (desafio + verificacao TOTP), codigo invalido, verificacao com recovery code, login sem MFA permanecendo direto. Validar manualmente (TOTP real).
  - **Aceite:** cenarios cobertos com TOTP real.

## 2. Front-end

- [ ] 2.1 Ajustar o `AuthContext`/fluxo de login para **duas etapas**: ao receber `{ mfaRequired, challengeToken }`, exibir a verificacao (**A2**, aceitando TOTP ou recovery code) e enviar o codigo a `POST /auth/login/mfa`; ao receber o token, seguir o fluxo normal de sessao.
  - **Aceite:** login em duas etapas funcionando; sem token antes da verificacao; A2 aceita recovery code.
- [ ] 2.2 Acrescentar as chaves i18n novas (pt/en): `mfa.challenge_expired`, rotulos da verificacao no login e mensagens de erro do segundo fator (reusa `mfa.invalid_code` da `009a`).
  - **Aceite:** chaves presentes em pt e en.

## 3. Verificacao

- [ ] 3.1 Rodar `npx tsc --noEmit` (backend e frontend), os testes do `auth` e validar manualmente: habilitar MFA (`009a`) → logout → login pede o codigo (A2) → entrar com TOTP; repetir entrando com recovery code; conta sem MFA loga direto.
  - **Aceite:** `tsc` limpo; testes verdes; fluxos validados com TOTP real; `modules/auth` segue sem mencao a token (`grep -riE 'jwt|token' modules/auth/src` limpo no dominio).
