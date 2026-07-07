## Design — 021-config-conta

## Contexto

O módulo `auth` (`modules/auth/src/user/`) já tem `User { id, name, email, password }`
(`model/user.entity.ts`), `UserRepository` (`findById`/`findByEmail`/`create`/`update`/`delete`,
`provider/user.repository.ts`), `CryptoProvider` (`hash`/`compare`, `provider/crypto.provider.ts`,
implementação `BcryptCryptoProvider` em `apps/backend/src/modules/auth/bcrypt.crypto.ts`) e os
casos de uso `RegisterUser`/`LoginUser`. No backend, `AuthController`
(`apps/backend/src/modules/auth/auth.controller.ts`) expõe `POST /auth/register` e
`POST /auth/login` (público, `@Public()`); o JWT assinado por `signUserToken`
(`jwt.util.ts`) carrega `{ sub, name, email }`. Rotas privadas usam `CurrentUser`
(`apps/backend/src/shared/decorators/current-user.decorator.ts`) para obter
`AuthenticatedUser { id, name?, email?, claims }` a partir do JWT — **não é `@Public()`**, logo já
exige sessão válida. No front, `AuthContext`/`useAuth` (`apps/frontend/src/modules/auth/context/
auth.context.tsx`) expõe `{ user, token, status, login, logout }`; `user` é derivado hoje só do
`decodeJwtPayload` do cookie. Esta change **não cria agregado novo** — estende o módulo `auth` com
três casos de uso e monta, no front, uma tela que reaproveita `ThemeProvider` (`shared/context/
theme.context.tsx`) e o módulo de i18n (`shared/i18n/index.ts`) já existentes.

## Backend

### Caso de uso 1 — `UpdateProfile` (Perfil)

Novo arquivo `modules/auth/src/user/usecase/update-profile.usecase.ts`:

```ts
export interface UpdateProfileIn {
  userId: string;
  name: string;
}
export interface UpdateProfileOut { id: string; name: string; email: string; }

export class UpdateProfile implements UseCase<UpdateProfileIn, UpdateProfileOut> {
  constructor(private readonly userRepository: UserRepository) {}
  async execute(input: UpdateProfileIn): Promise<UpdateProfileOut> {
    Validator.validate([
      { code: "updateProfile.userId", value: input.userId, rules: [new RequiredRule(), new UuidRule()] },
    ]);
    const user = await this.userRepository.findById(input.userId);
    if (!user) throw new NotFoundError("user.not.found");
    const updated = user.clone({ name: input.name }); // ou `new User({...user, name: input.name})`
    updated.validate(); // reaproveita `user.name` rules (PersonNameRule/Min/Max) já em `user.entity.ts`
    await this.userRepository.update(updated);
    return { id: updated.id, name: updated.name, email: updated.email };
  }
}
```

**Guard**: `userId` vem **exclusivamente** de `AuthenticatedUser.id` (JWT), nunca do corpo da
requisição — impossível editar o perfil de outro usuário. `email` não é aceito no `execute`
(somente leitura nesta change, conforme `proposal.md`).

**Validação de nome**: reaproveita as regras já existentes em `user.entity.ts`
(`RequiredRule`, `MinLengthRule(3)`, `MaxLengthRule(80)`, `PersonNameRule()`) chamando
`updated.validate()` — não duplicar regras.

### Caso de uso 2 — `ChangePassword` (Segurança)

Novo arquivo `modules/auth/src/user/usecase/change-password.usecase.ts`:

```ts
export interface ChangePasswordIn {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export class ChangePassword implements UseCase<ChangePasswordIn, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cryptoProvider: CryptoProvider,
  ) {}
  async execute(input: ChangePasswordIn): Promise<void> {
    Validator.validate([
      { code: "changePassword.newPassword", value: input.newPassword,
        rules: [new RequiredRule(), new StrongPasswordRule(), new NoCommonPasswordRule()] },
    ]);
    const user = await this.userRepository.findById(input.userId);
    if (!user) throw new NotFoundError("user.not.found");

    const currentMatches = await this.cryptoProvider.compare(input.currentPassword, user.password);
    if (!currentMatches) throw new DomainError("user.password.current.invalid", 401);

    const hashed = await this.cryptoProvider.hash(input.newPassword);
    const updated = user.clone({ password: hashed });
    updated.validate();
    await this.userRepository.update(updated);
  }
}
```

