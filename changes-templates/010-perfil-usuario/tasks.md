<!-- TEMPLATE — tasks do perfil de autosservico. Checkboxes vazios; marque com evidencia.
Cada task tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `005` (sessao/`current-user`), `007` (estrutura, para o bloco Trabalho), `009a`
> (MFA). **Nao faca:** permitir que o usuario altere o proprio `role`/`status`/`organizationId`/
> estrutura (exclusivo do admin, `008`); troca de e-mail no autosservico (fica em leitura); entrega
> real de notificacoes (so armazenar as preferencias; disparo e com os comunicados, `022`).

## 1. Dominio (modulo auth)

- [ ] 1.1 Estender a entidade `user` (skill [module-entity](../../../.claude/skills/module-entity)): `phone?`, `avatarUrl?`, `locale?` (ex.: `pt|en`) e `notificationPreferences` (estrutura de preferencias por categoria, com defaults).
  - **Aceite:** campos opcionais + `notificationPreferences` com defaults; teste atualizado.
- [ ] 1.2 Implementar `update-own-profile` (skill [module-use-case](../../../.claude/skills/module-use-case)): atualiza apenas `name`, `phone`, `avatarUrl`, `locale` e `notificationPreferences` do proprio usuario; campos administrativos (`role`, `status`, `organizationId`, estrutura, `email`) sao ignorados/rejeitados.
  - **Aceite:** campos administrativos enviados sao ignorados (sem escalonamento) — garantido por teste.
- [ ] 1.3 Implementar `change-own-password` (skill [module-use-case](../../../.claude/skills/module-use-case)): valida a senha atual via `crypto.provider.compare`; em divergencia, `DomainError('user.current_password.invalid', 422)`; caso ok, re-hasheia a nova.
  - **Aceite:** senha atual incorreta → 422; correta → re-hash da nova.
- [ ] 1.4 Cobrir com testes: troca de senha com senha atual incorreta; `update-own-profile` ignorando campos administrativos enviados.
  - **Aceite:** cenarios cobertos; suite do `auth` verde.

## 2. Back-end

- [ ] 2.1 Sincronizar o Prisma (skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module)) estendendo `user` com os campos de perfil.
  - **Aceite:** migration aplicada; `prisma:generate` ok.
- [ ] 2.2 Atualizar o repositorio Prisma de `user` (skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository)), sem alterar o contrato.
  - **Aceite:** repositorio persiste os campos de perfil; `tsc --noEmit` ok.
- [ ] 2.3 Criar/estender o controller (skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller)): `GET /me` (perfil completo mapeado para objeto simples — dados + trabalho em leitura [setor/cargo/unidade/papel] + flags de MFA, sem `password`/`mfaSecret`), `PATCH /me` (`update-own-profile`) e `POST /me/password` (`change-own-password`). Todos escopados ao `current-user`.
  - **Aceite:** os tres endpoints operam sobre o `current-user` (sem aceitar `id` de outro); leitura mapeada sem dados sensiveis.
- [ ] 2.4 Criar/estender os testes de integracao HTTP: leitura do perfil, atualizacao de dados/preferencias, troca de senha (atual correta/incorreta) e a impossibilidade de alterar campos administrativos via `PATCH /me`. Validar manualmente.
  - **Aceite:** cenarios cobertos; `PATCH /me` nao altera campos administrativos (verificado).

## 3. Front-end (tela B9)

- [ ] 3.1 Criar a pagina de perfil com as secoes: **Conta** (`name` editavel, `email` em leitura), **Dados pessoais** (`phone`, `avatarUrl`, `locale`), **Trabalho** (setor/cargo/unidade/papel em leitura), **Notificacoes** (toggles de `notificationPreferences`) e **Seguranca** (trocar senha + gerenciar MFA via `009a`).
  - **Aceite:** cinco secoes presentes; e-mail e Trabalho em leitura.
- [ ] 3.2 Integrar com `GET /me`, `PATCH /me`, `POST /me/password` e os endpoints de MFA da `009a`, com toasters de sucesso/erro.
  - **Aceite:** integracao funcionando com toasts.
- [ ] 3.3 Disponibilizar o acesso ao perfil pelo dropdown/avatar do `AdminShell`.
  - **Aceite:** link de perfil no menu do shell.
- [ ] 3.4 Acrescentar as chaves i18n novas (pt/en): rotulos das secoes, `user.current_password.invalid`, mensagens de sucesso e rotulos de preferencias de notificacao.
  - **Aceite:** chaves presentes em pt e en.

## 4. Verificacao

- [ ] 4.1 Rodar `npx tsc --noEmit` (backend e frontend), os testes do `auth` e validar manualmente: editar dados/preferencias, trocar senha (senha atual incorreta falha), e confirmar que o usuario nao consegue alterar papel/status/estrutura pelo proprio perfil.
  - **Aceite:** `tsc` limpo; testes verdes; impossibilidade de escalonamento confirmada.
