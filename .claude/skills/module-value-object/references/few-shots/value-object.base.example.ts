// Exemplo da base ValueObject — criar em packages/shared/src/model/value-object.ts
// SOMENTE se ainda nao existir uma base equivalente no projeto.
// Ajuste o estilo ao que ja houver em entity.ts.

export abstract class ValueObject<Props extends object> {
  protected readonly props: Readonly<Props>;

  protected constructor(props: Props) {
    this.props = Object.freeze({ ...props });
  }

  /** Validacao eager: as fabricas devem chamar logo apos instanciar. */
  public abstract validate(): void;

  /** Igualdade por valor (nunca por referencia). */
  public equals(other?: ValueObject<Props>): boolean {
    if (!other) return false;
    if (other.constructor !== this.constructor) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
