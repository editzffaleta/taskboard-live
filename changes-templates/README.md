# Templates de Change (núcleo universal de plataforma)

Templates reaproveitáveis das mudanças fundacionais, no **formato OpenSpec** (pasta por mudança com
`proposal.md` + `design.md` + `tasks.md` + `specs/spec.md` + `.openspec.yaml` + `mockups/`
**condicional**). São mais **detalhados e robustos** que os originais do AlphaBet — cada task tem
**`Aceite:`** explícito, **`Pré:`** e guardrails inline ("não faça") — justamente para reduzir erro
quando a execução roda em modelos mais baratos.

> **Escopo: núcleo universal `000–010` + extensões transversais `011+`** — o núcleo é
> reaproveitável em **qualquer** projeto multi-tenant (orquestração, fundação, design system,
> multi-tenancy, registro, login, RBAC, estrutura organizacional, cadastro de colaboradores,
> MFA/recuperação/1º acesso e perfil); as extensões (e-mail, hardening, observabilidade, seeds,
> e2e, auditoria, sessão rotativa) são **opcionais e recomendadas para produção**, com
> integrações condicionais à presença das changes que tocam. As mudanças **de domínio do
> produto** (cursos, cofre, relatórios etc.) NÃO entram aqui — elas variam por projeto e são
> criadas com o mesmo padrão, fora deste pacote universal.

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
- **Contrato de leitura**: todo `proposal.md` abre com o bloco de contrato — a lista fechada do que
  o executor pode abrir. É a defesa contra estouro de contexto (~250k tokens/change) e alucinação:
  faltou contexto = defeito do `design.md`; conserta-se o trilho, não se abre o repositório.
- Cada feature referencia as skills do catálogo (`config-*`, `module-*`, `backend-*`, `frontend-*`)
  como implementação principal das tasks.

## Mockups (Claude Design) — condicional por tela

- Tela **com** mockup → o mockup vive **dentro da própria change**, em `mockups/<tela>/`
  (ex.: `006b-rbac-gating-ui/mockups/d7-grupos/`). Tela **sem** mockup → **não** crie subpasta;
  o `design.md` basta.
- Regra de execução: **reproduzir fielmente o layout** do mockup e **substituir todo dado
  fake/placeholder por dado real** do backend — proibido lorem/valor mockado no código final.
- Os códigos de tela (D2, D7, A2, B9…) referem-se aos seus mockups; ajuste-os por projeto.
- **Exemplo demonstrativo** da estrutura: `006b-rbac-gating-ui/mockups/d7-grupos/` (README +
  HTML com dados `data-fake` — substitua pelos mockups reais ou delete se a tela não tiver).

## Mapa (000–010 + extensões)

`000` orquestração · `001` base do projeto · `002` design system/shell · `003` multi-tenancy ·
`004` registro de usuário · `005` login/sessão · `006a` RBAC (mecanismo backend) ·
`006b` RBAC (gating de UI + telas D7/D8/D9) · `007` estrutura organizacional ·
`008a` colaboradores (CRUD + D2/D3) · `008b` colaboradores (aprovação + D29) ·
`008c` colaboradores (convites + A6) · `009a` MFA TOTP (mecanismo + A3) ·
`009b` login em duas etapas (A2) · `009c` recuperação de senha + 1º acesso (A4/A5) · `010` perfil.

**Extensões (opcionais):** `011` e-mail transacional · `012` hardening HTTP ·
`013` observabilidade · `014` seeds de desenvolvimento · `015` fundação e2e ·
`016` auditoria de ações · `017` sessão rotativa (refresh token).

> As antigas `006`, `008` e `009` (densas) foram **divididas por sufixo** para caber com folga
> no orçamento de contexto por change; a ordem topológica está no ledger da `000`.

## Pontos de ajuste por projeto

- **Papéis** (`colaborador|lider|admin_org|super_admin`) e **chaves de permissão** são o default desta
  família de produtos — troque pelos do seu domínio.
- **`003` multi-tenancy** assume que o produto é multi-tenant; se não for, remova/adapte.
- **`006a`/`006b`** incluem `specs/spec.md` (o AlphaBet original não tinha) — apague-os se quiser
  espelhar o original.
- **Códigos de tela** (D4, D7, A2, B9…) referem-se aos seus mockups; ajuste-os.
