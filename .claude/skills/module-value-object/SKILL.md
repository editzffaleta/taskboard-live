---
name: module-value-object
description: Cria Value Objects de domínio padronizados para os módulos da aplicação — imutáveis, validados de forma eager na fábrica, com igualdade por valor e testes unitários completos —, seguindo o conceito de DDD e reaproveitando as regras de validação compartilhadas do projeto.
---

# Module Value Object

Use esta skill quando o pedido for criar ou completar um Value Object (VO) de
dominio dentro de um modulo existente em `modules/`, junto com o teste unitario
do VO e a verificacao de coverage.

Esta skill nao cria entidade, agregado, controller, repositorio, migration ou
adaptacoes do backend. O foco aqui e somente:

- Value Object de dominio
- imutabilidade
- validacao eager na criacao (um VO invalido nao deve existir)
- igualdade por valor (`equals`)
- reaproveitamento de regras compartilhadas
- testes unitarios fortes com coverage de 100% para o VO

## Diferenca em relacao a Entity (importante)

- **Entity** tem identidade (`id`) e validacao **lazy** (pode existir invalida
  ate `validate()`).
- **Value Object** nao tem identidade, e **imutavel** e e validado **eager** na
  fabrica: se os dados forem invalidos, a criacao falha e o objeto nunca existe.
- Igualdade de VO e **por valor** (`equals`), nunca por referencia ou id.

## Entradas obrigatorias

1. `nome do modulo`
2. `nome do agregado` ou `path do agregado`
3. `nome do value object`
4. `campos do VO com tipos` (um VO pode ter 1 ou mais campos)

Entrada opcional:

5. `regras explicitas por campo`, quando o usuario quiser forcar alguma validacao
6. `normalizacao` desejada na criacao (ex.: `trim`, lowercase)

## Referencias obrigatorias

Antes de gerar qualquer codigo, ler obrigatoriamente:

1. `packages/shared/src/model/entity.ts` (para seguir o estilo da classe base)
2. `packages/shared/src/model/index.ts`
3. `packages/shared/src/validation/validator.ts`
4. `packages/shared/src/validation/index.ts`
5. `packages/shared/src/validation/rules/`
6. uma entidade real do projeto, ex. `modules/auth/src/user/model/user.entity.ts`,
   para casar naming e codigos de erro

Tambem leia as referencias internas desta skill:

- `references/value-object-pattern.md`
- `references/few-shots/value-object.base.example.ts`
- `references/few-shots/email.value-object.example.ts`
- `references/few-shots/email.value-object.test.example.ts`
- `references/few-shots/money.value-object.example.ts`

## Base `ValueObject` (pre-requisito)

O VO depende de uma classe base de Value Object no pacote compartilhado.

1. Procure por uma base ja existente em `packages/shared/src/model/` (ex.
   `value-object.ts` ou export `ValueObject` em `model/index.ts`).
2. Se ela existir, **reutilize**. Nao crie uma paralela.
3. Se nao existir, crie `packages/shared/src/model/value-object.ts` seguindo o
   estilo de `entity.ts` e o few-shot `value-object.base.example.ts`, depois
   exporte em `packages/shared/src/model/index.ts` e confirme a cadeia ate
   `packages/shared/src/index.ts`.

A base deve garantir, no minimo: armazenamento imutavel das props
(`Object.freeze`), `equals(other)` por valor, e um `validate()` abstrato.

## Validacoes iniciais

1. Validar que `modules/<modulo>` existe.
2. Resolver o agregado da mesma forma que o `module-entity`:
   - so o nome -> `modules/<modulo>/src/<aggregate>`;
   - path -> deve apontar para um agregado real dentro de `modules/<modulo>/src/`.
3. Nao inferir multiplos destinos; em ambiguidade real, parar e pedir confirmacao.
4. Ler `modules/<modulo>/package.json` para o nome real do workspace antes dos testes.

## Destinos obrigatorios

- Value Object:
  - `modules/<modulo>/src/<aggregate>/model/<vo>.value-object.ts`
- Teste:
  - `modules/<modulo>/test/<aggregate>/model/<vo>.value-object.test.ts`

Convencoes obrigatorias:

- Arquivo em `kebab-case` com sufixo `.value-object.ts`
- Interface de props em `PascalCase` com sufixo `Props`
- Classe em `PascalCase` (sem sufixo `Rule`/`Entity`)

