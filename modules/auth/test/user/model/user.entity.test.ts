import { ValidationException } from "@taskboard/shared";
import { User, UserState } from "../../../src/user/model/user.entity";

function getValidationMessages(callback: () => void): string[] {
  try {
    callback();
    return [];
  } catch (error) {
    return (error as ValidationException).errors.map((item) => item.message);
  }
}

function buildProps(overrides: Partial<UserState> = {}): UserState {
  return {
    name: "Maria Silva",
    email: "maria.silva@example.com",
    password: "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
    ...overrides,
  };
}

describe("User", () => {
  it("cria a entidade com os dados informados", () => {
    const user = new User(buildProps());

    expect(user.id).toBeDefined();
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
    expect(user.deletedAt).toBeNull();
  });

  it("expoe os getters corretamente", () => {
    const props = buildProps({ name: "Joao Souza", email: "joao@example.com" });
    const user = new User(props);

    expect(user.name).toBe("Joao Souza");
    expect(user.email).toBe("joao@example.com");
    expect(user.password).toBe(props.password);
  });

  it("permite existir temporariamente invalida sem lancar erro no construtor (lazy validation)", () => {
    expect(() => new User(buildProps({ name: "" }))).not.toThrow();
  });

  it("valida com sucesso quando todos os campos sao validos", () => {
    const user = new User(buildProps());

    expect(() => user.validate()).not.toThrow();
  });

  it("clona preservando id e createdAt, atualizando updatedAt", () => {
    const user = new User(buildProps());
    const cloned = user.clone({ name: "Novo Nome" });

    expect(cloned.id).toBe(user.id);
    expect(cloned.createdAt.getTime()).toBe(user.createdAt.getTime());
    expect(cloned.name).toBe("Novo Nome");
  });

  describe("name", () => {
    it("rejeita nome vazio", () => {
      const user = new User(buildProps({ name: "" }));
      const messages = getValidationMessages(() => user.validate());

      expect(messages).toContain("user.name.required");
    });

    it("rejeita nome curto demais", () => {
      const user = new User(buildProps({ name: "Al" }));
      const messages = getValidationMessages(() => user.validate());

      expect(messages).toContain("user.name.min.length");
    });

    it("rejeita nome longo demais", () => {
      const longName = `${"A".repeat(40)} ${"B".repeat(41)}`;
      const user = new User(buildProps({ name: longName }));
      const messages = getValidationMessages(() => user.validate());

      expect(messages).toContain("user.name.max.length");
    });

    it("rejeita nome sem sobrenome (nao e um nome de pessoa completo)", () => {
      const user = new User(buildProps({ name: "Mariazinha" }));
      const messages = getValidationMessages(() => user.validate());

      expect(messages).toContain("user.name.person.name");
    });

    it("aceita nome composto com acentos e hifen", () => {
      const user = new User(buildProps({ name: "Ana-Beatriz Núñez" }));

      expect(() => user.validate()).not.toThrow();
    });
  });

  describe("email", () => {
    it("rejeita email vazio", () => {
      const user = new User(buildProps({ email: "" }));
      const messages = getValidationMessages(() => user.validate());

      expect(messages).toContain("user.email.required");
    });

    it("rejeita email com formato invalido", () => {
      const user = new User(buildProps({ email: "email-invalido" }));
      const messages = getValidationMessages(() => user.validate());

      expect(messages).toContain("user.email.invalid.email");
    });

    it("aceita email valido", () => {
      const user = new User(buildProps({ email: "contato@taskboard.live" }));

      expect(() => user.validate()).not.toThrow();
    });
  });

  describe("password", () => {
    it("rejeita senha que nao esta em formato de hash bcrypt", () => {
      const user = new User(buildProps({ password: "senha-em-texto-puro" }));
      const messages = getValidationMessages(() => user.validate());

      expect(messages).toContain("user.password.bcrypt.hash");
    });

    it("aceita senha em formato de hash bcrypt", () => {
      const user = new User(
        buildProps({
          password:
            "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy",
        }),
      );

      expect(() => user.validate()).not.toThrow();
    });
  });

  it("acumula todas as mensagens de erro quando multiplos campos sao invalidos", () => {
    const user = new User(
      buildProps({ name: "", email: "invalido", password: "texto-puro" }),
    );
    const messages = getValidationMessages(() => user.validate());

    expect(messages).toEqual(
      expect.arrayContaining([
        "user.name.required",
        "user.email.invalid.email",
        "user.password.bcrypt.hash",
      ]),
    );
  });
});
