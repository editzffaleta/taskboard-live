# Mandatory Readings

Leia estes arquivos exatamente nesta ordem antes de implementar a auth do frontend:

1. `apps/frontend/src/app/(public)/layout.template.tsx`
2. `apps/frontend/src/app/(private)/layout.template.tsx`
3. `apps/frontend/src/app/(public)/join/page.template.tsx` (estilo de pagina publica)
4. `apps/frontend/src/shared/components/form/validator/` (validator do projeto)
5. `apps/frontend/src/shared/types/api-error.type.ts` (shape de `ApiErrorResponse`)
6. `apps/frontend/src/shared/i18n/` (mensagens pt/en)
7. componentes de UI relevantes em `apps/frontend/src/shared/components/ui/`
8. o controller de login do backend, ex. `apps/backend/src/modules/auth/auth.controller.ts`

Extraia dessas leituras:

- como os layouts `(public)`/`(private)` montam a arvore e onde plugar o provider
- a API do validator de formulario do projeto (para a pagina de login)
- o shape exato de `ApiErrorResponse` (para o tratamento de erro do cliente)
- o contrato real do endpoint de login (rota, payload, onde vem o token)
- a convencao de i18n e de componentes de UI

Antes de editar, confirme:

- que o `frontend-next-config` ja rodou (senao, rodar antes)
- o contrato de login do backend (sem ambiguidade)
- a estrategia de armazenamento do token (cookie httpOnly vs storage)
- a rota de destino pos-login e a rota de login para redirecionar em 401

Se qualquer leitura obrigatoria falhar, pare e relate o bloqueio.