Reaproveita **exatamente** as mesmas regras de força de senha de `RegisterUser`
(`StrongPasswordRule`, `NoCommonPasswordRule`) — não inventar regra nova. Código de erro
`user.password.current.invalid` (401) para senha atual incorreta — distinto de
`user.credentials.invalid` (login) para não confundir os dois fluxos no front.

### Caso de uso 3 — `DeleteAccount` (Zona de perigo)

Novo arquivo `modules/auth/src/user/usecase/delete-account.usecase.ts`. Este caso de uso, ao
contrário dos dois acima, **depende de portas do módulo `board`** (`BoardRepository`,
`MembershipRepository`, ambos já existentes de `005`/`010`) para aplicar a regra de negócio — a
composição entre módulos acontece na camada de aplicação/HTTP (o `AuthController`/um novo
`DeleteAccountHandler` monta o caso de uso injetando os repositórios dos dois módulos), **não**
dentro do módulo `auth` (que não importa de `board`, mantendo a regra de dependência de
`AGENTS.md`).

**Regra de exclusão de conta em relação a quadros** (decidida nesta change) — reaproveitando
**apenas** métodos de porta já existentes em `MembershipRepository`/`BoardRepository` (nenhum
método novo de porta é necessário):
1. Buscar todas as memberships do usuário via `MembershipRepository.listBoardsByUser(userId)`
   (já existe, `010`) — retorna `Membership[]` com `boardId`/`role`.
2. Separar as memberships com `role === 'owner'` das demais.
3. Para cada membership de owner, buscar os demais membros do quadro via
   `MembershipRepository.listByBoardId(boardId)` (já existe) e verificar se existe algum
   `Membership` do mesmo quadro com `userId` diferente do solicitante.
4. Se **qualquer** quadro-owner tiver outros membros → **bloquear** a exclusão inteira com
   `DomainError("account.delete.owner.boards.blocked", 409)`. O front exibe a lista desses
   quadros e orienta o usuário a excluí-los (`005`) ou remover os membros (`010`) antes de tentar
   excluir a conta novamente. Nenhuma exclusão parcial acontece.
5. Se nenhum quadro-owner tiver outros membros (todos são "quadros solo" ou o usuário não é owner
   de nenhum quadro): excluir cada um desses quadros-owner reaproveitando
   `BoardRepository.delete(boardId)` (já existe, mesmo delete físico usado por `DeleteBoard`,
   `005` — os `onDelete: Cascade` já existentes em `List`/`Card`/`Label`/`Activity`/`BoardMember`
   (relação com `Board`) removem toda a árvore do quadro, incluindo a própria membership do
   usuário nesse quadro).
6. Para as memberships restantes (quadros de **terceiros**, `role !== 'owner'`), remover cada uma
   via `MembershipRepository.delete(boardId, userId)` (já existe) — o usuário "sai" desses
   quadros antes de sua conta ser excluída.
7. Excluir o `User` (`UserRepository.delete`, já existe).

