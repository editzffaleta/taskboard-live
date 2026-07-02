# Política de segurança

## Versões suportadas

Somente a versão em produção (branch `producao`) e a `main` recebem correções de segurança.

## Como reportar uma vulnerabilidade

- **Não abra issue pública.** Envie o relato para **{{email-seguranca}}** (ou use
  *Security → Report a vulnerability* se o repositório estiver no GitHub com
  private vulnerability reporting habilitado).
- Inclua: descrição, passos de reprodução, impacto estimado e versão/commit afetado.
- Resposta inicial em até **72h úteis**; correção priorizada conforme severidade
  (CRITICAL/HIGH antes de qualquer feature).

## Escopo

Backend (NestJS), frontend (Next.js), infraestrutura declarada neste repositório e o
pipeline de CI. Segredos nunca são versionados — se você encontrou um, reporte imediatamente.

## Boas práticas deste projeto

Gate de qualidade com gitleaks (segredos), npm audit (dependências), Semgrep (SAST) e
Trivy (vulnerabilidades) bloqueantes no CI; RBAC e validação de entrada no backend;
env de produção somente no painel de deploy.
