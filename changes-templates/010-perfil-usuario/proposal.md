<!--
TEMPLATE DE CHANGE — 010-perfil-usuario (autosservico /me). Ultimo do nucleo de plataforma.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
Codigo de tela (B9) refere-se aos seus mockups. As categorias de notificationPreferences sao do seu
dominio (ex.: comunicados|treinamentos|seguranca) — defina as suas.
-->


> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/perfil-usuario/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`, `mockups/` se houver) · e, **somente se o
> `design.md` citar nominalmente**: arquivos de código listados, `openspec/templates/`,
> `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

Todo usuario precisa gerenciar a propria conta — atualizar dados pessoais, ver sua posicao na
organizacao, ajustar preferencias de notificacao e cuidar da seguranca (trocar senha, gerenciar MFA).
E a tela B9. Diferente do CRUD administrativo de colaboradores (`008`, que gere *outros* usuarios), o
perfil e **autosservico**: cada um edita apenas o proprio cadastro, sem poder escalar papel, status,
organizacao ou estrutura.

## What Changes

- Estender o `user` com campos de perfil: `phone?`, `avatarUrl?`, `locale?` e
  `notificationPreferences` (estrutura de preferencias por categoria).
- Implementar `update-own-profile` (atualiza somente campos seguros do proprio usuario — nunca
  `role`/`status`/`organizationId`/estrutura) e `change-own-password` (exige a senha atual, valida via
  `crypto.provider`, re-hasheia a nova), com testes unitarios.
- Expor endpoints de autosservico escopados ao usuario autenticado: `GET /me` (perfil completo, com
  trabalho em modo leitura e flags de MFA), `PATCH /me` (dados e preferencias) e `POST /me/password`
  (troca de senha). A gestao de MFA reaproveita os endpoints da `009a`.
- Persistencia: migration estendendo `user` com os campos de perfil; repositorio.
- Frontend: tela B9 com as secoes Conta, Dados pessoais, Trabalho (leitura), Notificacoes e Seguranca;
  acesso pelo dropdown/avatar do shell. Chaves i18n novas.

## Capabilities

### New Capabilities
- `perfil-usuario`: Perfil de autosservico do usuario no {{produto}} — visualizacao e edicao dos
  proprios dados e preferencias, troca de senha com verificacao da senha atual e gestao de MFA (via
  `009a`), com a tela B9 e endpoints `/me` que impedem escalonamento de papel/status/organizacao/estrutura.

### Modified Capabilities
- `registro-usuario` (`004`): a entidade `user` e estendida com `phone`, `avatarUrl`, `locale` e `notificationPreferences`.

## Impact

- **Dominio (`modules/auth`)**: `user` estendido (campos de perfil); casos de uso `update-own-profile`
  e `change-own-password` + testes unitarios.
- **Backend**: migration de `user` (campos de perfil); repositorio; endpoints `GET /me`, `PATCH /me`,
  `POST /me/password` (autenticados, escopados ao proprio usuario); testes de integracao HTTP.
- **Frontend**: tela B9 (Conta/Dados pessoais/Trabalho/Notificacoes/Seguranca) no modulo `auth`;
  integracao com `/me` e com o MFA da `009a`; chaves i18n novas.
- **Dependencias**: `user`/login (`004`/`005`), estrutura para o bloco Trabalho (`007`), MFA (`009a`).
- **Decisao**: o e-mail e exibido em modo leitura no perfil (troca via admin), por afetar identidade
  de login e unicidade — flag de troca com verificacao fica para depois, se desejado.
