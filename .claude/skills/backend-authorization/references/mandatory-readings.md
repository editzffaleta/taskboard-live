# Mandatory Readings

Leia estes arquivos exatamente nesta ordem antes de implementar a autorizacao:

1. a infraestrutura compartilhada do Nest do `backend-nest-config`: AuthGuard JWT,
   decorator de usuario autenticado (ex.: `CurrentUser`) e tipo de request autenticado
2. `apps/backend/src/modules/auth/auth.module.ts`
3. `apps/backend/src/modules/auth/auth.controller.ts`
4. o provider/strategy de JWT (quais claims existem no token)
5. `modules/auth/src/user/model/user.entity.ts` (existe campo de papel/permissao?)
6. `packages/shared/src/error/` (erros de dominio / `ApiErrorResponse`)

Extraia dessas leituras:

- como o usuario autenticado chega no request (`request.user`) e qual o seu shape
- se os papeis ja existem em claim do JWT ou precisam vir do banco
- a convencao de erro do projeto para a negacao (Forbidden / `ApiErrorResponse`)
- como o projeto registra guards (global `APP_GUARD` vs por controller)
- naming e estilo dos arquivos do backend compartilhado

Antes de editar, confirme:

- que a autenticacao basica ja existe (senao, rodar `spec-backend-auth-basic` antes)
- a fonte de papeis: claim do JWT ou consulta ao banco
- o modelo de autorizacao: roles, permissions ou ambos
- as rotas alvo e o papel/permissao exigido em cada uma

Se qualquer leitura obrigatoria falhar, pare e relate o bloqueio.
