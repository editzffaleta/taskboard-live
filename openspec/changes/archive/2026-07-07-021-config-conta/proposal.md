> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/config-conta/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/config-conta/spec.md`) ·
> `openspec/changes/021-config-conta/mockups/` (`Configuracoes da Conta.dc.html`, PNGs) ·
> e, **somente se o `design.md` citar nominalmente**: arquivos de código listados,
> `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O módulo `auth` já cobre registro (`003`) e login/sessão (`004`): há `User { id, name, email,
password }`, `CryptoProvider` (bcrypt), `UserRepository`, `AuthContext` no front carregando
`{ sub, name, email }` do JWT. Falta, porém, uma tela onde o próprio usuário administre a sua
conta — o mockup `Configuracoes da Conta.dc.html` mostra quatro abas: **Perfil**, **Segurança**,
**Preferências** e **Zona de perigo**. Esta change entrega essa tela, mas **apenas com o que já
tem dado real por trás**: editar nome, trocar senha, tema/idioma (onde a infraestrutura já
existe) e excluir a própria conta. O restante do mockup (2FA, sessões/dispositivos ativos,
notificações por e-mail) é **fiel visualmente, mas estático/desabilitado** — o TaskBoard Live não
tem TOTP, refresh token/sessões nem provedor de e-mail, e não é objetivo desta change construir
essa infraestrutura.

## What Changes

- **Perfil (real)**: novo caso de uso `update-profile` no módulo `auth` — o usuário autenticado
  altera o próprio `name` (`email` permanece somente leitura nesta change). Endpoint
  `PATCH /auth/me`, protegido pelo guard de autenticação já existente (JWT), usando o `userId`
  das claims (`sub`), nunca um `id` vindo do corpo. O front atualiza o `AuthContext` localmente
  com o `name` retornado pelo endpoint (sem exigir novo login para refletir na UI).
- **Segurança — trocar senha (real)**: novo caso de uso `change-password` — recebe senha atual +
  nova senha, valida a atual via `CryptoProvider.compare`, aplica as mesmas regras de força de
  senha do registro (`StrongPasswordRule`/`NoCommonPasswordRule`), grava o novo hash. Endpoint
  `PATCH /auth/me/password`, mesmo guard de autenticação.
- **Segurança — 2FA e sessões/dispositivos (placeholder, fora de escopo)**: renderizadas fiéis ao
  mockup, porém **estáticas e desabilitadas**, com nota "em breve". Não implementar TOTP nem
  qualquer infraestrutura de sessão/refresh token.
- **Preferências (parcial, real onde a infra já existe)**: tema claro/escuro reaproveitando
  `ThemeProvider`/`useThemeContext` (`shared/context/theme.context.tsx`), já existente e
  funcional — só integrar o seletor nesta tela. Idioma pt/en reaproveitando o módulo de i18n já
  existente (`shared/i18n`, `setI18nLocale`/`getCurrentLocale`), persistido em `localStorage` —
  real, com a limitação documentada no `design.md` (recarrega a página para refletir 100% do
  texto, pois o dicionário não é reativo a mudança de estado React). Notificações por e-mail:
  **placeholder** — não há provedor de e-mail no projeto; toggle renderizado desabilitado.
- **Zona de perigo — excluir conta (real)**: novo caso de uso `delete-account` — remove o próprio
  usuário autenticado. Regra de negócio explícita (detalhada no `design.md`): a exclusão é
  **bloqueada** se o usuário for owner de algum quadro que tenha outros membros (nesse caso, o
  usuário deve primeiro excluir o quadro ou remover os membros — fluxos já existentes, `005`/
  `010`); quadros de que é owner **sem** outros membros são excluídos em cascata junto com a
  conta. Memberships em quadros de terceiros são removidas (o usuário "sai" desses quadros).
  Endpoint `DELETE /auth/me`; após sucesso, o front faz logout (limpa o cookie/`AuthContext`) e
  navega para a landing pública.
- Migration necessária: ajuste de `onDelete` em relações Prisma que referenciam `User`
  (`Comment.author`, `Activity.actor`) para `Cascade` — sem isso, excluir a própria conta falha
  por restrição de chave estrangeira sempre que o usuário tiver comentado ou gerado qualquer
  atividade em um quadro. Nenhum campo novo é adicionado ao `User`.

## Fora de escopo (explícito)

- **Autenticação em 2 fatores (TOTP)**: exige biblioteca de TOTP, fluxo de QR code e segredo
  persistido — não implementado; seção renderizada estática/desabilitada.
- **Sessões e dispositivos ativos**: exige infraestrutura de refresh token/sessões (o projeto usa
  JWT único de 7 dias sem tabela de sessões, `004`) — não implementado; seção estática/
  desabilitada.
- **Notificações por e-mail**: exige provedor de e-mail (SMTP/SES/etc.), inexistente no projeto —
  toggle renderizado desabilitado, sem persistência nem efeito.
- **Edição de e-mail**: fora de escopo nesta change (mantido somente leitura); reabrir em change
  futura se necessário (exigiria reverificação de e-mail).
- **Transferência de ownership de quadro** como alternativa à exclusão de conta: não implementada
  — a regra de bloqueio de exclusão exige que o usuário resolva a situação pelos fluxos já
  existentes (`005`/`010`).

## Capabilities

### New Capabilities
- `config-conta`: tela "Configurações da Conta" do TaskBoard Live — Perfil (editar `name`),
  Segurança (trocar senha real; 2FA e sessões como placeholder estático), Preferências (tema real,
  idioma real com limitação documentada, notificações por e-mail como placeholder) e Zona de
  perigo (excluir a própria conta, com a regra de bloqueio por quadros owner com outros membros).

### Modified Capabilities
<!-- Nenhuma: `login-sessao` (`004`) e `registro-usuario` (`003`) não têm seus contratos
alterados; apenas o módulo `auth` ganha três casos de uso novos e `Board`/`Membership`/`Comment`/
`Activity` são consumidos (e, no caso de `Comment`/`Activity`, ajustados via migration) sem mudar
seus contratos públicos. -->

## Impact

- **Domínio (`modules/auth`)**: três novos casos de uso — `update-profile.usecase.ts`,
  `change-password.usecase.ts`, `delete-account.usecase.ts` — reaproveitando `User`,
  `UserRepository`, `CryptoProvider` já existentes; nenhuma entidade nova.
- **Domínio (`modules/board`)**: `delete-account` consulta `BoardRepository`/
  `MembershipRepository` (já existentes, `005`/`010`) para aplicar a regra de bloqueio/cascata —
  sem alterar seus contratos.
- **Backend**: `AuthController` ganha `PATCH /auth/me`, `PATCH /auth/me/password`,
  `DELETE /auth/me`, todos atrás do guard JWT já existente (`004`), usando o `userId` de
  `CurrentUser`/`AuthenticatedUser`; migration ajustando `onDelete` de `Comment.author` e
  `Activity.actor` para `Cascade` em `apps/backend/prisma/models/*.model.prisma`.
- **Frontend**: nova rota de Configurações da Conta em `apps/frontend/src/app/(private)/`,
  componentes em `apps/frontend/src/modules/auth/components/`, integração com `AuthContext`
  (atualização local do `name` após `update-profile`, logout após `delete-account`), reuso de
  `ThemeProvider`/`theme-toggle.component.tsx` e do módulo `shared/i18n`; i18n pt/en para todos
  os textos novos, inclusive das seções placeholder ("em breve").
- **Fora de escopo**: 2FA/TOTP, sessões/dispositivos ativos, notificações por e-mail reais,
  edição de e-mail, transferência de ownership de quadro.
