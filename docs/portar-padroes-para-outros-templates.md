# Portar os padrões deste template para os templates site e mobile

O full-stack virou a referência da fábrica; este guia lista **o que portar, em que ordem e o que
adaptar** nos outros dois templates. Cada item aponta a fonte aqui dentro — copie e ajuste, não
reinvente. (Este repositório não contém os templates site/mobile; execute o guia dentro de cada um.)

## Ordem recomendada (do mais barato ao mais estrutural)

| # | Padrão | Fonte aqui | Adaptação site | Adaptação mobile |
|---|---|---|---|---|
| 1 | **Fonte única `AGENTS.md` + adaptadores finos** | `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/`, `.windsurf/`, `.github/copilot-instructions.md`, symlink `.agents/skills` | Reescrever as seções de stack/mapa (Next estático/SSG, sem Prisma) | Idem (Expo/React Native, EAS) |
| 2 | **Versionamento** | `VERSION`, `CHANGELOG.md`, campo Origem no `project-md-template.md` | Copiar como está | Copiar como está |
| 3 | **Validação automatizada** | `scripts/validar-template.sh`, `.github/workflows/validar-template.yml` | Ajustar: nº de agentes/commands, remover checks de specs se o template usar changes sem specs | Idem; conferir caminhos das skills |
| 4 | **Contrato de leitura por change + Aceite por checkbox + "Não faça"** | qualquer `changes-templates/0*/proposal.md` (molde: `008a`) | Reapontar os specs citados às capabilities do site | Idem |
| 5 | **Scanners no gate** | `spec-init/assets/gate.sh` + `ci.yml` | Manter gitleaks/semgrep/audit; trivy fs opcional; sem `openspec`? manter o guard `[ -d openspec ]` que já pula sozinho | Igual; e2e vira Maestro/Detox, não Playwright |
| 6 | **Handoff de campos nomeados** | `agents/orchestrator-*.md` (Briefing-padrão) + bloco "Retorno obrigatório" dos especialistas | Reduzir o time às lanes do site (design/frontend/deploy) | Lanes mobile (ui/native/build) |
| 7 | **Progressive disclosure nas skills** | `.claude/skills/README.md` (convenção) | Aplicar a régua ≤150/230 nas skills grandes do site | Idem |
| 8 | **Splits de changes densas** | padrão `006a/b`, `008a/b/c`, `009a/b/c` | Aplicar onde uma change tiver >1 objetivo | Idem |
| 9 | **Runbook de deploy + RESTORE** | `docs/deploy-dokploy.md` | Site estático: adaptar a deploy de estático (Caddy/CDN) — restore vale para formulários/CMS se houver | Mobile: runbook EAS/stores no lugar de Dokploy |
| 10 | **SECURITY.md + guia GitHub Pro** | `SECURITY.md`, `docs/seguranca-github.md`, asset da spec-init | Copiar; cortar o que não se aplica (sem banco → sem seção de backup) | Copiar; adicionar assinatura de app/keystore ao escopo |

## Regras de ouro do porte

- **Copie o mecanismo, reescreva o conteúdo**: a estrutura do `AGENTS.md` e do `validar-template.sh`
  é portável; cada linha de stack/mapa/checks precisa refletir o template alvo.
- **Um commit por padrão portado**, Conventional Commits em português, rodando o
  `validar-template.sh` adaptado ao final de cada um.
- **Não porte o que o alvo não tem**: site sem backend não ganha changes de Prisma/health; mobile
  não ganha Dockerfile — adapte a tabela, não force paridade.
- Ao terminar, registre no `CHANGELOG.md` do template alvo: "padrões portados do
  fabrica-fullstack v<versão>".
