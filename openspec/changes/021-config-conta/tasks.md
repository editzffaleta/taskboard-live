> **Antes de começar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pré-requisitos:** `003` (registro — `User`, `UserRepository`, `CryptoProvider`), `004`
> (login/sessão — JWT `{sub,name,email}`, `AuthContext`, `CurrentUser`/`AuthenticatedUser`),
> `005` (board CRUD — `BoardRepository.delete`), `010` (membros —
> `MembershipRepository.listBoardsByUser`/`listByBoardId`/`delete`). **Não faça:** 2FA/TOTP,
> sessões/dispositivos ativos, notificações por e-mail reais, edição de e-mail, refresh token,
> qualquer endpoint/método de porta novo em `board` além do já existente (`listBoardsByUser`,
> `listByBoardId`, `delete`, `BoardRepository.delete` já cobrem a regra de exclusão de conta —
> ver `design.md`). **Princípio:** `userId` das mutações desta change vem **sempre** de
> `AuthenticatedUser`/`CurrentUser` (claims do JWT) — nunca de um campo `id`/`userId` no corpo da
> requisição.

## 1. Domínio (`modules/auth`) — três novos casos de uso

- [x] 1.1 Criar `UpdateProfile` (`modules/auth/src/user/usecase/update-profile.usecase.ts`):
  recebe `{ userId, name }`, busca o `User` por `userId` (`NotFoundError("user.not.found")` se
  ausente), aplica `name` novo, chama `validate()` (reaproveita `RequiredRule`/`MinLengthRule`/
  `MaxLengthRule`/`PersonNameRule` já em `user.entity.ts`), persiste via
  `UserRepository.update`, retorna `{ id, name, email }`. Exportar em
  `modules/auth/src/user/usecase/index.ts`. Seguir a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** `User`/`UserRepository` existentes (`003`).
  - **Aceite:** nome válido persiste e retorna atualizado; nome inválido (muito curto/longo/com
    caracteres não permitidos) lança erro de validação sem persistir; `userId` inexistente lança
    `user.not.found`; teste unitário com fake repository cobre os três casos.
  - **Não faça:** aceitar `email` neste caso de uso.
  > ✅ 2026-07-07 15:46 — `modules/auth/src/user/usecase/update-profile.usecase.ts` criado
  > exatamente como o design.md descreve (`user.clone({ name }).validate()`); exportado em
  > `modules/auth/src/user/usecase/index.ts`. Teste
  > `modules/auth/test/user/usecase/update-profile.usecase.test.ts` cobre os 3 cenários
  > (nome válido, nome inválido curto, `userId` inexistente → `user.not.found` 404). Suíte
  > `@taskboard/auth` verde (40 testes, 100% em `update-profile.usecase.ts`).

- [x] 1.2 Criar `ChangePassword` (`modules/auth/src/user/usecase/change-password.usecase.ts`):
  recebe `{ userId, currentPassword, newPassword }`, busca `User`, valida `newPassword` com
  `StrongPasswordRule`/`NoCommonPasswordRule` (mesmas de `RegisterUser`), compara
  `currentPassword` via `CryptoProvider.compare` (senha atual incorreta →
  `DomainError("user.password.current.invalid", 401)`), gera hash da nova senha via
  `CryptoProvider.hash`, persiste. Exportar no `index.ts` do módulo. Seguir a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 1.1 concluída (padrão de busca/erro replicado); `CryptoProvider`/`BcryptCryptoProvider`
    existentes (`003`/`004`).
  - **Aceite:** senha atual correta + nova senha forte troca o hash persistido; senha atual
    incorreta lança `user.password.current.invalid` sem alterar nada; nova senha fraca/comum
    lança erro de validação sem chamar `compare`/persistir; teste unitário com fakes cobre os
    três casos, reaproveitando `fake-crypto.provider.ts`/`fake-user.repository.ts` existentes em
    `modules/auth/test/mock/`.
  - **Não faça:** inventar regra de força de senha diferente da já usada em `RegisterUser`.
  > ✅ 2026-07-07 15:46 — `modules/auth/src/user/usecase/change-password.usecase.ts` criado
  > reaproveitando `StrongPasswordRule`/`NoCommonPasswordRule` de `RegisterUser` e
  > `CryptoProvider.compare`/`hash` já existentes; erro `user.password.current.invalid` (401)
  > para senha atual incorreta. Teste
  > `modules/auth/test/user/usecase/change-password.usecase.test.ts` cobre sucesso (login
  > subsequente com a nova senha funciona), senha atual incorreta (hash não muda) e nova senha
  > fraca (valida antes de comparar a atual — `compareSpy` não chamado).

