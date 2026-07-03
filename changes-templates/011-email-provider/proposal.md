<!--
TEMPLATE DE CHANGE — 011-email-provider (e-mail transacional: port + drivers console/SMTP).
Extensao transversal (recomendada p/ producao). Integra os envios pendentes de convites (008c)
e recuperacao/primeiro acesso (009c) QUANDO essas changes estiverem aplicadas.
Substitua os placeholders e remova este comentario antes de usar.
Placeholders: {{produto}} (ex.: AlphaBet), {{namespace}} (ex.: alphabet) → @{{namespace}}
-->

> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/email-transacional/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

Convites (`008c`) e links de recuperacao/primeiro acesso (`009c`) hoje sao gerados e exibidos —
o admin copia e encaminha na mao. Esta mudanca cria a infraestrutura de **e-mail transacional**
(port + drivers) e liga os envios pendentes, mantendo o dominio desacoplado de vendor.

## What Changes

- **Port `mail.provider.ts`** no modulo `auth` (`send({ to, subject, html, text })`), no mesmo
  padrao do `crypto.provider`.
- **Drivers**: `console` (default em dev — loga o e-mail formatado em vez de enviar) e `smtp`
  (nodemailer; qualquer vendor via SMTP: Resend, SES, Mailgun…). Selecao por `MAIL_DRIVER`;
  credenciais por env (`MAIL_HOST/PORT/USER/PASS/FROM`), nunca versionadas.
- **Templates de e-mail** simples (assunto + corpo com CTA/link) em pt, com util de layout base.
- **Integracoes condicionais** (cada uma existe apenas se a change correspondente estiver aplicada):
  - `008c`: `invite-user` passa a enviar o link do convite (A6) ao e-mail convidado.
  - `009c`: `request-password-reset` envia o link de redefinicao; a criacao de conta pelo admin
    (`008a` + `009c`) pode enviar o link de primeiro acesso.
- **Falha de envio nao quebra o fluxo**: erro no e-mail e logado e reportado; convite/token
  continuam validos e o link permanece visivel para envio manual.

## Capabilities

### New Capabilities
- `email-transacional`: envio de e-mails transacionais do {{produto}} via port `mail.provider`
  com drivers `console`/`smtp`, templates pt e integracao aos fluxos de convite e
  recuperacao/primeiro acesso quando presentes.

### Modified Capabilities
<!-- Nenhuma reescrita: as integracoes em 008c/009c sao pontos de extensao condicionais. -->

## Impact

- **Dominio (`modules/auth`)**: port `mail.provider.ts`; casos de uso existentes ganham o envio
  como efeito colateral tolerante a falha (sem mudar contratos).
- **Backend**: `nodemailer`; implementacoes `console.mail.provider` e `smtp.mail.provider`;
  registro no modulo Nest; templates; envs novas no `.env.example`.
- **Frontend**: nenhum (os links continuam visiveis para envio manual).
- **Dependencias**: modulo `auth` (`004`). Integracoes: `008c` e/ou `009c` **se aplicadas**.
- **Habilita**: onboarding sem copia manual de link; futuras notificacoes por e-mail.
