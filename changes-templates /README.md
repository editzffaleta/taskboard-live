# Templates de Change (núcleo universal de plataforma)

Templates reaproveitáveis das mudanças fundacionais, no **formato OpenSpec** (pasta por mudança com
`proposal.md` + `design.md` + `tasks.md` + `specs/spec.md` + `.openspec.yaml`). São mais **detalhados
e robustos** que os originais do AlphaBet — cada task tem **`Aceite:`** explícito, **`Pré:`** e
guardrails inline ("não faça") — justamente para reduzir erro quando a execução roda em modelos mais
baratos.

> **Escopo: núcleo universal `000–010`** — reaproveitável em **qualquer** projeto multi-tenant
> (orquestração, fundação, design system, multi-tenancy, registro, login, RBAC, estrutura
> organizacional, cadastro de colaboradores, MFA/recuperação/1º acesso e perfil). As mudanças
> **de domínio do produto** (cursos, cofre, relatórios etc.) NÃO entram aqui — elas variam por
> projeto e são criadas com o mesmo padrão, fora deste pacote universal.

## Como usar (por projeto novo)

1. Copie a(s) pasta(s) de mudança para `openspec/changes/` do seu projeto (ex.: `001-base-do-projeto/`).
2. Substitua os **placeholders** (listados no topo de cada `proposal.md`): `{{produto}}`,
   `{{namespace}}`, tokens/fontes/seções no `002`, etc. Remova os comentários de instrução.
3. Ajuste o que é específico do projeto: paleta/fontes às suas telas, papéis, campos e códigos de tela.
4. Mantenha os **checkboxes vazios**. A execução é conduzida pela mudança `000` (o maestro):
   `/openspec:apply <mudança>` por subagente → portão de qualidade → `/openspec:archive` → commit,
   marcando cada checkbox com evidência no formato de `openspec/shared/como-executar.md`.

## Convenções

- Comandos: `/openspec:*` (apply/archive/sync).
- A `000-orquestracao-execucao` é mudança de **processo** (sem `specs/`); as demais são features com `specs/`.
- Cada feature referencia as skills do catálogo (`config-*`, `module-*`, `backend-*`, `frontend-*`)
  como implementação principal das tasks.

## Mapa (000–010)

`000` orquestração · `001` base do projeto · `002` design system/shell · `003` multi-tenancy ·
`004` registro de usuário · `005` login/sessão · `006` RBAC · `007` estrutura organizacional ·
`008` cadastro de colaboradores · `009` MFA/recuperação/1º acesso · `010` perfil.

## Pontos de ajuste por projeto

- **Papéis** (`colaborador|lider|admin_org|super_admin`) e **chaves de permissão** são o default desta
  família de produtos — troque pelos do seu domínio.
- **`003` multi-tenancy** assume que o produto é multi-tenant; se não for, remova/adapte.
- **`006`** inclui um `specs/spec.md` (o AlphaBet original não tinha) — apague se quiser espelhar o original.
- **Códigos de tela** (D4, D7, A2, B9…) referem-se aos seus mockups; ajuste-os.