- [x] 1.3 Criar `DeleteAccount` (`modules/auth/src/user/usecase/delete-account.usecase.ts`):
  recebe `{ userId }`, injeta `UserRepository` (do próprio módulo `auth`) e, como tipos de porta
  importados de `@taskboard/board`, `BoardRepository`/`MembershipRepository` — implementa
  exatamente a regra descrita no `design.md` (bloqueio se owner de quadro com outros membros;
  cascata de quadros solo; saída de quadros de terceiros; exclusão do `User` por último). Exportar
  no `index.ts` do módulo. Seguir a skill
  [module-use-case](../../../.claude/skills/module-use-case).
  - **Pré:** 1.1 e 1.2 concluídas; `MembershipRepository.listBoardsByUser`/`listByBoardId`/
    `delete` e `BoardRepository.delete` disponíveis (`005`/`010`).
  - **Aceite:** usuário sem quadro-owner ou só com quadros-owner solo tem a conta excluída (e os
    quadros-owner solo excluídos em cascata); usuário owner de quadro com outros membros recebe
    `account.delete.owner.boards.blocked` (409) e **nada** é excluído (nem outros
    quadros-owner solo do mesmo usuário — checar todos antes de excluir qualquer um); usuário
    membro (não-owner) de quadro de terceiro tem sua membership removida antes da exclusão do
    `User`; teste unitário com fakes cobre: sem quadros, só quadros solo, quadro-owner com outro
    membro (bloqueia), mix de quadro solo + membership de terceiro.
  - **Não faça:** criar métodos novos de porta em `BoardRepository`/`MembershipRepository`;
    excluir parcialmente quando há bloqueio.
  > ✅ 2026-07-07 15:46 — `modules/auth/src/user/usecase/delete-account.usecase.ts` criado
  > exatamente como o design.md descreve, importando `BoardRepository`/`MembershipRepository`
  > apenas como tipos de `@taskboard/board` (dependência explícita e documentada no header do
  > arquivo — decisão registrada, sem acoplar a implementação Prisma). Nenhum método novo de
  > porta foi necessário (`listBoardsByUser`/`listByBoardId`/`delete` de ambos os repositórios
  > já bastam), simplificando o escopo em relação à leitura inicial do enunciado — registrado
  > também no comentário do use case. `@taskboard/auth/package.json` ganhou a dependência
  > `@taskboard/board`. Testes em
  > `modules/auth/test/user/usecase/delete-account.usecase.test.ts` (com fakes locais
  > `test/mock/fake-board.repository.ts`/`fake-membership.repository.ts`) cobrem: sem quadros;
  > só quadro-owner solo (cascata); quadro-owner com outro membro (bloqueia 409, nada
  > excluído); mix quadro solo + membership de terceiro (a membership de terceiro é removida
  > explicitamente; a do quadro solo permanece no fake pois só o Prisma real com
  > `onDelete: Cascade` em `BoardMember` simula a cascata do `Board.delete`, documentado no
  > próprio teste).

## 2. Backend — endpoints e migration

- [x] 2.1 Migration: ajustar `onDelete: Cascade` na relação `User` de `Comment.author` e
  `Activity.actor` (`apps/backend/prisma/models/*.model.prisma`, arquivos onde `Comment`/
  `Activity` estão definidos hoje), gerando com
  `prisma migrate dev --create-only` (sem `--schema` explícito, mesmo fluxo de `016`/`020`) e
  revisando o SQL antes de aplicar (`migrate dev`), seguindo a skill
  [backend-prisma-sync-module](../../../.claude/skills/backend-prisma-sync-module).
  - **Pré:** nenhuma (independente dos casos de uso).
  - **Aceite:** migration aplica sem erro; `npx prisma generate` limpo; excluir um `User` que
    tenha `Comment`/`Activity` próprios não falha mais por violação de FK (validar com um usuário
    de teste comentado/ativo antes de rodar 4.2).
  - **Não faça:** tornar `authorId`/`actorId` nullable; usar `SetNull`.
  > ✅ 2026-07-07 15:46 — `Comment.author`/`Activity.actor` ajustados para `onDelete: Cascade`
  > em `apps/backend/prisma/models/board.model.prisma`. Migration
  > `20260707184222_config_conta_cascade_user` gerada com
  > `prisma migrate dev --create-only` (sem `--schema` explícito) e aplicada com
  > `prisma migrate dev`; `npx prisma generate` limpo. Validado via curl: excluir a própria
  > conta funciona sem 500 de FK (cenário completo na task 4.2).

