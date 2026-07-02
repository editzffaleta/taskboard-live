# Mandatory Readings

Leia estes arquivos exatamente nesta ordem antes de revisar:

1. o codigo alvo (modulo/PR): controllers, casos de uso, repositorios, DTOs
2. a infra compartilhada do `backend-nest-config`: AuthGuard, decorator de usuario
   autenticado, tipo de request, filtro de excecao / `ApiErrorResponse`
3. `packages/shared/src/validation/` (regras disponiveis e como sao aplicadas)
4. os repositorios Prisma em `apps/backend/**` (procurar queries cruas / interpolacao)
5. o tratamento de `.env`/segredos, config de CORS e headers de seguranca
6. quando relevante, o frontend que consome a API (vazamento de dado/token no client)

Extraia dessas leituras:

- como o projeto autentica/autoriza e onde a checagem de propriedade deveria estar
- como os erros sao padronizados (para detectar vazamento de stack/erro de ORM)
- quais regras de validacao ja existem (para apontar a remediacao certa)
- se ha uso de Prisma cru, upload, requisicao de saida com URL do usuario

Antes de concluir, confirme:

- o escopo exato revisado (o que ficou de fora deve constar no relatorio)
- se cada achado tem evidencia concreta (arquivo:linha) e nao e suposicao solta

Se uma leitura obrigatoria faltar, registre como limitacao do escopo.
