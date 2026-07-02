---
name: spec-frontend-auth
description: 'Orquestra a base de AUTENTICACAO do frontend Next.js, simetrica ao spec-backend-auth-basic: cliente HTTP tipado que anexa o JWT e trata ApiErrorResponse/401, AuthContext + useAuth, armazenamento do token, pagina de login ligada ao backend e guarda de rota nos layouts (private) — reaproveitando a estrutura do frontend-next-config. Usar quando o backend de auth ja existe e falta o lado do cliente. Nao usar para instalar a base do frontend (frontend-next-config) nem para RBAC/gating por permissao (e a change 006b).'
compatibility: claude-code, opencode
---

# Spec Frontend Auth

Esta skill e uma **orquestradora** do lado do frontend. Ela conduz, de forma
deterministica, a criacao ou evolucao da base de autenticacao do app Next.js,
ligando o front ao backend de autenticacao ja existente.

Par natural: o `spec-backend-auth-basic` monta a auth no backend (login, JWT,
usuario). Esta skill monta a auth no **frontend** e consome aquele backend.

> O catalogo de skills de frontend e enxuto (`frontend-next-config`,
> `config-new-module`). Por isso esta skill **delega** a parte estrutural ao
> `frontend-next-config` e **implementa diretamente** as pecas especificas de
> auth (cliente HTTP, contexto, login, guarda), seguindo os padroes ja presentes
> no projeto (layouts `(public)`/`(private)`, validator de formulario, tipo
> `ApiErrorResponse`, i18n, componentes de UI).

## Escopo

Foco somente em:

- cliente HTTP tipado (anexa JWT, trata `ApiErrorResponse`, redireciona em 401)
- contexto de auth (`AuthProvider`) + hook `useAuth`
- armazenamento e leitura do token
- pagina de login no grupo `(public)`, usando o validator e os componentes do projeto
- guarda de rota para o grupo `(private)`
- logout

Fora de escopo nesta versao (salvo pedido explicito): cadastro/registro,
recuperacao de senha, refresh token, e UI de papeis/permissoes (isso e
`backend-authorization`/RBAC do lado do backend).

## Pre-requisitos (verificar antes)

- O frontend ja foi configurado pelo `frontend-next-config` (estrutura `shared/`,
  layouts `(public)`/`(private)`, validator de formulario, `ApiErrorResponse`).
  Se nao, rode `frontend-next-config` primeiro.
- O backend ja expoe **login** retornando um token (do `spec-backend-auth-basic`).
  Descubra o contrato real do endpoint de login (rota, payload, shape da resposta)
  antes de implementar.

## Entradas obrigatorias

1. URL base da API (de onde vem `NEXT_PUBLIC_API_URL`, ja criado pelo scaffold)
2. contrato do endpoint de **login** do backend: rota, campos e shape da resposta
   (onde vem o token; se vem dado do usuario junto)
3. identificador de login usado (e-mail por padrao)

Entradas opcionais:

- estrategia de armazenamento do token (ver secao abaixo)
- claims/dados do usuario disponiveis apos login
- rota de destino apos login e rota de login para redirecionar em 401
- se deve haver "lembrar-me"

## Referencias obrigatorias

Antes de gerar qualquer codigo, ler obrigatoriamente:

1. `apps/frontend/src/app/(public)/layout.template.tsx` e
   `apps/frontend/src/app/(private)/layout.template.tsx` (ou os arquivos ja
   materializados desses layouts)
2. `apps/frontend/src/app/(public)/join/page.template.tsx` (estilo de pagina publica)
3. o validator de formulario do projeto em
   `apps/frontend/src/shared/components/form/validator/`
4. `apps/frontend/src/shared/types/api-error.type.ts` (shape de `ApiErrorResponse`)
5. `apps/frontend/src/shared/i18n/` (mensagens pt/en)
6. componentes de UI relevantes (`button`, `input`, `form-error-message`, etc.)
7. o controller de login do backend, ex.
   `apps/backend/src/modules/auth/auth.controller.ts`, para casar o contrato

Tambem leia os few-shots desta skill:

- `references/few-shots/api-client.example.ts`
- `references/few-shots/auth-context.example.tsx`
- `references/few-shots/login-page.example.tsx`
- `references/few-shots/route-guard.example.tsx`

## Armazenamento do token (decida primeiro)

- **Cookie httpOnly (recomendado p/ producao):** mais seguro contra XSS, mas exige
  apoio do backend para setar/ler o cookie. Prefira quando o backend ja suportar.