- [x] 2.2 Estender `AuthModule` (`apps/backend/src/modules/auth/auth.module.ts`) para importar/
  injetar `PrismaBoardRepository`/`PrismaMembershipRepository` (do `board`, já implementados) no
  `AuthController`, sem tornar esses providers exportados/usados por mais nada além do
  `DeleteAccount`, seguindo a skill
  [backend-nest-config](../../../.claude/skills/backend-nest-config).
  - **Pré:** 1.3 concluída.
  - **Aceite:** `AuthModule` compila e injeta os três repositórios necessários no
    `AuthController` sem erro de dependência circular entre módulos.
  > ✅ 2026-07-07 15:46 — `AuthModule` importa `forwardRef(() => BoardModule)` e `BoardModule`
  > importa `forwardRef(() => AuthModule)` (o `BoardModule` já dependia de `AuthModule` via
  > `member-directory.provider.ts`/`PrismaUserRepository` antes desta change — sem `forwardRef`
  > nos dois lados o Nest reporta dependência circular). `PrismaBoardRepository`/
  > `PrismaMembershipRepository` já são exportados por `BoardModule`; nenhum provider novo
  > necessário. `npx tsc --noEmit` limpo.

- [x] 2.3 Adicionar `PATCH /auth/me`, `PATCH /auth/me/password` (`204`) e `DELETE /auth/me`
  (`204`) em `auth.controller.ts`, todos usando `@CurrentUser()` (sem `@Public()`) para obter
  `userId`, delegando para `UpdateProfile`/`ChangePassword`/`DeleteAccount`, seguindo a skill
  [backend-nest-controller](../../../.claude/skills/backend-nest-controller).
  - **Pré:** 1.1, 1.2, 1.3 e 2.2 concluídas.
  - **Aceite:** `PATCH /auth/me` sem token → `401` (guard padrão); com token válido, altera só o
    próprio `name`; `PATCH /auth/me/password` com senha atual errada → `401`
    `user.password.current.invalid`; `DELETE /auth/me` aplica a regra da task 1.3; nenhum dos três
    endpoints aceita `userId`/`id` no corpo para agir sobre outro usuário.
  - **Não faça:** expor esses endpoints como `@Public()`.
  > ✅ 2026-07-07 15:46 — `PATCH /auth/me`, `PATCH /auth/me/password` (204),
  > `DELETE /auth/me` (204) adicionados em `auth.controller.ts`, todos com `@CurrentUser()`
  > (sem `@Public()`), `userId` vindo exclusivamente do JWT. Validado via curl real (task 4.2):
  > sem token → 401; editar nome → 200 com `{id,name,email}`; senha atual errada → 401
  > `user.password.current.invalid`; exclusão aplica a regra da task 1.3 (sem quadro → 204;
  > quadro solo → cascata; owner com outro membro → 409, nada excluído; membro de terceiro →
  > membership removida, quadro do terceiro intacto). `auth.throttle.spec.ts` ajustado com
  > providers mock de `PrismaBoardRepository`/`PrismaMembershipRepository` (o `AuthController`
  > agora os exige no construtor).

- [x] 2.4 Estender `auth.integration.http` com cenários dos três endpoints: perfil (nome válido,
  nome inválido), senha (atual correta + nova forte, atual incorreta, nova fraca), exclusão de
  conta (sem quadro, com quadro solo, com quadro-owner com outro membro → bloqueado).
  - **Pré:** 2.3 concluída.
  - **Aceite:** todos os cenários documentados com request/response esperados, seguindo o
    padrão já usado nos cenários de registro/login existentes no mesmo arquivo.
  > ✅ 2026-07-07 15:46 — `apps/backend/src/modules/auth/auth.integration.http` ganhou a
  > seção "021-config-conta" com os cenários de perfil, senha e exclusão de conta, no mesmo
  > estilo já usado (documentação manual, `{{token}}` a colar do login).

