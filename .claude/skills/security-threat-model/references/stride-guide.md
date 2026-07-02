# Guia STRIDE (aplicado ao stack NestJS + Next + Prisma, multi-tenant)

Para cada fronteira de confianca e fluxo, faca uma passada pelas 6 categorias.
Marque a propriedade de seguranca violada e a pergunta-chave.

## S — Spoofing (autenticidade)
- Pergunta: alguem consegue se passar por outro usuario/servico?
- Olhar: login/sessao, emissao e validacao de JWT, expiracao, refresh, MFA quando exigido.
- Mitigacao tipica: autenticacao forte, segredo do JWT protegido, MFA (`009`), rate limit no login.

## T — Tampering (integridade)
- Pergunta: alguem altera dados em transito ou no payload?
- Olhar: DTO/entrada sem validacao, mass assignment, campos de controle vindos do cliente
  (ex.: `role`, `organizationId` no body), integridade em webhooks.
- Mitigacao: validacao no dominio (`shared-validation-rule`/`module-entity`), DTO explicito,
  derivar campos sensiveis do token (nunca do body), assinatura de webhook.

## R — Repudiation (rastreabilidade)
- Pergunta: da para negar que fez algo por falta de trilha?
- Olhar: ausencia de log em eventos de seguranca (login falho, troca de senha, mudanca de papel,
  acesso negado).
- Mitigacao: log de eventos de seguranca (sem dado sensivel), com ator/recurso/horario.

## I — Information disclosure (confidencialidade)
- Pergunta: algum dado sensivel vaza?
- Olhar: hash de senha/campos internos na resposta; token/segredo em log ou URL; stack trace ou
  erro do Prisma para o cliente; segredo no bundle do Next (`NEXT_PUBLIC_` indevido);
  **cross-tenant** (ler recurso de outra `organizationId`).
- Mitigacao: serializar saida, `ApiErrorResponse` padronizado (`backend-nest-config`), escopo por
  tenant no repositorio/use-case, segredos so server-side.

## D — Denial of service (disponibilidade)
- Pergunta: da para exaurir o sistema?
- Olhar: endpoint de lista sem paginacao/limite; upload sem limite de tamanho/tipo; ausencia de
  rate limit; operacao cara sem timeout.
- Mitigacao: paginacao obrigatoria, limites de upload, rate limit, timeouts.

## E — Elevation of privilege (autorizacao)
- Pergunta: alguem faz mais do que deveria?
- Olhar: rota sem `@Roles`/guard; use-case que nao checa **ownership** nem **escopo de tenant**;
  IDOR/BOLA; bypass de RBAC.
- Mitigacao: `backend-authorization` (papeis/permissoes + guards), checagem de ownership e de
  `organizationId` no use-case, principio do menor privilegio.

## Checklist multi-tenant (sempre)
- Todo recurso e lido/escrito **filtrando por `organizationId`** do token?
- Papeis e permissoes conferem com o catalogo da `006-rbac-permissoes`?
- Nenhum campo de escopo (`organizationId`, `role`) e aceito do cliente?
