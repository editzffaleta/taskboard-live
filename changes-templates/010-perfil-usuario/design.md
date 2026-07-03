<!-- TEMPLATE — design do perfil de autosservico. Placeholders: {{produto}}, {{namespace}}. -->

## Context

O `user` ja existe com identidade, papel, status, estrutura (`008a`) e MFA (`009a`). Esta mudanca
entrega o autosservico de perfil (B9): cada usuario gere a propria conta via endpoints `/me`, sem
tocar em atributos administrativos. E a contraparte self-service do CRUD administrativo da `008`.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Edicao autosservico de dados pessoais e preferencias de notificacao.
- Troca de senha com verificacao da senha atual.
- Visualizacao da posicao organizacional (setor/cargo/unidade/papel) em modo leitura.
- Reaproveitar o MFA da `009a` na aba de Seguranca.

**Non-Goals:**
- Permitir que o usuario altere o proprio `role`, `status`, `organizationId` ou estrutura — exclusivo do admin (`008`).
- Troca de e-mail no autosservico — fica em modo leitura nesta fase.
- Entrega real de notificacoes — as preferencias sao armazenadas; o disparo e tratado com os comunicados (`022`).

## Decisions

- **Endpoints `/me` escopados ao usuario autenticado**: `GET/PATCH /me` e `POST /me/password` operam
  sempre sobre o `current-user`, nunca recebendo um `id` de outro usuario. Isso separa claramente
  autosservico de administracao (`/users`).
- **`update-own-profile` so toca campos seguros**: name, phone, avatarUrl, locale e
  notificationPreferences. Campos administrativos sao ignorados/rejeitados, impedindo escalonamento —
  validado por teste.
- **`change-own-password` exige a senha atual**: valida via `crypto.provider.compare` antes de
  re-hashear; falha → `DomainError('user.current_password.invalid', 422)`. Distinto do `reset-password`
  da `009c` (que usa token, sem senha atual).
- **E-mail em modo leitura no perfil**: alterar e-mail afeta identidade de login e unicidade global
  (`004`); por isso e exibido como leitura, com troca via admin. Verificacao de e-mail pode ser adicionada depois.
- **Trabalho em modo leitura**: setor/cargo/unidade/papel sao exibidos, mas geridos pelo admin (`007`/`008`).
- **Skills**: module-entity, module-use-case, backend-prisma-sync-module, backend-prisma-repository, backend-nest-controller.

## Mockups (Claude Design) — inclusão condicional por tela

- Tela desta change **com** mockup do Claude Design → o mockup vive **dentro desta change**, em
  `mockups/<tela>/` (ex.: `mockups/b9-perfil/`). Tela **sem** mockup **não** gera subpasta — siga
  apenas este design.
- Execução: **reproduza fielmente o layout do mockup**, substituindo **todo dado fake/placeholder
  por dado real** vindo do backend — proibido lorem/valor mockado no código final.
- Os códigos de tela citados referem-se a esses mockups; ajuste-os ao seu projeto.

## Risks / Trade-offs

- [Escalonamento via PATCH /me] → `update-own-profile` aceita apenas a lista de campos seguros; testes
  garantem que campos administrativos enviados sao ignorados.
- [Confusao entre troca de senha (perfil) e reset (`009c`)] → Sao casos de uso distintos: perfil exige
  senha atual; reset usa token.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
