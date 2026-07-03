<!-- TEMPLATE — tasks do meus dispositivos (B10). Checkboxes vazios; marque com evidencia. Cada
task tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `017` (familias/revogacao), `005`, `010` (perfil/`/me`). **Nao faca:**
> geolocalizacao/fingerprinting; gestao por admin; notificacao de novo login; mudar o mecanismo
> de rotacao. **Principio:** o usuario gerencia apenas as proprias sessoes.

## 1. Dominio (modulo auth)

- [ ] 1.1 Estender o agregado `refresh-token` com `userAgent?` e `lastUsedAt?` e o contrato com `findActiveFamiliesByUser(userId)` (uma linha por familia ativa: criada, ultimo uso, expiracao, agente, hash do elo ativo).
  - **Aceite:** campos opcionais; contrato estendido; fake atualizado.
- [ ] 1.2 Use case `list-user-sessions` (skill [module-use-case](../../../.claude/skills/module-use-case)): lista as familias ativas do usuario marcando a atual (comparacao com o hash do refresh recebido); reusar `revoke-refresh-family` para revogacao seletiva e criar `revoke-other-sessions` (todas menos a atual, atomica).
  - **Aceite:** atual marcada corretamente; revoke-others preserva so a atual; testes cobrem os tres.

## 2. Back-end

- [ ] 2.1 Migration aditiva (skill [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module)) com os campos novos; repositorio (skill [backend-prisma-repository](../../../.claude/skills/backend-prisma-repository)) implementando `findActiveFamiliesByUser`; capturar `userAgent` no login e atualizar `lastUsedAt` a cada rotacao.
  - **Aceite:** migration sem passo destrutivo; metadados preenchidos no login/rotacao.
- [ ] 2.2 Endpoints autenticados (skill [backend-nest-controller](../../../.claude/skills/backend-nest-controller)): `GET /me/sessions`, `DELETE /me/sessions/:familyId` (404 se a familia nao for do usuario) e `POST /me/sessions/revoke-others`.
  - **Aceite:** lista marca a atual; revogar familia alheia → 404; revoke-others derruba as demais (refresh delas passa a falhar).
- [ ] 2.3 Testes de integracao: dois logins → lista com 2; revogar o outro → refresh dele 401; revoke-others com 3 familias → so a atual sobrevive; revogar a atual → logout (cookie limpo).
  - **Aceite:** cenarios cobertos; suite verde.

## 3. Front-end

- [ ] 3.1 Tela **B10 — Meus dispositivos** na area do perfil (`010`): lista com dispositivo resumido (user-agent → navegador/SO), criada em, ultimo uso e badge "sessao atual"; acoes "Encerrar" por item e "Encerrar todas as outras", ambas com confirmacao; revogar a atual executa o logout normal. Chaves i18n novas (pt/en).
  - **Aceite:** lista real; acoes com confirmacao; revogar a atual redireciona ao login; i18n completa.

## 4. Verificacao

- [ ] 4.1 Rodar `npx tsc --noEmit` (backend e frontend), os testes e validar manualmente com dois navegadores logados: listar, encerrar o outro (ele cai no proximo refresh), encerrar todas as outras, encerrar a atual (logout).
  - **Aceite:** `tsc` limpo; testes verdes; validacao com duas sessoes reais registrada.
