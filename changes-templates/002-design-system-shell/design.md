<!-- TEMPLATE — design do design system. Placeholders: {{produto}}, {{cor-primaria}},
{{cor-primaria-hover}}, {{fonte-texto}}, {{fonte-dados}}, {{secoes-sidebar}}, {{N-telas}}. -->

## Context

Apos a `001`, o frontend tem uma base generica entregue pela skill `frontend-next-config`:
biblioteca de componentes em `shared/components/ui/`, um `globals.css` com CSS variables no padrao
shadcn/radix (atualmente **dark-only**) e o shell de navegacao (`AdminShell` + sidebar generica). As
{{N-telas}} telas do {{produto}} definem a identidade visual real: paleta, fontes, suporte a **tema
claro e escuro** e uma sidebar organizada por secoes/persona.

Esta mudanca aplica essa identidade sobre a base herdada, sem recriar componentes. Como os
componentes consomem CSS variables, re-mapear as variaveis re-skina a biblioteca inteira. O
multi-tenancy (`003`), os papeis/RBAC (`006`) e os modulos de dominio (`004`+) ficam fora do escopo.

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md). Fonte de verdade dos tokens: as
{{N-telas}} telas do {{produto}}.

## Goals / Non-Goals

**Goals:**
- Aplicar a paleta {{produto}} (primaria + semanticas + escala neutra) via CSS variables, em claro e escuro.
- Configurar a tipografia da marca ({{fonte-texto}} para texto, {{fonte-dados}} para dados/codigo).
- Prover alternancia de tema claro/escuro persistente, com o controle no shell.
- Aplicar a marca {{produto}} no shell (logo) e garantir o `toaster` montado.
- Estruturar a navegacao da sidebar por secoes, preparada para gating por papel na `006`.

**Non-Goals:**
- Recriar ou duplicar a biblioteca de componentes `shared/components/ui/*` herdada da `001`.
- Introduzir regras por papel/RBAC na sidebar — apenas deixar a estrutura preparada.
- Introduzir multi-tenancy, branding por organizacao ou qualquer modulo de dominio.
- Construir telas especificas de dominio (dashboards, cadastros) — isso vem nas mudancas de cada modulo.

## Decisions

- **Re-skin via CSS variables, nao por componente**: a tematizacao altera apenas o `globals.css` (e
  a tipografia), aproveitando que os componentes ja leem `--primary`, `--accent`, `--border`,
  `--muted`, `--destructive` etc. Alternativa (estilizar componente a componente) descartada por ser
  fragil, repetitiva e divergir da arquitetura herdada.
- **Tokens {{produto}} (das telas)**: primario `{{cor-primaria}}` (hover/realce
  `{{cor-primaria-hover}}`); escala neutra para superficies/bordas/textos; semanticas `success`,
  `warning`, `danger/destructive`. *(Ajuste os hex a sua marca; a fonte de verdade sao as telas.)*
- **Tema claro + escuro (base era dark-only)**: as telas suportam ambos; a `002` adiciona o tema
  claro e a alternancia `.dark`, com persistencia via `use-local-storage.hook`. **Padrao: tema
  claro** — decisao de baixo custo, facil de inverter.
- **Fontes via `next/font`**: {{fonte-texto}} e {{fonte-dados}}, carregadas localmente para evitar
  dependencia de CDN em runtime e manter consistencia com as telas.
- **Navegacao estatica preparada para papeis**: a sidebar recebe a estrutura de secoes como config
  estatica nesta mudanca; o gating por papel e aplicado na `006`, quando os papeis existirem.
  Alternativa (condicionar por papel agora) descartada por depender de RBAC inexistente.

## Risks / Trade-offs

- [Re-skin via variaveis nao cobre algum componente com cor fixa] → Ajustar pontualmente o
  componente afetado e registrar o desvio na evidencia.
- [Estrutura de navegacao pode mudar quando os papeis chegarem na `006`] → Manter a config isolada e
  declarativa, de modo que o gating seja adicionado sem reescrever a estrutura.
- [Divergencia entre os tokens das telas e o que os componentes shadcn esperam] → Mapear cada CSS
  variable explicitamente a partir da paleta das telas, validando claro e escuro lado a lado.