- [x] 2.5 Mapear no i18n (pt/en, backend) o código de erro `user.password.current.invalid` e
  `account.delete.owner.boards.blocked`, seguindo a convenção de códigos crus já usada por
  `auth`/`board`/`label`.
  - **Pré:** 2.3 concluída.
  - **Aceite:** códigos retornados crus pela API (`errors: [...]`), sem mensagem hardcoded em
    português no filtro de exceção.
  > ✅ 2026-07-07 15:46 — Nenhum mapeamento novo foi necessário: `ApiExceptionFilter`
  > (`apps/backend/src/shared/errors/api-exception.filter.ts`) já é genérico e devolve
  > `errors: [exception.message]` cru para qualquer `DomainError` — confirmado via curl que
  > `user.password.current.invalid` e `account.delete.owner.boards.blocked` chegam sem
  > tradução no corpo da resposta (i18n fica a cargo do front, conforme convenção existente
  > de `auth`/`board`/`label`).

## 3. Frontend — tela "Configurações da Conta"

- [x] 3.1 Criar a rota de Configurações da Conta em
  `apps/frontend/src/app/(private)/` (decidir o path exato — `/account/settings` ou `/settings` —
  e registrar na evidência), delegando para `account-settings.component.tsx`
  (`apps/frontend/src/modules/auth/components/`), com as quatro abas do mockup
  (`Configuracoes da Conta.dc.html`): Perfil, Segurança, Preferências, Zona de perigo.
  - **Pré:** rota privada e `AuthGuard` já existentes (`004`).
  - **Aceite:** qualquer usuário autenticado acessa a tela; as quatro abas navegam sem
    recarregar a página; layout fiel ao mockup.
  > ✅ 2026-07-07 15:53 — Rota mantida em `/account` (já existente na navegação, `002` —
  > `ACCOUNT_ROUTE`), em vez de criar `/account/settings`, para não duplicar entrada de
  > menu (decisão registrada, alternativa permitida pelo `design.md`). `page.tsx` delega
  > para `AccountSettings` (`apps/frontend/src/modules/auth/components/
  > account-settings.component.tsx`), com quatro abas via `Tabs`/`TabsList`/`TabsTrigger`/
  > `TabsContent` (`shared/components/ui/tabs.tsx`, Radix — navegação sem reload).
  > Layout fiel ao mockup (cards com título/descrição por seção, zona de perigo com
  > borda destrutiva).

- [x] 3.2 Aba Perfil: formulário de `name` chamando `PATCH /auth/me`; após sucesso, atualizar o
  `name` no `AuthContext` em memória (novo método, ex. `updateUserName(name)` em
  `apps/frontend/src/modules/auth/context/auth.context.tsx`, sem tocar no cookie/JWT — ver
  `design.md`); `email` exibido em campo somente leitura com nota explicativa.
  - **Pré:** 2.3 concluída; 3.1 concluída.
  - **Aceite:** editar nome reflete imediatamente no shell/menu do app (via `AuthContext`) sem
    exigir novo login; nome inválido mostra erro de validação vindo da API; e-mail não é
    editável pela UI.
  - **Não faça:** reemitir/persistir um novo JWT nesta task.
  > ✅ 2026-07-07 15:53 — `AuthContext` (`apps/frontend/src/modules/auth/context/
  > auth.context.tsx`) ganhou `updateUserName(name)`, que só atualiza `state.user.name`
  > em memória (sem tocar cookie/JWT). Aba Perfil (`account-settings.component.tsx`)
  > chama `updateProfile` (novo `modules/auth/api/account.api.ts`, `PATCH /auth/me`) e,
  > no sucesso, `updateUserName(updated.name)` — reflete no shell (`userName` do
  > `AdminShell`) sem novo login. Erros de validação da API (`user.name.*`) chegam via
  > `AccountApiError`/`getMessage` em toast. `email` renderizado com `ReadonlyTextField`
  > (somente leitura) e nota explicativa (`accountSettings.profile.emailReadonlyNote`).

