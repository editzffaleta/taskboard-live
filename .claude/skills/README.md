# Catálogo de skills — convenção

28 skills ativas + `_arquivadas/`. Cada skill é uma pasta com `SKILL.md` (obrigatório),
`references/` (detalhe opcional), `assets/` (arquivos a copiar) e `agents/openai.yaml`
(adaptador Codex: display_name, short_description, default_prompt — presente em 100%).

## Frontmatter (contrato de carregamento)

```yaml
---
name: nome-da-skill
description: 'O que faz. Usar quando <gatilho>. Nao usar para <anti-gatilho> (skill certa).'
compatibility: claude-code, opencode
---
```

- A `description` é o que decide o carregamento automático: **gatilho explícito** e, nas skills
  com vizinhas confundíveis (`spec-*`, `backend-prisma-*`, `config-new-module`/`module-aggregate`,
  `frontend-next-config`/`spec-frontend-auth`), **anti-gatilho apontando a skill certa**.
- `compatibility` é informativo (campos extras são ignorados pelos runners); OpenCode lê estas
  skills direto de `.claude/skills/` e o symlink `.agents/skills` cobre o local cross-tool.

## Tamanho e progressive disclosure

- **Alvo: corpo ≤ 150 linhas.** Skills-core de scaffolding/orquestração toleram até ~230 quando
  100% do conteúdo é operacional (hoje: `module-use-case` 236, `module-entity` 210,
  `spec-backend-auth-basic` 185).
- Conteúdo denso (heurísticas, sequências longas, few-shots, comandos extensos por fase) vive em
  `references/*.md`, com **resumo-ponteiro** no corpo: o que a seção decide + link + regra de
  desempate. Nunca duplicar: um assunto, um arquivo.
- Corpo segue: objetivo → quando usar/não usar → entradas/saídas → passos
  (comando → resultado esperado → verificação) → Do/Don't → saída esperada.

## Assets canônicos

- `spec-init/assets/` é o **canônico** de `ci.yml`, `gate.sh`, hooks e kit de segredos.
  Outras skills (ex.: `spec-flow`) **copiam de lá** — proibido manter cópia própria (já houve
  drift: a cópia do spec-flow ficou sem gitleaks).

## Arquivadas

`_arquivadas/` guarda skills fora do fluxo (ex.: `deploy-node-ubuntu-vps`, substituída pela
`deploy-dokploy`). Não usar em projetos novos; ver o README da pasta.
