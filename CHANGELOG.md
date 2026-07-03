# Changelog — Template Fábrica Fullstack

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/), em português.
Projetos gerados registram a versão de origem no `openspec/project.md` (campo **Origem**).

## [1.2.0] — 2026-07-02

### Adicionado
- **Extensões transversais `011–017`** (opcionais, recomendadas para produção, com integrações
  condicionais à presença das changes que tocam): `011-email-provider` (port + drivers
  console/SMTP, liga os envios pendentes de `008c`/`009c`), `012-hardening-http` (helmet, CORS
  fail-fast, throttler global + estrito nas rotas de auth), `013-observabilidade` (nestjs-pino
  com request-id e redaction, Sentry/GlitchTip opcional, `/health` com verificação de banco),
  `014-seeds-desenvolvimento` (massa demo idempotente com guard de produção),
  `015-fundacao-e2e` (Playwright + helpers de sessão + smoke do login), `016-audit-log`
  (trilha append-only de ações sensíveis + consulta admin escopada) e `017-refresh-token`
  (access 15min + refresh rotativo httpOnly com detecção de reuso).
- **`scripts/validar-template.sh`** (verificações estruturais auto-escaláveis: changes com
  contrato e aceites, ledger↔pastas, skills/agents/commands, refs órfãs, symlink,
  VERSION↔CHANGELOG) + workflow `validar-template.yml` — o CI do próprio template.
- **Mockup-exemplo** demonstrando a convenção `mockups/<tela>/` em `006b/mockups/d7-grupos/`.
- **Versionamento do template**: `VERSION` + este changelog; o `project.md` semeado registra a
  versão de origem.

### Alterado
- `gate.sh`/`ci.yml` canônicos ganham `openspec validate --all --strict` (best-effort local,
  garantido no CI com o OpenSpec CLI instalado).
- Runbook do Dokploy ganha a seção **Backup e RESTORE** (restore em banco temporário, teste
  trimestral registrado no `EXECUTION-LOG.md`); checklist de go-live e skill exigem restore
  validado.

## [1.1.0] — 2026-07-02

### Alterado
- **Split da change `009`** (densa, 4 capabilities) em `009a-mfa-totp`, `009b-login-duas-etapas`
  (Modified `login-sessao`) e `009c-recuperacao-e-primeiro-acesso` — mesmo padrão dos splits de
  `006`/`008`; ledger, README das changes e referências vizinhas atualizados; adendo na auditoria.

## [1.0.0] — 2026-07-02

### Adicionado
- Refatoração completa em 8 fases: `AGENTS.md` como fonte única + adaptadores finos por
  ferramenta; contrato de leitura por change com splits `006a/b` e `008a/b/c`; skills enxutas com
  progressive disclosure e `deploy-dokploy`; handoff de campos nomeados no time hub-and-spoke;
  `/portao` com scanners bloqueantes (gitleaks, npm audit, Semgrep, Trivy); entrega Dokploy
  (Dockerfiles multi-stage, `SECURITY.md`, guias de deploy e segurança GitHub Pro); README,
  WORKFLOW e `docs/ciclo-de-vida.md`.