- **Memoria + storage do navegador (mais simples):** token em estado + persistido
  (ex.: `localStorage`/`sessionStorage`). Mais simples, porem exposto a XSS.

Escolha conforme o backend e o contexto do projeto, documente a decisao e seja
coerente em cliente, contexto e guarda. **Nunca** logue o token.

## Sequencia deterministica de orquestracao

Execute em ordem; valide cada etapa antes de seguir.

### 1. Garantir a base do frontend
- Confirmar a estrutura do `frontend-next-config`. Se ausente/incompleta, aciona-lo.
- Validar a existencia dos layouts `(public)`/`(private)`, do validator e do
  `ApiErrorResponse`.

### 2. Cliente HTTP tipado
- Criar um cliente em `apps/frontend/src/shared/lib/` (ou onde o projeto centraliza
  infra) que: monta a URL com `NEXT_PUBLIC_API_URL`; anexa `Authorization: Bearer`
  quando houver token; faz parse de erro no shape `ApiErrorResponse`; em **401**,
  limpa a sessao e redireciona para a rota de login.

### 3. Contexto de auth + hook
- Criar `AuthProvider` (estado de usuario/token, `login`, `logout`, `isLoading`,
  `isAuthenticated`) e o hook `useAuth`. Hidratar a sessao a partir do storage
  escolhido no carregamento.
- Plugar o `AuthProvider` no ponto certo da arvore (ex.: layout raiz/`(private)`).

### 4. Pagina de login
- Criar a pagina em `apps/frontend/src/app/(public)/login/page.tsx` (ou rota
  equivalente), usando o **validator do projeto** e os componentes de UI/i18n.
- No submit: chamar o login via cliente HTTP, guardar o token via contexto e
  redirecionar para a rota de destino. Mostrar erro de credencial no padrao do projeto.

### 5. Guarda de rota
- Proteger o grupo `(private)`: enquanto carrega a sessao, segurar a UI; sem
  sessao valida, redirecionar para o login. Implementar via wrapper/efeito no
  layout `(private)` (ou middleware do Next, se for o padrao do projeto).

### 6. Logout
- Acao de logout: limpa token/estado e redireciona para o login.

### 7. Validacao final
- Confirmar: login funciona e persiste a sessao; rota `(private)` bloqueia sem
  sessao; 401 derruba a sessao e manda pro login; logout limpa tudo.

## Regras de implementacao

- Reaproveitar layouts `(public)`/`(private)`, validator, UI e i18n existentes —
  nao criar um sistema de formulario/estilo paralelo.
- Centralizar **toda** chamada HTTP no cliente tipado; nao espalhar `fetch` cru.
- Tratar erro sempre no shape `ApiErrorResponse` do projeto.
- Nunca logar o token nem dados sensiveis.
- Manter o fluxo incremental e coerente com o contrato real do backend.

## Regras de teste e validacao

- Testar o cliente HTTP: anexa o token; trata `ApiErrorResponse`; em 401 limpa a
  sessao e redireciona.
- Testar o contexto: `login` popula o estado; `logout` limpa; hidratacao a partir
  do storage.
- Testar a guarda: sem sessao redireciona; com sessao renderiza.
- Rodar `lint`, `typecheck`/`check-types`, `test` e `build` do frontend.

## Condicoes de parada obrigatoria

Pare e reporte quando:
- o `frontend-next-config` nao tiver rodado e nao for possivel montar a base com seguranca;
- o contrato de login do backend for desconhecido ou ambiguo;
- houver conflito serio entre a especificacao e a estrutura atual do frontend.

## Guardrails

- Nao implementar cadastro, recuperacao de senha ou refresh token nesta versao.
- Nao implementar autorizacao/papeis no front (isso depende do RBAC do backend).
- Nao recriar layouts, validator, UI ou i18n que ja existem.
- Nao colocar `fetch` cru espalhado; usar o cliente tipado.
- Nao logar o token.

## Saida esperada

1. cliente HTTP tipado (JWT + `ApiErrorResponse` + 401 -> login)
2. `AuthProvider` + `useAuth` com hidratacao da sessao
3. pagina de login em `(public)` usando o validator e a UI do projeto
4. guarda de rota protegendo o grupo `(private)`
5. logout funcional
6. lint/typecheck/test/build do frontend verdes

## Formato do relatorio final

Ao concluir, entregar um resumo com: arquivos criados/alterados, decisao de
armazenamento do token, contrato de login consumido, o que foi validado e
pendencias/proximos passos.