```ts
export interface DeleteAccountIn { userId: string; }

export class DeleteAccount implements UseCase<DeleteAccountIn, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly boardRepository: BoardRepository,        // porta do módulo board, já existente
    private readonly membershipRepository: MembershipRepository, // porta do módulo board, já existente
  ) {}

  async execute(input: DeleteAccountIn): Promise<void> {
    Validator.validate([
      { code: "deleteAccount.userId", value: input.userId, rules: [new RequiredRule(), new UuidRule()] },
    ]);

    const memberships = await this.membershipRepository.listBoardsByUser(input.userId);
    const ownerMemberships = memberships.filter((m) => m.role === "owner");
    const otherMemberships = memberships.filter((m) => m.role !== "owner");

    for (const membership of ownerMemberships) {
      const boardMembers = await this.membershipRepository.listByBoardId(membership.boardId);
      const hasOthers = boardMembers.some((m) => m.userId !== input.userId);
      if (hasOthers) throw new DomainError("account.delete.owner.boards.blocked", 409);
    }

    for (const membership of ownerMemberships) {
      await this.boardRepository.delete(membership.boardId);
    }
    for (const membership of otherMemberships) {
      await this.membershipRepository.delete(membership.boardId, input.userId);
    }
    await this.userRepository.delete(input.userId);
  }
}
```

**Nenhuma porta nova é adicionada** ao módulo `board` — `listBoardsByUser`, `listByBoardId`,
`BoardRepository.delete` e `MembershipRepository.delete` já existem e cobrem toda a regra. Isso
simplifica bastante o escopo desta change em relação a uma primeira leitura do enunciado (que
sugeria métodos novos como `findManyByOwnerId`/`hasOtherMembers`) — registrar essa simplificação
na evidência da task correspondente.