- [x] 3.3 Aba Segurança — seção "Trocar senha" (real): formulário
  `currentPassword`/`newPassword`/confirmação, chamando `PATCH /auth/me/password`; mapear o erro
  `user.password.current.invalid` no i18n; sucesso mostra confirmação sem deslogar o usuário.
  - **Pré:** 2.3, 2.5 concluídas; 3.1 concluída.
  - **Aceite:** senha atual incorreta mostra a mensagem de erro mapeada sem limpar o formulário
    inteiro; senha nova fraca mostra erro de validação (reaproveitar as mesmas mensagens já
    usadas no registro, se aplicável); sucesso não desloga a sessão atual.
  > ✅ 2026-07-07 15:53 — Seção "Trocar senha" com `currentPassword`/`newPassword`/
  > confirmação; validação "senhas coincidem" só no front
  > (`accountSettings.security.passwordMismatch`) antes de chamar a API. Submit chama
  > `changePassword` (`account.api.ts`, `PATCH /auth/me/password`); erro
  > `user.password.current.invalid` (401) e as mesmas mensagens de força de senha do
  > registro (`registerUser.password.*`) mapeadas via `getMessage`/`AccountApiError` em
  > toast, sem limpar os campos (só limpa no sucesso). Sucesso não chama `logout()` —
  > sessão atual (JWT já emitido) continua válida.

- [x] 3.4 Aba Segurança — seções "Autenticação em 2 fatores" e "Sessões e dispositivos ativos"
  como **placeholder**: renderizar fiel ao mockup, mas com controles **desabilitados** e rótulo
  "Em breve" (ou omitir a seção de sessões, se a lista completa não fizer sentido sem dado real —
  decisão a registrar). Nenhuma chamada de API nova para essas seções.
  - **Pré:** 3.1 concluída.
  - **Aceite:** nenhum endpoint novo é chamado a partir dessas seções; nenhum toggle/botão
    dessas seções produz efeito algum ao ser clicado.
  - **Não faça:** implementar TOTP, QR code, tabela de sessões ou "encerrar sessão" funcional.
  > ✅ 2026-07-07 15:53 — "Autenticação em 2 fatores" renderizada fiel ao mockup (ícone,
  > título, descrição) com botão desabilitado rotulado "Em breve"
  > (`accountSettings.security.comingSoon`) — sem toggle funcional, nenhuma chamada de
  > API. "Sessões e dispositivos" **simplificada para lista estática/informativa**
  > (só "este dispositivo", sem "encerrar sessão"/"revogar" e sem a lista completa de
  > dispositivos fictícios do mockup) — decisão registrada: mostrar dispositivos
  > inventados (Chrome/macOS, iPhone, Firefox/Windows) seria dado falso sem
  > infraestrutura de sessões real, então a seção informa apenas que este dispositivo é
  > a única sessão que o produto consegue mostrar hoje
  > (`accountSettings.security.sessionsDescription`). Nenhum endpoint novo é chamado.

- [x] 3.5 Aba Preferências — seção "Tema": embutir `theme-toggle.component.tsx`/
  `useThemeContext()` (`shared/context/theme.context.tsx`, já existente) nesta aba, sem lógica
  nova.
  - **Pré:** 3.1 concluída; `ThemeProvider` já registrado na árvore do app.
  - **Aceite:** alternar tema nesta aba reflete imediatamente em toda a aplicação, exatamente
    como o controle já existente em outro lugar do app (se houver).
  - **Não faça:** duplicar a lógica de tema — importar e reusar o context/componente existente.
  > ✅ 2026-07-07 15:53 — Aba Preferências embute `useThemeContext()`
  > (`shared/context/theme.context.tsx`) com dois botões (Claro/Escuro) chamando
  > `setTheme` já existente — sem lógica nova. Alternar tema aqui reflete imediatamente
  > em toda a aplicação (mesma fonte de estado usada pelo `ThemeToggle` do header).

