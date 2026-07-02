// Exemplo de VO multi-campo (valor + moeda), com arredondamento na fabrica.
// Ajuste imports e regras as do projeto.
import { ValueObject } from "@app/shared/model";
import { Validator, RequiredRule, MinValueRule, InRule } from "@app/shared/validation";

export interface MoneyProps {
  amount: number; // em unidade monetaria (ex.: 19.9)
  currency: string; // ex.: "BRL"
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  static create(amount: number, currency = "BRL"): Money {
    const money = new Money({
      amount: Math.round(amount * 100) / 100, // normaliza para 2 casas
      currency: currency?.trim().toUpperCase(),
    });
    money.validate();
    return money;
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  public validate(): void {
    Validator.validate([
      { code: "money.amount", value: this.amount, rules: [new RequiredRule(), new MinValueRule(0)] },
      { code: "money.currency", value: this.currency, rules: [new RequiredRule(), new InRule(["BRL", "USD", "EUR"])] },
    ]);
  }
}
