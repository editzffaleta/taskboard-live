---
name: security-review
description: Faz revisao defensiva de seguranca de codigo de um modulo ou PR contra o OWASP Top 10 (Web) e o OWASP API Security Top 10, aplicada aos padroes reais do projeto (NestJS, Prisma, Next, validacao compartilhada, ApiErrorResponse), produzindo um relatorio de achados com severidade, evidencia e remediacao apontando para as skills do catalogo. Nao escreve exploit nem faz pentest.
compatibility: claude-code, opencode
---

# Security Review

Use esta skill para **revisar** a seguranca de um modulo, de uma feature ou de um
PR antes do merge. E uma revisao **defensiva e estatica**: le o codigo, compara
com o OWASP Top 10 (Web) e o OWASP API Security Top 10, e gera um relatorio de
achados acionavel.

Esta skill **nao** escreve exploits, **nao** faz pentest, **nao** ataca sistemas
de terceiros e **nao** corrige nada automaticamente (a menos que solicitado). O
resultado e diagnostico + recomendacao, com a correcao delegada as skills certas.

## Entradas obrigatorias

1. alvo da revisao: caminho do modulo (`modules/<m>`), pasta do backend/frontend,
   ou o range do PR/diff a revisar
2. contexto: o que a feature faz e quais dados sensiveis ela toca

Entradas opcionais:

3. nivel de profundidade (revisao rapida vs completa)
4. se deve rodar `npm audit` para dependencias

## Referencias obrigatorias

Antes de revisar, ler obrigatoriamente:

1. o codigo alvo (modulo/PR), incluindo controllers, casos de uso e repositorios
2. a infra compartilhada do `backend-nest-config`: AuthGuard, decorator de usuario,
   tipo de request, filtro/erro `ApiErrorResponse`
3. `packages/shared/src/validation/` (regras de validacao disponiveis)
4. os repositorios Prisma em `apps/backend/**` e o uso de `prisma` (queries cruas?)
5. o tratamento de `.env`/segredos e a config de CORS/segurança do backend
6. as referencias internas:
   - `references/owasp-checklist.md`
   - `references/review-report.template.md`

## O que a revisao cobre (mapeado ao stack)

Use o `references/owasp-checklist.md`. Pontos de maior risco neste projeto:

- **Broken Access Control / BOLA (IDOR):** rota sem `@Roles`/guard quando deveria;
  caso de uso que nao verifica **propriedade** do recurso (qualquer usuario acessa
  o id de outro). Remediacao -> `backend-authorization` e checagem de ownership.
- **Injection / Prisma:** uso de `$queryRawUnsafe`/`$executeRawUnsafe` ou
  interpolacao de string em query; entrada nao validada chegando ao banco.
  Remediacao -> Prisma parametrizado + validacao (`module-entity`/`shared-validation-rule`).
- **Mass assignment / over-posting:** DTO/payload aceitando campos arbitrarios que
  caem direto no modelo. Remediacao -> DTO explicito + validacao no dominio.
- **Exposicao de dados sensiveis:** retornar hash de senha/campos internos na
  resposta; **logar** token/segredo; vazar stack trace ou erro do Prisma ao cliente.
  Remediacao -> serializar saida + `ApiErrorResponse` padronizado.
- **Falhas de autenticacao:** politica de senha fraca, ausencia de rate limit no
  login, token em log/URL. Remediacao -> regras de senha do shared + rate limit.
- **SSRF:** requisicao de saida com URL controlada pelo usuario (ex.: integracoes
  externas/webhooks). Remediacao -> allowlist de destino, sem dado em querystring.
- **Security misconfiguration:** CORS permissivo, erros verbosos em producao,
  credenciais default, headers ausentes.
- **Upload inseguro:** arquivo sem validar tipo/tamanho. Remediacao -> validar
  content-type e limite antes de persistir.
- **Consumo irrestrito (API):** endpoint de lista sem paginacao/limite.
- **Dependencias vulneraveis:** quando pedido, rodar `npm audit`.
- **Logging insuficiente:** eventos de seguranca (login falho, negacao) sem registro.

## Workflow deterministico

1. Delimitar o alvo (modulo, pastas ou diff do PR) e o que ele faz.
2. Ler as referencias obrigatorias e o codigo alvo.
3. Percorrer o `owasp-checklist.md` item a item contra o codigo real.
4. Para cada problema, registrar um achado: titulo, **severidade** (Critica/Alta/
   Media/Baixa), categoria OWASP, local (arquivo:linha), evidencia, impacto e
   **remediacao** (apontando a skill do catalogo que resolve).
5. Se solicitado, rodar `npm audit` e incluir dependencias relevantes.
6. Montar o relatorio seguindo `references/review-report.template.md`, ordenado
   por severidade, com um resumo executivo no topo.
7. Nao corrigir automaticamente; se o usuario pedir correcao, encaminhar para a
   skill adequada (`backend-authorization`, `shared-validation-rule`, `module-entity`,
   etc.).

## Regras de qualidade

- Severidade sempre justificada (impacto x explorabilidade).
- Cada achado deve ter local concreto e remediacao acionavel.
- Nao inventar vulnerabilidade: se nao houver evidencia no codigo, nao reportar.
- Distinguir achado confirmado de **suspeita** (marcar como "a confirmar").
- Citar a categoria OWASP correspondente em cada achado.

## Guardrails

- Nao escrever exploit, payload de ataque ou PoC ofensivo.
- Nao fazer scanning/pentest de sistemas de terceiros.
- Nao corrigir o codigo sem pedido explicito; revisar != consertar.
- Nao reportar achado sem evidencia no codigo.
- Nao incluir segredo real no relatorio (mascarar).
- Nao tratar a revisao como exaustiva: declarar o que ficou fora de escopo.

## Saida esperada

- relatorio de achados (markdown) ordenado por severidade, com resumo executivo
- cada achado com categoria OWASP, local, evidencia, impacto e remediacao
- lista de dependencias vulneraveis quando `npm audit` for solicitado
- secao de escopo: o que foi revisado e o que ficou de fora
- encaminhamento das correcoes para as skills do catalogo