## Estrutura obrigatoria do VO

Seguir exatamente o padrao (ver `references/value-object-pattern.md`):

1. `export interface <Name>Props { ... }`
2. `export class <Name> extends ValueObject<<Name>Props>`
3. **Construtor `private` ou `protected`** — a criacao publica e via fabrica.
4. `static create(...)` que: normaliza (se aplicavel), instancia, chama
   `validate()` (eager) e retorna o VO valido.
5. Getters explicitos somente de leitura para os campos.
6. `validate()` com `Validator.validate([...])`, no mesmo padrao da Entity.
7. Sem setters. Sem efeitos colaterais. Sem mutacao apos a criacao.

Formato esperado:

```ts
export interface ExampleProps {
  value: string;
}

export class Example extends ValueObject<ExampleProps> {
  private constructor(props: ExampleProps) {
    super(props);
  }

  static create(value: string): Example {
    const vo = new Example({ value: value?.trim() });
    vo.validate();
    return vo;
  }

  get value(): string {
    return this.props.value;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "example",
        value: this.value,
        rules: [new RequiredRule()],
      },
    ]);
  }
}
```

## Inferencia de validacao

Reutilize as regras compartilhadas existentes, seguindo a mesma heuristica do
`module-entity` (prioridade: regra explicita do usuario > regra compartilhada
existente > nova regra compartilhada so se claramente generica). Exemplos:
`Email` -> `RequiredRule` + `EmailRule`; `Cpf` -> `RequiredRule` + `CpfRule`;
`Money`/valor -> `RequiredRule` + `MinValueRule`/`PrecisionRule` conforme o caso.

Codigos de erro: prefixo estavel em minusculo no padrao observado no projeto
(ex.: o proprio nome do VO em camelCase: `email`, `money.amount`).

## Regras dos testes

Coverage minima obrigatoria de 100% para o arquivo do VO:

1. criacao valida via `create(...)`
2. **falha na criacao** com dados invalidos (a fabrica deve lancar via `Validator`)
3. imutabilidade: tentativa de alterar o estado nao reflete no VO
4. leitura correta dos getters
5. `equals`: dois VOs com o mesmo valor sao iguais; com valores diferentes, nao
6. `equals` com `undefined`/tipo diferente retorna `false`
7. normalizacao aplicada (quando houver `trim`/lowercase etc.)
8. cenarios limite das regras aplicadas

Seguir o estilo dos testes do projeto; importar a partir do barrel do modulo/shared.

## Workflow recomendado

1. Validar modulo, agregado e destino.
2. Ler as referencias obrigatorias e garantir/!criar a base `ValueObject`.
3. Definir props, normalizacao e regras (reaproveitando as compartilhadas).
4. Criar o VO com construtor privado + `static create(...)` + `validate()` + `equals` herdado.
5. Criar o teste do VO.
6. Atualizar o barrel `model/index.ts` do agregado, se for o padrao local.
7. Rodar os testes com coverage mirando o VO; ajustar ate 100%.

## Comandos de verificacao

```bash
npm run test --workspace <workspace-do-modulo> -- \
  --runTestsByPath test/<aggregate>/model/<vo>.value-object.test.ts \
  --collectCoverageFrom=src/<aggregate>/model/<vo>.value-object.ts
```

Se criar a base `ValueObject`, rodar tambem os testes do pacote shared.

## Guardrails

- Nao criar entidade, agregado, repositorio, controller, migration ou backend.
- Nao dar identidade (`id`) a um VO.
- Nao validar de forma lazy: a fabrica `create(...)` valida eager.
- Nao expor construtor publico nem setters; VO e imutavel.
- Nao implementar `equals` por referencia/id; sempre por valor.
- Nao criar base `ValueObject` paralela se ja existir uma.
- Nao parar com coverage parcial.

## Saida esperada

- VO criado em `modules/<modulo>/src/<aggregate>/model/<vo>.value-object.ts`
- teste em `modules/<modulo>/test/<aggregate>/model/<vo>.value-object.test.ts`
- base `ValueObject` criada em `packages/shared/src/model/value-object.ts` apenas
  se nao existir
- barrels minimos ajustados quando necessario
- validacao final executada com coverage de 100% para o VO
