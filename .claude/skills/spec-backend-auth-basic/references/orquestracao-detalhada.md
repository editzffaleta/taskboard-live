# spec-backend-auth-basic — Orquestração detalhada

> Extraído do corpo da skill (progressive disclosure). O SKILL.md mantém o contrato
> (entradas, limites, regras de decisão, paradas); aqui vive o passo a passo integral.

## Validacao obrigatoria do catalogo

Antes de qualquer implementacao, verifique a existencia das skills necessarias no catalogo de skills disponivel (busque por `SKILL.md` dentro de cada pasta de skill, independente do diretorio raiz onde as skills estejam armazenadas).

Procure pelos arquivos de cada skill pelo nome da pasta:

- `config-new-module/SKILL.md`
- `config-package-shared/SKILL.md`
- `module-aggregate/SKILL.md`
- `config-module-entity/SKILL.md`
- `module-entity/SKILL.md`
- `module-repository/SKILL.md`
- `module-use-case/SKILL.md`
- `shared-validation-rule/SKILL.md`
- `backend-provider-implementation/SKILL.md`
- `backend-prisma-sync-module/SKILL.md`
- `backend-prisma-repository/SKILL.md`
- `backend-nest-config/SKILL.md`
- `backend-nest-controller/SKILL.md`

### Regra de resolucao de dependencia por papel

Resolva as skills por papel, nesta ordem:

1. scaffold de modulo:
   - `config-new-module`
2. base compartilhada:
   - `config-package-shared`
3. scaffold de agregado:
   - `module-aggregate`
4. entidade:
   - preferir `config-module-entity`
   - se ela nao existir, usar `module-entity`
   - se nenhuma das duas existir, parar
5. repositorio de dominio:
   - `module-repository`
6. casos de uso:
   - `module-use-case`
7. regras compartilhadas:
   - `shared-validation-rule`, quando necessario
8. providers tecnicos do backend:
   - `backend-provider-implementation`
9. sincronizacao Prisma:
   - `backend-prisma-sync-module`
10. implementacao Prisma do repositorio:
   - `backend-prisma-repository`
11. infraestrutura compartilhada do Nest:
   - `backend-nest-config`
12. controllers do Nest:
   - `backend-nest-controller`

### Comportamento em caso de ausencia

- Se faltar uma skill obrigatoria, parar imediatamente.
- Informar exatamente qual skill faltou e para qual papel ela era necessaria.
- Nao improvisar a implementacao detalhada de uma skill critica ausente.
- So aceitar fallback quando esta skill o definir explicitamente, como no caso `config-module-entity` -> `module-entity`.

## Leituras minimas de contexto antes da orquestracao

Antes de chamar as skills filhas, ler o contexto real do repositorio:

- `modules/auth/src/index.ts`
- `modules/auth/src/user/model/user.entity.ts`
- `modules/auth/src/user/provider/index.ts`
- `modules/auth/src/user/provider/user.repository.ts`
- `modules/auth/src/user/provider/crypto.provider.ts`
- `modules/auth/src/user/usecase/register-user.usecase.ts`
- `apps/backend/src/modules/auth/auth.module.ts`
- `apps/backend/src/modules/auth/auth.controller.ts`
- `apps/backend/src/modules/auth/user.prisma.ts`
- `packages/shared/src/error/index.ts`
- `packages/shared/src/validation/index.ts`
- `packages/shared/src/usecase/index.ts`

Tambem procure no backend por:

- `jwt`
- `token`
- `claims`
- `AuthGuard`
- `CurrentUser`
- `request.user`
- `Authorization`

O objetivo desta leitura e descobrir se a autenticacao ja existe parcialmente, para evoluir a estrutura encontrada em vez de recriar tudo.


## Sequencia deterministica de orquestracao

Execute as etapas abaixo em ordem. Nao pule validacoes intermediarias.

### 1. Garantir a base do projeto e do modulo

- verificar se o projeto ja contem `packages/shared`, `apps/backend`, `modules/` e `apps/backend/src/modules/`
- se o modulo de autenticacao nao existir, acionar `config-new-module`
- ao fim, validar que existem:
  - `modules/<modulo>/`
  - `apps/backend/src/modules/<modulo>/`
  - `apps/backend/src/modules/<modulo>/<modulo>.module.ts`

### 2. Garantir a base compartilhada quando necessario

- verificar se `packages/shared` ja contem os contratos e erros necessarios
- se a base compartilhada estiver ausente ou claramente incompleta para a autenticacao, acionar `config-package-shared`
- ao fim, validar a existencia de erros de dominio, validacao, base de `UseCase` e regras compartilhadas relevantes

### 3. Criar ou preparar o agregado principal do usuario

- acionar `module-aggregate` para o agregado principal do usuario
- preferir um agregado simples, orientado ao fluxo de autenticacao
- ao fim, validar estrutura minima do agregado:
  - `model/`
  - `provider/`
  - `usecase/`
  - `index.ts`

### 4. Criar a entidade principal do usuario

- acionar a skill de entidade resolvida no catalogo:
  - `config-module-entity`, se existir
  - senao `module-entity`
