# Padrao de Value Object

## Regras do conceito (DDD)

- **Sem identidade.** Um VO nao tem `id`; ele e definido pelo seu valor.
- **Imutavel.** As props sao congeladas na criacao; nao ha setters.
- **Validacao eager.** A fabrica `create(...)` valida antes de devolver. Um VO
  invalido nunca deve existir (diferente da Entity, que valida de forma lazy).
- **Igualdade por valor.** `a.equals(b)` compara as props, nunca a referencia.
- **Substituivel.** Para "mudar" um VO, cria-se um novo via `create(...)`.

## Anatomia

```ts
export interface <Name>Props {
  // campos do valor
}

export class <Name> extends ValueObject<<Name>Props> {
  private constructor(props: <Name>Props) {
    super(props);
  }

  static create(/* entrada crua */): <Name> {
    const vo = new <Name>({ /* props normalizadas */ });
    vo.validate(); // eager
    return vo;
  }

  // getters somente leitura

  public validate(): void {
    Validator.validate([
      { code: "<name>.<campo>", value: /* ... */, rules: [/* regras compartilhadas */] },
    ]);
  }
}
```

## Decisoes comuns

- **Normalizacao na fabrica:** `trim`, lowercase de email, arredondamento de
  precisao monetaria. Faca isso dentro de `create(...)`, antes de validar.
- **VO multi-campo:** ex. `Money { amount, currency }`. `validate()` cobre todos
  os campos; `equals` compara o conjunto.
- **Reuso de regras:** sempre prefira as regras de `packages/shared/.../rules`
  (`EmailRule`, `CpfRule`, `MinValueRule`, `PrecisionRule`, ...). So crie regra
  nova (via padrao do `shared-validation-rule`) se for generica e reutilizavel.

## Erros comuns a evitar

- Construtor publico (fura a validacao eager) — use `private`/`protected` + fabrica.
- `equals` por id/referencia — sempre por valor.
- Mutacao apos criar — VO e imutavel.
- Dar `id` ao VO — isso o transformaria em Entity.
