<!-- TEMPLATE — design do e-mail transacional. Placeholders: {{produto}}, {{namespace}}. -->

## Context

Os fluxos de convite (`008c`) e recuperacao/primeiro acesso (`009c`) geram links sem enviar —
decisao explicita de escopo daquelas changes. Este e o ponto de extensao previsto: um port de
e-mail no padrao dos providers existentes (`crypto.provider`, `totp.provider`).

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Port unico de envio + drivers `console` (dev) e `smtp` (producao, agnostico de vendor).
- Ligar os envios pendentes de `008c`/`009c` quando presentes, sem quebrar fluxo em falha.
- Envs documentadas no `.env.example`; credenciais so no painel (Dokploy) em producao.

**Non-Goals:**
- Fila/retry assincrono (BullMQ etc.) — envio direto nesta fase; fila e change futura se o volume exigir.
- Marketing/newsletter, templates ricos com builder, tracking de abertura.
- Webhooks de bounce/reclamacao.

## Decisions

- **SMTP como unico protocolo de producao**: todo vendor relevante expoe SMTP; troca de vendor =
  troca de env, zero codigo. Alternativa (SDK por vendor) descartada por acoplamento.
- **Driver `console` como default**: em dev, o e-mail e logado formatado (destinatario, assunto,
  links) — permite validar fluxos sem credencial. `MAIL_DRIVER=smtp` ativa o envio real.
- **Falha de envio e tolerada**: o caso de uso registra o erro (log estruturado) e segue; o
  recurso (convite/token) permanece valido e o link visivel. Envio nao pode derrubar onboarding.
- **Templates minimos em pt**: assunto + corpo com um CTA; layout base unico. i18n do e-mail
  segue o idioma do produto (pt) nesta fase.
- **Skills**: backend-provider-implementation (drivers), module-use-case (ajuste dos efeitos).

## Risks / Trade-offs

- [Credencial SMTP vazada] → Envs fora do repo (`.env.example` so com chaves); producao no painel.
- [Envio sincrono lento] → Timeout curto no transport; fila entra como change propria se necessario.
- [E-mail cair em spam] → SPF/DKIM/DMARC sao configuracao de DNS do vendor — documentado como
  pre-requisito operacional, fora do codigo.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