- passar nome do modulo, agregado, entidade e atributos minimos
- incluir validacoes coerentes com:
  - identificador de login
  - senha ou senha em hash
  - campos obrigatorios de cadastro
- ao fim, validar:
  - arquivo da entidade criado ou atualizado
  - teste da entidade criado ou atualizado
  - regras compartilhadas reutilizadas ou justificadas

### 5. Criar o contrato de repositorio do usuario

- acionar `module-repository`
- garantir operacoes minimas para o fluxo:
  - criar usuario
  - buscar por identificador de login
  - buscar por id, quando necessario para claims e rotas protegidas
- ao fim, validar:
  - contrato exportado no agregado
  - fake repository disponivel para testes dos casos de uso

### 6. Criar os casos de uso principais

- acionar `module-use-case` para o caso de uso de registro
- acionar `module-use-case` para o caso de uso de login
- os nomes podem variar conforme a especificacao, mas o fluxo minimo deve continuar cobrindo:
  - cadastro
  - login
- no caso de registro, garantir orquestracao de validacao do usuario, protecao de senha e persistencia
- no caso de login, garantir validacao de credenciais e geracao de JWT ou token equivalente definido para o backend
- ao fim, validar:
  - contratos `In` e `Out` coerentes
  - testes dos casos de uso presentes
  - coverage exigida pela skill filha atendida

### 7. Criar ou reutilizar regras compartilhadas necessarias

- so acionar `shared-validation-rule` quando faltar uma regra realmente generica e reutilizavel
- preferir regras ja existentes em `packages/shared/src/validation/rules`
- exemplos possiveis:
  - regra de login por e-mail
  - regra de senha forte
  - regra de hash bcrypt, quando a entidade armazenar somente hash
- ao fim, validar:
  - nova regra exportada corretamente
  - testes da regra criados

### 8. Sincronizar o dominio com Prisma e banco de dados

- acionar `backend-prisma-sync-module`
- alinhar entidades do modulo com:
  - `apps/backend/prisma/models/<modulo>.model.prisma`
  - migrations incrementais do modulo
- ao fim, validar:
  - schema Prisma atualizado
  - migration gerada
  - banco aplicavel pelo fluxo padrao do projeto

### 9. Criar a implementacao Prisma do repositorio

- acionar `backend-prisma-repository` para o contrato de repositorio principal do usuario
- garantir implementacoes minimas para:
  - `create`
  - `findById`
  - busca por login
  - operacoes adicionais realmente exigidas pelos casos de uso
- ao fim, validar:
  - classe concreta criada em `apps/backend/src/modules/<modulo>/`
  - modulo Nest registrando a implementacao concreta

### 10. Criar implementacoes concretas de providers tecnicos

- acionar `backend-provider-implementation` para o provider de criptografia
- acionar `backend-provider-implementation` para o provider de JWT
- o provider de JWT deve cobrir, no minimo:
  - geracao de token
  - validacao de token ou suporte claro para a strategy compartilhada do backend
- ao fim, validar:
  - implementacoes concretas registradas no modulo Nest
  - dependencias externas instaladas somente se forem necessarias
  - testes adicionados quando houver comportamento observavel relevante

### 11. Configurar a base compartilhada do NestJS

- acionar `backend-nest-config`
- garantir ao menos:
  - filtro global de erros
  - auth guard JWT
  - decorator de usuario autenticado
  - utilitarios compartilhados para payload ou request autenticado
- ao fim, validar:
  - controllers nao precisam mais de `try/catch` repetido apenas para traduzir erro
  - bootstrap do Nest integra a infraestrutura compartilhada

### 12. Criar os controllers da autenticacao

- acionar `backend-nest-controller` para expor os endpoints principais
- criar ou evoluir o controller de auth para:
  - registro
  - login
- manter os controllers enxutos e focados em HTTP
- ao fim, validar:
  - endpoints criados
  - DTOs e contratos coerentes com os casos de uso
  - rotas publicas e rotas protegidas claramente diferenciadas quando necessario

### 13. Validar a integracao final do backend

- confirmar que o backend esta pronto para proteger endpoints fechados com usuario autenticado
- confirmar que ha um caminho claro para `request.user` ou equivalente via decorator compartilhado
- validar que o login retorna o token esperado
- validar que o registro persiste o usuario corretamente


## Regras de teste e validacao final

Esta skill deve garantir que as skills filhas cumpram seus proprios contratos de teste.

Ao final, validar no minimo:

1. testes relevantes da entidade
2. testes relevantes do repositorio de dominio e de seus fakes
3. testes relevantes dos casos de uso
4. testes relevantes dos providers tecnicos, quando houver
5. build do backend
6. testes relevantes do backend e do modulo `auth`

Se alguma skill filha exigir coverage de 100% para seu escopo, respeite essa exigencia.

Esta skill nao precisa duplicar os testes das skills filhas, mas precisa verificar que a cadeia final esta consistente.


## Formato do relatorio final

Ao concluir a execucao desta skill, entregar um resumo objetivo com:

1. skills utilizadas
2. arquivos principais criados ou alterados
3. testes executados
4. o que foi validado com sucesso
5. pendencias, limitacoes ou proximos passos

