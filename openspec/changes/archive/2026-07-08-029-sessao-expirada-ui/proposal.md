> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/sessao-expirada/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md`.

## Why

A change `028` faz o backend retornar **401** quando o JWT é de um usuário inexistente
(sessão inválida). Mas o frontend não tinha tratamento **global** de 401: cada cliente de API
capturava o erro e mostrava um toast cru — o 401 aparecia como "Erro desconhecido: Sessão
inválida" em vez de simplesmente **deslogar** o usuário. UX confusa e sem saída.

## What Changes

- Adicionar um utilitário compartilhado `handleUnauthorized()` (`shared/lib/session.ts`) que,
  ao receber um 401 da API, limpa o cookie `auth_token` e redireciona para `/join` (guardado
  contra loop e sem redirecionar em rotas públicas como `/`, `/join`, `/convite`).
- Ligar esse tratamento em TODOS os helpers de request dos módulos (boards, notifications,
  account, activity, members, invitations): ao detectar `response.status === 401`, chamar
  `handleUnauthorized()` antes de lançar o erro.

## Capabilities

### New Capabilities
- `sessao-expirada`: Tratamento global de 401 no cliente — sessão inválida/expirada limpa o
  cookie e redireciona ao login, em vez de exibir o 401 como toast de erro cru.

### Modified Capabilities
<!-- Nenhuma. -->

## Impact

- **Frontend**: novo `shared/lib/session.ts`; hook de 401 nos helpers de request dos módulos.
- **Sem backend**: consome o 401 que a `028` já retorna.
