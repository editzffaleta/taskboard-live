// Exemplo de VO de campo unico (string), com normalizacao + validacao eager.
// Ajuste os imports ao nome real do pacote shared / barrels do projeto.
import { ValueObject } from "@app/shared/model";
import { Validator, RequiredRule, EmailRule } from "@app/shared/validation";

export interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  static create(value: string): Email {
    const email = new Email({ value: value?.trim().toLowerCase() });
    email.validate();
    return email;
  }

  get value(): string {
    return this.props.value;
  }

  public validate(): void {
    Validator.validate([
      {
        code: "email",
        value: this.value,
        rules: [new RequiredRule(), new EmailRule()],
      },
    ]);
  }
}