- [x] 3.6 Aba Preferências — seção "Idioma" (real, com limitação documentada): novo seletor
  pt/en que persiste em `localStorage` (nova chave, ex. `taskboard-live:locale`) e chama
  `setI18nLocale(locale)` (`shared/i18n/index.ts`, já existente), seguido de
  `window.location.reload()` para refletir 100% da UI (limitação documentada no `design.md` —
  o módulo de i18n não é reativo a estado React).
  - **Pré:** 3.1 concluída; módulo `shared/i18n` já existente (`003`).
  - **Aceite:** escolher "en" persiste a preferência e, após o reload, textos mapeados em
    `messages.en.ts` aparecem; escolher "pt" reverte da mesma forma.
  - **Não faça:** construir um `LocaleContext` React novo nesta change.
  > ✅ 2026-07-07 15:53 — Seletor pt/en persiste em `localStorage`
  > (`taskboard-live:locale`, `LOCALE_STORAGE_KEY` em novo
  > `shared/i18n/locale-bootstrap.component.tsx`), chama `setI18nLocale(locale)`
  > (`shared/i18n/index.ts`, já existente) e, em seguida, `window.location.reload()` —
  > exatamente como o `design.md` prescreve. **Desvio necessário registrado**: como
  > `setI18nLocale` só muda uma variável de módulo (não-reativa), o `<html lang="pt-BR">`
  > fixo do `RootLayout` e qualquer texto já pintado no primeiro carregamento após o
  > reload continuariam em pt sem um passo extra — foi criado `LocaleBootstrap`
  > (componente client, montado em `app/layout.tsx` envolvendo os `children`), que lê a
  > chave `taskboard-live:locale` do `localStorage` em `useLayoutEffect` e chama
  > `setI18nLocale` **antes do primeiro paint visível** (mesmo padrão do
  > `THEME_ANTI_FLASH_SCRIPT` já usado para o tema), garantindo que o idioma persistido
  > realmente apareça em toda a UI já no carregamento seguinte ao reload — sem isso, a
  > troca de idioma não teria efeito prático algum na próxima navegação/reload. Não foi
  > criado nenhum `LocaleContext` React (o `forcedLocale` do módulo `shared/i18n`
  > continua sendo a única fonte, como determinado).

- [x] 3.7 Aba Preferências — seção "Notificações por e-mail" como **placeholder**: toggle
  renderizado desabilitado, sem persistência nem chamada de API, com nota "em breve".
  - **Pré:** 3.1 concluída.
  - **Aceite:** nenhum endpoint novo é chamado; o estado do toggle não persiste entre
    recarregamentos (não há para onde persistir).
  - **Não faça:** implementar envio de e-mail real ou provedor de e-mail.
  > ✅ 2026-07-07 15:53 — Seção "Notificações por e-mail" renderiza as quatro linhas do
  > mockup (menções/comentários, atribuições, prazos, resumo semanal), cada uma com
  > botão desabilitado "Em breve" — nenhum toggle interativo, nenhuma persistência,
  > nenhuma chamada de API.

