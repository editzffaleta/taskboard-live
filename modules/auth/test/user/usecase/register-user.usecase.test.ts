import { DomainError, ValidationException } from "@taskboard/shared";
import { RegisterUser, RegisterUserIn } from "../../../src/user/usecase/register-user.usecase";
import { FakeCryptoProvider, FakeUserRepository } from "../../mock";

function buildInput(overrides: Partial<RegisterUserIn> = {}): RegisterUserIn {
  return {
    name: "Maria Silva",
    email: "maria.silva@example.com",
    password: "Str0ng!Passw0rd",
    ...overrides,
  };
}

describe("RegisterUser", () => {
  it("registra um usuario valido com a senha criptografada", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const useCase = new RegisterUser(userRepository, cryptoProvider);

    await useCase.execute(buildInput());

    expect(userRepository.users).toHaveLength(1);
    const persisted = userRepository.users[0];
    expect(persisted.name).toBe("Maria Silva");
    expect(persisted.email).toBe("maria.silva@example.com");
    expect(persisted.password).not.toBe("Str0ng!Passw0rd");
    expect(persisted.password).toBe(await cryptoProvider.hash("Str0ng!Passw0rd"));
  });

  it("rejeita quando o e-mail ja esta cadastrado", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const useCase = new RegisterUser(userRepository, cryptoProvider);

    await useCase.execute(buildInput());

    await expect(useCase.execute(buildInput())).rejects.toMatchObject({
      message: "user.email.already.registered",
      statusCode: 409,
    });
    await expect(useCase.execute(buildInput())).rejects.toBeInstanceOf(DomainError);
    expect(userRepository.users).toHaveLength(1);
  });

  it("rejeita senha vazia", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const useCase = new RegisterUser(userRepository, cryptoProvider);

    await expect(
      useCase.execute(buildInput({ password: "" })),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(userRepository.users).toHaveLength(0);
  });

  it("rejeita senha fraca (sem os requisitos minimos)", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const useCase = new RegisterUser(userRepository, cryptoProvider);

    await expect(
      useCase.execute(buildInput({ password: "abc123" })),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(userRepository.users).toHaveLength(0);
  });

  it("rejeita senha comum mesmo que atenda aos requisitos minimos de forca", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const useCase = new RegisterUser(userRepository, cryptoProvider);

    await expect(
      useCase.execute(buildInput({ password: "123456" })),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(userRepository.users).toHaveLength(0);
  });

  it("rejeita entrada invalida (nome vazio)", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const useCase = new RegisterUser(userRepository, cryptoProvider);

    await expect(
      useCase.execute(buildInput({ name: "" })),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(userRepository.users).toHaveLength(0);
  });

  it("rejeita entrada invalida (email invalido)", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const useCase = new RegisterUser(userRepository, cryptoProvider);

    await expect(
      useCase.execute(buildInput({ email: "email-invalido" })),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(userRepository.users).toHaveLength(0);
  });
});
