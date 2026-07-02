# module-entity — Heurísticas, regras de teste e few-shot

> Extraído do corpo da skill (progressive disclosure). O SKILL.md mantém o contrato
> operacional; aqui vivem a heurística de inferência de validação, a criação de novas
> regras compartilhadas, as regras detalhadas dos testes e o exemplo few-shot.

## Heuristica de inferencia de validacao

A skill deve inferir o melhor conjunto possivel de regras com base em:

- nome do campo
- tipo do campo
- padrao observado nas regras existentes
- exemplo real em `User`
- regras explicitas fornecidas pelo usuario

Prioridades:

1. Regra explicita do usuario
2. Regra compartilhada ja existente em `packages/shared/src/validation/rules`
3. Nova regra compartilhada, somente se ela for claramente generica e reutilizavel

Nunca:

- deixar campo relevante sem protecao por omissao
- criar regra local dentro da entidade quando ja existir regra compartilhada adequada
- criar regra compartilhada para comportamento hiper especifico de uma unica entidade

### Regras sugeridas por tipo e semantica

Use as regras compartilhadas existentes sempre que fizer sentido:

- `string` obrigatoria:
  - `RequiredRule`
- nomes pessoais:
  - `RequiredRule`
  - `MinLengthRule`
  - `MaxLengthRule`
  - `PersonNameRule`
- email:
  - `RequiredRule`
  - `EmailRule`
- slug:
  - `RequiredRule`
  - `SlugRule`
- url:
  - `RequiredRule`
  - `UrlRule`
- dominio:
  - `RequiredRule`
  - `DomainRule`
- senha em hash:
  - `BcryptHashRule`
- senha em texto puro:
  - `RequiredRule`
  - `StrongPasswordRule`
  - `NoCommonPasswordRule`
- UUID em campo de referencia:
  - `RequiredRule`
  - `UuidRule`
- numero inteiro:
  - `RequiredRule`
  - `IntegerRule`
- numero positivo:
  - `PositiveRule`
- numero negativo:
  - `NegativeRule`
- limite numerico:
  - `MinValueRule`
  - `MaxValueRule`
  - `RangeValueRule`
- `Date`:
  - `RequiredRule`
  - `DateRule`
- data passada ou futura:
  - `PastDateRule`
  - `FutureDateRule`
- arrays:
  - `RequiredRule` quando o campo nao puder faltar
  - `MinItemsRule`
  - `MaxItemsRule`
  - `UniqueItemsRule`
- strings sem espacos ou com formato especial:
  - `NoWhitespaceRule`
  - `RegexRule`
  - `AlphaRule`
  - `AlphaNumericRule`
  - `StartsWithRule`
  - `EndsWithRule`
  - `ContainsRule`

### Convencao de codigos de erro

- Usar prefixo semanticamente estavel em minusculo.
- Seguir o padrao observado em `user.entity.ts`.
- Preferir `<aggregate>.<campo>` quando a entidade representar o agregado principal.
- Para entidades filhas, usar um prefixo claro e consistente, por exemplo `<entity>.<campo>`.
- Manter o mesmo prefixo em todos os campos da entidade.

### Processo de escolha (guia complementar)

Use este guia junto com as regras reais em `packages/shared/src/validation/rules/`.

## Processo de escolha

1. Identifique a semantica do campo pelo nome.
2. Cruze com o tipo TypeScript.
3. Procure primeiro uma regra compartilhada existente.
4. Combine regras simples em vez de criar regra nova cedo demais.
5. So crie uma nova regra compartilhada quando a necessidade for generica e recorrente.

## Mapeamentos comuns

- `name`, `fullName`, `ownerName`
  - `RequiredRule`
  - `MinLengthRule`
  - `MaxLengthRule`
  - `PersonNameRule`
- `email`
  - `RequiredRule`
  - `EmailRule`
- `passwordHash`, `hashedPassword`
  - `BcryptHashRule`
- `password`
  - `RequiredRule`
  - `StrongPasswordRule`
  - `NoCommonPasswordRule`
- `slug`
  - `RequiredRule`
  - `SlugRule`
- `url`, `website`
  - `RequiredRule`
  - `UrlRule`
- `domain`
  - `RequiredRule`
  - `DomainRule`
- `phone`
  - `RequiredRule`
  - `PhoneRule`
  - `PhoneBrRule` quando a semantica for brasileira
- `cpf`, `cnpj`, `cep`, `rg`
  - usar a regra especifica existente
- `id`, `userId`, `customerId`, `transactionId`
  - `RequiredRule`
  - `UuidRule`
- `quantity`, `count`, `installments`
  - `RequiredRule`
  - `IntegerRule`
  - `PositiveRule`
- `amount`, `price`, `total`
  - `RequiredRule`
  - `PositiveRule`
  - `PrecisionRule` quando houver escala monetaria definida
- `createdOn`, `expiresAt`, `birthDate`
  - `RequiredRule`
  - `DateRule`
  - `PastDateRule` ou `FutureDateRule` conforme o caso
- arrays como `tags`, `items`, `emails`
  - `RequiredRule` se nao puder faltar
  - `MinItemsRule`
  - `MaxItemsRule`
  - `UniqueItemsRule`

## Sinais de que vale criar regra compartilhada nova

- a validacao nao depende da entidade atual
- o nome da regra faz sentido em qualquer modulo
- a regra pode ser testada isoladamente no `shared`
- a regra representa formato, faixa, combinacao ou politica generica

## Sinais de que nao vale criar regra compartilhada nova

- a regra menciona contexto exclusivo de um agregado
- o erro faria sentido apenas para uma entidade
- a necessidade pode ser atendida combinando regras existentes

## Criacao de nova regra compartilhada

Se nao existir regra compartilhada suficiente para um caso recorrente e generico:

1. Criar a nova regra em `packages/shared/src/validation/rules/<rule>.rule.ts`
2. Exportar em `packages/shared/src/validation/rules/index.ts`
3. Confirmar que `packages/shared/src/validation/index.ts` ja a expoe via `export * from "./rules"`
4. Criar ou atualizar o teste da nova regra em `packages/shared/test/validation/rules/`
5. Usar a regra nova na entidade

Essa regra nova so deve existir quando o comportamento for claramente reaproveitavel por outros modulos.


## Regras dos testes unitarios

O teste da entidade deve buscar cobertura de 100% para o arquivo da entidade.

Cobertura minima obrigatoria:

1. criacao de entidade valida
2. leitura correta de todos os getters
3. comportamento lazy, garantindo que a entidade possa existir invalida antes do `validate()`
4. sucesso de `validate()` para dados validos
5. falha de `validate()` para dados invalidos
6. mensagens ou codigos de erro esperados quando fizer sentido
7. cenarios limite das regras aplicadas
8. comportamento herdado relevante da classe base, quando fizer parte da superficie observavel
9. branches internos de `validate()`
10. fluxos de `clone`, `deletedAt`, `createdAt` e `updatedAt`, quando a entidade os expuser de forma observavel

Regras de qualidade do teste:

- seguir o estilo de `modules/auth/test/user/model/user.entity.test.ts`
- criar helper para extrair mensagens de `ValidationException` quando isso simplificar assercoes
- evitar teste superficial que apenas instancia a classe sem verificar comportamento
- testar especialmente as combinacoes que podem deixar branch sem cobertura
- se a entidade tiver apenas getters e um `validate()` linear, ainda assim cobrir sucesso, falha e limites de cada regra importante


## Few-shot

Para reproduzir o padrao estrutural rapidamente:

- ver `references/user-entity-pattern.md`