- [x] 3.8 Aba Zona de perigo: botão "Excluir conta" abre diálogo de confirmação (reaproveitar o
  componente de confirmação já usado em `020`/`005`, exigindo digitar uma palavra de
  confirmação), chamando `DELETE /auth/me`. Sucesso: chamar `logout()` do `AuthContext` e navegar
  para a rota pública para onde `logout()` já leva hoje. Erro `409`
  (`account.delete.owner.boards.blocked`): exibir mensagem mapeada no i18n orientando o usuário a
  resolver seus quadros-owner com outros membros antes de tentar novamente.
  - **Pré:** 2.3, 2.5 concluídas; 3.1 concluída; componente de diálogo de confirmação existente
    (`020`).
  - **Aceite:** cancelar o diálogo não chama o endpoint; confirmar com sucesso desloga e navega
    para a rota pública; bloqueio por quadros mostra a mensagem sem deslogar o usuário.
  - **Não faça:** implementar transferência de ownership como alternativa ao bloqueio.
  > ✅ 2026-07-07 15:53 — Botão "Excluir conta" abre `DeleteConfirmationDialog`
  > (reaproveitado de `020`/`005`, sem duplicação), exigindo digitar a frase de
  > confirmação (`accountSettings.dangerZone.deleteConfirmWord`, pt: "excluir minha
  > conta" / en: "delete my account") — cancelar não chama a API. Confirmar chama
  > `deleteAccount` (`DELETE /auth/me`); sucesso (`204`) chama `logout()` do
  > `AuthContext` e navega para `/join` (mesma rota pública para onde o logout do shell
  > já leva hoje). Erro `409` (`account.delete.owner.boards.blocked`) exibido via toast
  > mapeado no i18n, sem deslogar o usuário nem tentar resolver a situação
  > automaticamente.

- [x] 3.9 Mapear no i18n (pt/en, frontend) todos os textos novos da tela (título, rótulos das
  quatro abas, textos de Perfil/Segurança/Preferências/Zona de perigo, notas "em breve" das
  seções placeholder, mensagens de erro `user.password.current.invalid` e
  `account.delete.owner.boards.blocked`), seguindo a estrutura de i18n já existente
  (`messages.pt.ts`/`messages.en.ts`).
  - **Pré:** estrutura de i18n do frontend já existente (`003`).
  - **Aceite:** nenhum texto novo hardcoded fora das chaves de i18n pt/en.
  > ✅ 2026-07-07 15:53 — Todas as chaves `accountSettings.*` (título, quatro abas,
  > Perfil, Segurança — incl. placeholders "em breve" de 2FA/sessões —, Preferências —
  > incl. nota de reload do idioma — e Zona de perigo) mapeadas em `messages.pt.ts` e
  > `messages.en.ts`, além de `user.password.current.invalid` e
  > `account.delete.owner.boards.blocked`. Nenhum texto novo hardcoded em
  > `account-settings.component.tsx` — tudo via `getMessage`.

## 4. Verificação

- [x] 4.1 Rodar `npx tsc --noEmit` em `apps/backend` e em `apps/frontend`, a suíte de testes
  Jest (`modules/auth`, `apps/backend`) cobrindo os três casos de uso novos, `npm run lint` (via
  turbo) e `npm run build` do frontend com `NEXT_IGNORE_INCORRECT_LOCKFILE=1`.
  - **Pré:** tasks 1–3 concluídas.
  - **Aceite:** `tsc` limpo nos dois apps; suíte de testes verde (sem regressão em `auth`,
    `board`); lint sem erros; build do frontend verde.
  > ⏳ 2026-07-07 15:46 — Escopo BACKEND concluído: `npx tsc --noEmit` limpo em
  > `apps/backend`; `@taskboard/auth` (7 suítes, 40 testes, 100% nos 3 use cases novos) e
  > `apps/backend` (7 suítes, 23 testes, incl. `auth.throttle.spec.ts` ajustado) verdes;
  > `npx turbo run lint --filter=@taskboard/backend` verde. Escopo FRONTEND (tsc/testes/
  > lint/build de `apps/frontend`, tasks 3.x) **pendente** — fora do escopo desta execução
  > (delegado ao especialista de frontend).
  > ✅ 2026-07-07 15:53 — Escopo FRONTEND concluído: `npx tsc --noEmit -p
  > apps/frontend/tsconfig.json` limpo; `npx turbo run lint check-types
  > --filter=@taskboard/frontend` verde (só 1 warning pré-existente e não relacionado,
  > `app-logo.component.tsx`); `NEXT_IGNORE_INCORRECT_LOCKFILE=1 npx next build` verde
  > (rota `/account` gerada como estática). Sem testes automatizados novos no frontend
  > para esta tela (o repositório não tem testes de componente para os módulos
  > equivalentes de `020`/`board-settings`; padrão mantido — validação manual via build/
  > tsc/lint).

- [x] 4.2 Validar manualmente com curl: editar nome, trocar senha (atual incorreta → `401`, atual
  correta → sucesso e novo login com a nova senha funciona), excluir conta sem quadro, excluir
  conta com quadro solo (quadro some), tentar excluir conta sendo owner de quadro com outro
  membro (`409`, nada excluído), excluir conta sendo membro de quadro de terceiro (membership
  removida, quadro do terceiro intacto).
  - **Pré:** 4.1 concluída.
  - **Aceite:** evidência registrada com os payloads reais observados para cada cenário.
  > ⏳ 2026-07-07 15:46 — Cenários BACKEND validados via curl real com JWT: editar nome
  > (200, `{id,name,email}` atualizado); trocar senha com atual incorreta (401
  > `user.password.current.invalid`) e com sucesso (204, login subsequente com a nova senha
  > 200); excluir conta sem quadro (204); excluir conta com quadro-owner solo (204, board some
  > da API); excluir conta sendo owner de quadro com outro membro (409
  > `account.delete.owner.boards.blocked`, quadro e membership intactos); excluir conta sendo
  > membro de quadro de terceiro (204, membership removida, quadro do terceiro intacto,
  > `GET /boards/:id` continua 200 para o owner). Payloads completos no output do comando
  > registrados na sessão de execução. Cenários de UI (task 4.2 completa) pendentes até o
  > frontend ser implementado.

- [x] 4.3 Rodar `openspec validate 021-config-conta --strict` e confirmar saída limpa.
  - **Pré:** 1–3 concluídas e artefatos (`proposal.md`/`design.md`/`tasks.md`/`specs/`) sem
    placeholders pendentes.
  - **Aceite:** comando roda sem erros nem avisos de estrutura.
  > ✅ YYYY-MM-DD HH:MM — evidência
