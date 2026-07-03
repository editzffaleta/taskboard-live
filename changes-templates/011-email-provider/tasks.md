<!-- TEMPLATE — tasks do e-mail transacional. Checkboxes vazios; marque com evidencia. Cada task
tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `004` (modulo `auth`). Integracoes com `008c`/`009c` **apenas se aplicadas**
> (verifique a existencia dos casos de uso antes de integrar). **Nao faca:** fila/retry assincrono;
> templates ricos/builder; tracking de abertura; bloquear o fluxo quando o envio falhar.

## 1. Dominio (modulo auth)

- [ ] 1.1 Definir o port `mail.provider.ts` (`send({ to, subject, html, text })`), no padrao dos providers existentes.
  - **Aceite:** interface no dominio, sem implementacao concreta; `tsc` ok.

## 2. Back-end

- [ ] 2.1 Instalar `nodemailer` e implementar os drivers (skill [backend-provider-implementation](../../../.claude/skills/backend-provider-implementation)): `console.mail.provider.ts` (loga destinatario/assunto/links formatados) e `smtp.mail.provider.ts` (transport por env, timeout curto). Selecao por `MAIL_DRIVER` (`console` default) no modulo Nest.
  - **Aceite:** driver escolhido por env; `console` funciona sem credencial; `smtp` monta o transport a partir de `MAIL_HOST/PORT/USER/PASS/FROM`.
- [ ] 2.2 Adicionar as envs ao `.env.example` (`MAIL_DRIVER=console`, `MAIL_HOST=`, `MAIL_PORT=587`, `MAIL_USER=`, `MAIL_PASS=`, `MAIL_FROM="{{produto}} <nao-responda@exemplo.com>"`), com comentario de que producao vive no painel.
  - **Aceite:** `.env.example` atualizado; nenhum valor real commitado.
- [ ] 2.3 Criar os templates pt (layout base + util): convite (link A6), redefinicao de senha (link A4) e primeiro acesso (link A5) — os dois ultimos apenas com a `009c` aplicada; o primeiro apenas com a `008c`.
  - **Aceite:** templates com assunto/corpo/CTA; links corretos por fluxo.
- [ ] 2.4 **Se `008c` aplicada:** integrar o envio no `invite-user` (efeito tolerante a falha: erro logado, convite valido, link segue visivel).
  - **Aceite:** convite dispara e-mail via driver ativo; falha de envio nao quebra o fluxo.
- [ ] 2.5 **Se `009c` aplicada:** integrar o envio no `request-password-reset` (link de A4) e disponibilizar o envio do link de primeiro acesso (A5) na criacao pelo admin.
  - **Aceite:** forgot dispara e-mail mantendo resposta neutra; primeiro acesso enviavel; falha tolerada.
- [ ] 2.6 Testes: driver `console` chamado com o payload certo por fluxo integrado; falha do provider nao propaga erro ao caso de uso.
  - **Aceite:** cenarios cobertos com fake do provider; suite verde.

## 3. Verificacao

- [ ] 3.1 Rodar `npx tsc --noEmit` (backend), os testes e validar manualmente com `MAIL_DRIVER=console`: convite (se `008c`) e esqueci-a-senha (se `009c`) logam o e-mail formatado com o link correto.
  - **Aceite:** `tsc` limpo; testes verdes; logs de e-mail conferidos por fluxo presente.
