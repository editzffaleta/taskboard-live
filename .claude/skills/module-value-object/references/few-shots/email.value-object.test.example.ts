// Exemplo de teste de VO. Ajuste o import ao barrel real do modulo.
import { Email } from "../../../src/<aggregate>/model/email.value-object";

describe("Email (Value Object)", () => {
  it("cria a partir de um email valido", () => {
    const email = Email.create("Bruno@Example.com ");
    expect(email.value).toBe("bruno@example.com"); // normalizado (trim + lowercase)
  });

  it("falha na criacao com email invalido", () => {
    expect(() => Email.create("nao-e-email")).toThrow();
  });

  it("falha na criacao com valor vazio", () => {
    expect(() => Email.create("")).toThrow();
  });

  it("e igual a outro Email com o mesmo valor (igualdade por valor)", () => {
    expect(Email.create("a@b.com").equals(Email.create("a@b.com"))).toBe(true);
  });

  it("nao e igual a um Email com valor diferente", () => {
    expect(Email.create("a@b.com").equals(Email.create("c@d.com"))).toBe(false);
  });

  it("nao e igual a undefined", () => {
    expect(Email.create("a@b.com").equals(undefined)).toBe(false);
  });
});
