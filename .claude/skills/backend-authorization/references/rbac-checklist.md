# RBAC — checklist

## Antes
- [ ] Autenticacao JWT existe e popula `request.user`.
- [ ] Fonte de papeis decidida: JWT claim ou banco.
- [ ] Modelo decidido: roles, permissions ou ambos.
- [ ] Lista inicial de papeis/permissoes definida e tipada.

## Implementacao
- [ ] Decorator `@Roles(...)` (e/ou `@Permissions(...)`) com chave de metadata estavel.
- [ ] Tipos de papel/permissao centralizados (union/enum).
- [ ] Guard le metadata via `Reflector` (handler + classe).
- [ ] Guard obtem usuario de `request.user` (nao reautentica).
- [ ] Default-deny: sem usuario ou sem papel suficiente, nega.
- [ ] Rota sem `@Roles` = apenas autenticada (nao publica).
- [ ] Combinacao "qualquer um" por padrao; "todos" so se pedido.
- [ ] Papel "super" (ex.: admin) ignora checagem, se configurado.
- [ ] Erro de negacao no padrao do projeto (`ApiErrorResponse`).
- [ ] Registro: `APP_GUARD` apos o AuthGuard, ou `@UseGuards` por controller.

## Testes
- [ ] Permitido com papel correto.
- [ ] Negado sem o papel (default-deny).
- [ ] Negado sem usuario no request.
- [ ] Rota sem metadata: passa por ser autenticada.
- [ ] "Qualquer um" vs "todos", quando suportado.
- [ ] Papel "super" ignora a checagem, quando configurado.
- [ ] Build do backend verde.