**Onde a composição acontece**: como `auth` não pode importar de `board` (regra de dependência de
`AGENTS.md` é sobre `domain` não importar de `application`/`infrastructure`/`interface`, mas aqui
é módulo-a-módulo — mantemos o mesmo cuidado: nenhum tipo de `board` aparece nas assinaturas
públicas de `modules/auth`), o `DeleteAccount` usecase declara as portas `BoardRepository`/
`MembershipRepository` **localmente** (interfaces mínimas duplicadas ou importadas do pacote
`@taskboard/board` só como *tipo* de porta — decisão: importar os tipos de porta de
`@taskboard/board` é aceitável, pois são apenas contratos/interfaces (sem acoplar a
implementação Prisma); o módulo `auth` passa a ter uma dependência **explícita e documentada** de
`@taskboard/board` restrita a esse único caso de uso. Registrar essa decisão na evidência da
task correspondente.

### Endpoint e composição HTTP

`apps/backend/src/modules/auth/auth.controller.ts` ganha três handlers, todos autenticados
(sem `@Public()` — usam `CurrentUser`, mesmo padrão de outros controllers privados):

```ts
@Patch('me')
async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() body: { name: string }) {
  const useCase = new UpdateProfile(this.userRepository);
  return useCase.execute({ userId: user.id, name: body.name });
}

@Patch('me/password')
@HttpCode(204)
async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() body: { currentPassword: string; newPassword: string }) {
  const useCase = new ChangePassword(this.userRepository, this.cryptoProvider);
  await useCase.execute({ userId: user.id, currentPassword: body.currentPassword, newPassword: body.newPassword });
}

@Delete('me')
@HttpCode(204)
async deleteAccount(@CurrentUser() user: AuthenticatedUser) {
  const useCase = new DeleteAccount(this.userRepository, this.boardRepository, this.membershipRepository);
  await useCase.execute({ userId: user.id });
}
```

`AuthModule` (`auth.module.ts`) precisa importar `BoardModule` (ou os providers Prisma de
`board`) para injetar `PrismaBoardRepository`/`PrismaMembershipRepository` no `AuthController` —
único ponto do módulo `auth` que passa a depender de `board`, e só na camada HTTP/Nest
(infraestrutura), nunca no domínio (`modules/auth/src`).

**`update-profile`: o `name` no JWT fica desatualizado até o próximo login.** Decisão: o
endpoint retorna `{ id, name, email }` atualizado, e o `AuthContext` no front atualiza `user.name`
localmente em memória (sem reemitir/persistir um novo JWT) — o cookie/JWT permanece com o `name`
antigo até expirar ou até novo login, mas a UI reflete o nome novo imediatamente porque o estado
React do `AuthContext` é a fonte usada pela UI, não o payload decodificado a cada render. Isso é
documentado explicitamente como a única inconsistência aceita (o JWT não é reemitido nesta
change — reemitir token exigiria endpoint de refresh, fora de escopo de `004` e desta change).

### Migration — `onDelete` de relações com `User`

`apps/backend/prisma/models/*.model.prisma`: hoje `Comment.author` e `Activity.actor` referenciam
`User` **sem** `onDelete` explícito (default `Restrict` do Prisma) — excluir um `User` que já
comentou ou gerou qualquer `Activity` falharia com violação de chave estrangeira, mesmo depois do
`DeleteAccount` já ter excluído/saído dos quadros. Ajuste necessário:

```prisma
// comment.model.prisma (ou onde Comment estiver)
author User @relation(fields: [authorId], references: [id], onDelete: Cascade)

// activity.model.prisma (ou onde Activity estiver)
actor User @relation(fields: [actorId], references: [id], onDelete: Cascade)
```

Efeito: ao excluir a própria conta, os **próprios** comentários e entradas de atividade do
usuário são removidos junto (mesma lógica de "sua conta, seus dados desaparecem") — comentários e
atividades de outros usuários no mesmo quadro **não são afetados** (a FK é por linha, não em
cascata pelo quadro inteiro). `BoardMember.user` e `Board.owner` **não precisam** de `onDelete`
ajustado, porque o caso de uso já remove/exclui essas linhas explicitamente antes de chamar
`userRepository.delete` (passo 4/5 da regra acima) — o ajuste em `Comment`/`Activity` é a rede de
segurança mínima e necessária para o `DELETE /auth/me` não quebrar com 500 de FK. Gerar com
`prisma migrate dev --create-only` (mesmo procedimento já documentado nas changes `016`/`020`,
evitando o bug do `--schema` explícito ignorar a pasta modular) e revisar o SQL antes de aplicar.

**Não faça**: mudar `authorId`/`actorId` para nullable, nem usar `SetNull` — o histórico do
quadro perde sentido com um autor `null`; a decisão é remover (cascade) apenas as linhas do
próprio usuário excluído.

## Frontend

### Rota e composição da tela

Nova rota `/account/settings` (ou `/settings`, decisão do especialista de frontend — registrar na
evidência) em `apps/frontend/src/app/(private)/`, delegando para
`account-settings.component.tsx` em `apps/frontend/src/modules/auth/components/`, com abas
(`Perfil`, `Segurança`, `Preferências`, `Zona de perigo`) fiéis ao mockup
`Configuracoes da Conta.dc.html`. Acessível a qualquer usuário autenticado (não há restrição de
papel — é a própria conta).

### Aba Perfil

Formulário de `name` (campo controlado, submit chama `PATCH /auth/me`). Após sucesso, chamar um
novo método do `AuthContext` (ex.: `updateUserName(name: string)`, que só atualiza
`state.user.name` em memória, sem tocar no cookie) para refletir o novo nome no shell/menu
imediatamente. `email` renderizado em campo **somente leitura**, com nota explicando o motivo
(edição de e-mail fora de escopo, ver `proposal.md`).

### Aba Segurança

- **Trocar senha (real)**: formulário `currentPassword`/`newPassword`/confirmação (validação de
  "senhas coincidem" só no front), chama `PATCH /auth/me/password`; erro
  `user.password.current.invalid` mapeado no i18n; sucesso mostra confirmação (sem deslogar o
  usuário — o JWT atual continua válido, já que não há refresh/blacklist).
- **Autenticação em 2 fatores (placeholder)**: renderizar o card do mockup com o toggle
  **desabilitado** e rótulo "Em breve" — nenhuma chamada de API.
- **Sessões e dispositivos ativos (placeholder)**: renderizar a lista do mockup como
  **estática/informativa** (ex.: apenas a sessão atual, sem botão de "encerrar outras sessões"
  funcional) ou omitir a seção — decisão do especialista de frontend, registrar na evidência.
  Nenhum endpoint novo de sessão é chamado ou criado.

### Aba Preferências

- **Tema (real)**: reaproveitar `useThemeContext()`/`theme-toggle.component.tsx`
  (`shared/context/theme.context.tsx`, `shared/components/theme/`) — sem lógica nova, só embutir
  o controle já existente nesta aba.
- **Idioma pt/en (real, com limitação documentada)**: novo seletor que persiste a escolha em
  `localStorage` (chave nova, ex. `taskboard-live:locale`) e chama `setI18nLocale(locale)`
  (`shared/i18n/index.ts`, já existente). **Limitação**: como `getMessage`/`getCurrentLocale` não
  são reativos a estado React (é um módulo com variável `forcedLocale`, não contexto), a troca de
  idioma só reflete **integralmente** em toda a UI após recarregar a página — a mudança é
  aplicada e persistida imediatamente, mas o especialista de frontend deve, no submit do
  seletor, forçar `window.location.reload()` (ou navegação equivalente) logo após persistir,
  documentando esse comportamento na evidência. **Não** construir um `LocaleContext` React novo
  nesta change — isso seria infraestrutura nova fora do escopo definido pelo `proposal.md`.
- **Notificações por e-mail (placeholder)**: toggle renderizado **desabilitado**, sem
  persistência, sem chamada de API — nota "em breve" (sem provedor de e-mail no projeto).

### Aba Zona de perigo

Botão "Excluir conta" abre diálogo de confirmação (reaproveitar o mesmo componente de
confirmação já usado em `020`/`005`, ex. `DeleteConfirmationDialog`, exigindo digitar uma palavra
de confirmação). Ao confirmar, chama `DELETE /auth/me`:
- **Sucesso (204)**: chamar `logout()` do `AuthContext` (limpa cookie/estado) e navegar para a
  landing pública (`/` ou `/join`, mesma rota para onde `logout()` já leva hoje).
- **Erro 409 (`account.delete.owner.boards.blocked`)**: exibir mensagem (mapeada no i18n) listando
  que o usuário ainda é owner de quadro(s) com outros membros, orientando a resolver isso primeiro
  (excluir o quadro em `/boards/[id]/settings`, `020`, ou remover membros lá mesmo) — **sem**
  tentar resolver isso automaticamente na tela de conta.

### i18n

pt/en: título da tela, rótulos das quatro abas, textos da aba Perfil (label, ajuda de e-mail
somente leitura), Segurança (troca de senha, erro de senha atual incorreta, notas "em breve" de
2FA/sessões), Preferências (tema, idioma, nota de reload, nota "em breve" de notificações),
confirmação de exclusão de conta e mensagem de bloqueio por quadros com outros membros
(`account.delete.owner.boards.blocked`).

## Placeholders — por que cada um NÃO é implementado

| Seção do mockup | Por que é placeholder |
|---|---|
| Autenticação em 2 fatores | Exige lib de TOTP, geração/validação de QR code e segredo persistido por usuário — nenhuma infraestrutura existe; construir isso é escopo de uma change dedicada de segurança, não desta tela. |
| Sessões e dispositivos ativos | O projeto usa um único JWT de 7 dias sem tabela de sessões/refresh token (`004`) — não há "lista de dispositivos" para mostrar nem "encerrar sessão" para executar sem essa infraestrutura. |
| Notificações por e-mail | Não há provedor de e-mail (SMTP/SES/etc.) configurado no projeto — o toggle não teria nenhum efeito real. |

## Fora de escopo (reforço)

- 2FA/TOTP, sessões/dispositivos ativos, notificações por e-mail reais — ver tabela acima.
- Edição de e-mail (mantido somente leitura).
- Transferência de ownership de quadro como alternativa ao bloqueio de exclusão de conta.
- Qualquer novo agregado de domínio — só três casos de uso novos no `auth` e duas extensões de
  porta no `board` (`findManyByOwnerId`, `hasOtherMembers`/`deleteAllByUserId`).
