---
name: frontend-next-config
description: 'Configura a base do FRONTEND Next.js num projeto de destino: copia a pasta shared/, gera o arquivo de navegacao, cria os grupos de rota (public)/(private) com sidebar, instala dependencias e roda build de verificacao com autocorrecao — detectando namespace e caminhos automaticamente. Usar UMA vez por frontend novo (ou para reinstalar a base). Nao usar para autenticacao no frontend (spec-frontend-auth), para criar telas de feature nem para o backend.'
tools: Read, Glob, Grep, Bash, Write, Edit
compatibility: claude-code, opencode
---

# frontend-next-config

Recria a pasta `shared/` e a estrutura de rotas Next.js em qualquer projeto frontend de destino.  
Todos os arquivos necessários estão **embarcados** nesta skill em `assets/` — a skill é autossuficiente.

## Localização dos assets

Os assets desta skill estão **em caminho detectado automaticamente na Fase 0**:
```
{SKILL_DIR}/assets/
  shared/          ← pasta shared completa, genérica, pronta para copiar
  navigation/      ← templates de app-modules, rotas e sidebar navigation
  app/             ← templates de layouts e páginas de rota Next.js
```

---

## Fase 0 — Detectar ambiente (SEMPRE executar primeiro)

Esta fase nunca pula. Capture todas as variáveis antes de avançar.

### 0a. Raiz do projeto

```bash
git rev-parse --show-toplevel 2>/dev/null || pwd
```

Capture como `{PROJECT_ROOT}`.

### 0b. Caminho da skill

```bash
find "{PROJECT_ROOT}/.claude/skills" -maxdepth 1 -type d -name "frontend-next-config" 2>/dev/null | head -1
```

Capture como `{SKILL_DIR}`. Fallback: `{PROJECT_ROOT}/.claude/skills/frontend-next-config`.

### 0c. Namespace do pacote compartilhado

```bash
cat "{PROJECT_ROOT}/packages/shared/package.json" 2>/dev/null | grep '"name"' | head -1
```

Extraia o valor do campo `name` (ex: `@sdd/shared`, `@myapp/shared`) e capture como `{SHARED_PKG_NAME}`.  
Se `packages/shared/package.json` não existir, defina `{SHARED_PKG_NAME}` como vazio e pule instalação desse pacote.

### 0d. Diretório de destino padrão

```bash
find "{PROJECT_ROOT}/apps" -maxdepth 1 -type d -name "frontend" 2>/dev/null | head -1
```

Capture como `{DEST}` (padrão: `{PROJECT_ROOT}/apps/frontend`).  
Será sobrescrito se o usuário informar caminho diferente na Fase 2.

---

## Fase 1 — Ler contexto do projeto destino

Com `{DEST}` detectado, colete informações adicionais:

```bash
cat "{DEST}/package.json" | grep -E '"name"|"next"|"react"'
cat "{DEST}/tsconfig.json" | grep -A5 '"paths"'
ls "{DEST}/src/app/" 2>/dev/null
ls "{DEST}/src/" 2>/dev/null || ls "{DEST}/app/" 2>/dev/null
```

Capture:
- Versão do Next.js
- Alias de paths (`@/*` → `./src/*` ou `./app/*`)
- Se já existe pasta `shared/` no destino (pedir confirmação antes de sobrescrever)
- Se já existe estrutura `app/(private)/` ou `app/(public)/`

---

## Fase 2 — Coletar configuração interativa

Perguntar ao usuário (em português):

```
1. Qual é o caminho absoluto do projeto de DESTINO?
   (padrão detectado: {DEST})
   Pressione Enter para usar o padrão ou informe outro caminho.

2. O projeto tem autenticação com guard de rota?
   Se sim, qual é o componente/hook de guard? (ou "não sei" para deixar TODO comentado)
```

Se o usuário der respostas parciais, usar os padrões da skill sem inferir nada do projeto.

---

## Fases 3 → 9 — execução detalhada (referência)

O passo a passo completo (comandos, snippets e autocorreções) está em
[references/fases-3-a-9.md](references/fases-3-a-9.md). Sequência e critério de pronto de cada fase:

| Fase | O que faz | Verificação de pronto |
|---|---|---|
| 3 | Copia a pasta `shared/` (checando existência prévia; substitui placeholders de namespace) | `shared/` presente sem `{{...}}` restante |
| 4 | Gera o arquivo de navegação (`AppSidebarNavigation` com as seções coletadas na Fase 2) | arquivo criado; import resolve |
| 5 | Cria a estrutura de rotas: root layout (TooltipProvider + metadados), grupos `(public)`/`(private)`, sidebar | rotas existem; `npx tsc --noEmit` ok |
| 6 | Instala as dependências dos componentes da `shared/` | `npm ls` sem missing |
| 7 | Verificação de sanidade (arquivos no lugar, sem placeholders órfãos) | checagens todas verdes |
| 8 | Relatório final estruturado do que foi criado/alterado | relatório exibido |
| 9 | Build de verificação com autocorreção (roda `npm run build`; corrige erros triviais e reexecuta) | build verde |

> Não pule fases nem reordene; cada fase assume as anteriores concluídas.

## Regras obrigatórias

- **Nunca** referenciar caminhos absolutos hardcoded na skill — usar sempre variáveis detectadas na Fase 0
- **Nunca** importar de projetos externos ou específicos nos arquivos gerados
- **Nunca** inferir nome do app, módulos ou rotas a partir do contexto do projeto
- **Sempre** usar os assets embarcados em `{SKILL_DIR}/assets/` como fonte
- **Confirmar** antes de sobrescrever arquivos existentes no destino
- **Manter** todos os imports `@/shared/...` intactos — não alterar o sistema de alias
- O `sidebar-menu.component.tsx` é o coração do sistema de navegação — nunca alterar sua lógica
- A instalação de dependências (Fase 6) é **obrigatória** — não reportar como concluído sem executá-la
- O build de verificação (Fase 9) é **obrigatório** — não reportar como concluído sem rodar o build e resolver todos os erros ou listar explicitamente o que restou
