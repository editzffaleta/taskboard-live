> **CONTRATO DE LEITURA (obrigatório) — abra APENAS isto, nesta ordem:**
> `openspec/project.md` · `AGENTS.md` (raiz) · `openspec/EXECUTION-LOG.md` ·
> `openspec/shared/` · `openspec/specs/sessao-invalida/spec.md` (se existir) · esta change
> (`proposal.md`, `design.md`, `tasks.md`, `specs/`) · e, **somente se o `design.md` citar
> nominalmente**: arquivos de código listados, `openspec/templates/`, `openspec/memory/`.
> **NÃO ler:** o repositório inteiro, outras changes, `openspec/changes/archive/`. Faltou
> contexto? O defeito é do `design.md` — pare e corrija o trilho; não abra o contexto.
> **Ao concluir:** `/portao` verde → commit → `/openspec:archive` → atualizar
> `openspec/EXECUTION-LOG.md` → **zerar o chat** antes da próxima change.

## Why

O JWT do TaskBoard Live é stateless: `JwtStrategy.validate` (`apps/backend/src/shared/auth/jwt.strategy.ts`)
apenas valida a assinatura/expiração e mapeia as claims (`sub`, `name`, `email`) para
`AuthenticatedUser` — nunca confere se o usuário do `sub` ainda existe. A change `021` introduziu
**excluir conta**; a partir dela, um cookie/JWT emitido antes da exclusão continua "autenticando"
normalmente. A primeira operação que usa esse `userId` como chave estrangeira (ex.: criar quadro,
que grava `Board.ownerId`) estoura em `boards_ownerId_fkey`, um `PrismaClientKnownRequestError`
não tratado que vira **500** — em vez de um **401** limpo dizendo "sua sessão não é mais válida".
Esta mudança fecha esse buraco de robustez na camada de autenticação, sem tocar em UI.

## What Changes

- `JwtStrategy.validate` passa a ser assíncrono e verifica, via `UserRepository.findById(payload.sub)`,
  que o usuário do token ainda existe. Se não existir → `UnauthorizedException` (401), lançada pelo
  Passport antes de qualquer controller/caso de uso rodar.
- Wiring: `JwtAuthModule` passa a importar `AuthModule` (que já provê/exporta `PrismaUserRepository`)
  para poder injetar o repositório na estratégia, sem criar dependência circular.
- Custo aceito: uma consulta a mais por request autenticado — troca correta por eliminar 500 em
  conta excluída (`021`) e por rejeitar qualquer token de usuário inexistente.
- (Opcional, defensivo) `ApiExceptionFilter` pode mapear violação de FK (`PrismaClientKnownRequestError`,
  código `P2003`) para um erro tratado (400/404) em vez de 500 cru, como rede de segurança — o fix
  principal continua sendo o 401 no auth.
- Sem mudança de contrato para o cliente além do já esperado: 401 já dispara logout no frontend
  (`004`); nenhuma rota nova, nenhum campo novo em request/response.

## Capabilities

### New Capabilities
- `sessao-invalida`: o backend do TaskBoard Live SHALL rejeitar, com 401, qualquer JWT cuja
  claim `sub` não corresponda a um usuário existente — cobrindo em especial o caso de conta
  excluída (`021`) — antes que a requisição alcance qualquer caso de uso.

### Modified Capabilities
<!-- Nenhuma: o contrato de login/emissão de token (004) não muda; muda apenas a validação do
     token em cada request autenticado. -->

## Impact

- **Backend**: `apps/backend/src/shared/auth/jwt.strategy.ts` (validate assíncrono),
  `apps/backend/src/shared/auth/jwt-auth.module.ts` (import de `AuthModule`), opcionalmente
  `apps/backend/src/shared/errors/api-exception.filter.ts` (mapeamento defensivo de FK).
- **Frontend**: nenhum código — o 401 já é tratado (logout) pelo cliente existente (`004`).
- **Domínio**: intocado; `UserRepository.findById` já existe (`modules/auth/src/user/provider/user.repository.ts`,
  implementado em `PrismaUserRepository`).
- **Dependências**: `001` (bootstrap/JWT), `004` (login/sessão), `021` (excluir conta — motivo do bug).
- **Habilita**: base de robustez para qualquer feature futura que dependa de "usuário do token
  ainda existe" sem repetir a checagem em cada caso de uso.
