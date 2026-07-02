# Política de segurança — Fábrica Fullstack (template)

Este repositório é um **template**. Vulnerabilidades aqui se propagam para todos os projetos
gerados a partir dele — reporte com prioridade.

## Como reportar

- **Não abra issue pública.** Contato: **seguranca@devcraft.dev** (DevCraft).
- Inclua descrição, reprodução, impacto e o arquivo/skill/asset afetado.
- Resposta inicial em até 72h úteis.

## Escopo

Skills e assets (`.claude/skills/**` — em especial `gate.sh`, `ci.yml`, hooks, Dockerfiles),
agentes e comandos (`.claude/agents/**`, `.claude/commands/**`), templates de change
(`changes-templates/**`) e a documentação de processo. Projetos **gerados** têm o próprio
`SECURITY.md` (semeado pela skill `spec-init`, fase 6).

## Postura do template

Gate bloqueante com gitleaks + npm audit + Semgrep + Trivy no CI de cada projeto gerado;
deny de leitura de `.env*`, chaves e `secrets/**` no `settings.json`; segredos de produção
apenas no painel do Dokploy; branch `producao` protegida por ruleset (ver
`docs/seguranca-github.md`).
