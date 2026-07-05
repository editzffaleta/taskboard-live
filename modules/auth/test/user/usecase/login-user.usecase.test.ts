import { DomainError, ValidationException } from "@taskboard/shared";
import { LoginUser, LoginUserIn } from "../../../src/user/usecase/login-user.usecase";
import { RegisterUser } from "../../../src/user/usecase/register-user.usecase";
import { FakeCryptoProvider, FakeUserRepository } from "../../mock";

function buildInput(overrides: Partial<LoginUserIn> = {}): LoginUserIn {
  return {
    email: "maria.silva@example.com",
    password: "Str0ng!Passw0rd",
    ...overrides,
  };
}

async function registerBaseUser(
  userRepository: FakeUserRepository,
  cryptoProvider: FakeCryptoProvider,
): Promise<void> {
  const registerUser = new RegisterUser(userRepository, cryptoProvider);
  await registerUser.execute({
    name: "Maria Silva",
    email: "maria.silva@example.com",
    password: "Str0ng!Passw0rd",
  });
}

describe("LoginUser", () => {
  it("autentica um usuario com credenciais validas e retorna dados publicos", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    await registerBaseUser(userRepository, cryptoProvider);
    const useCase = new LoginUser(userRepository, cryptoProvider);

    const output = await useCase.execute(buildInput());

    expect(output).toEqual({
      id: userRepository.users[0].id,
      name: "Maria Silva",
      email: "maria.silva@example.com",
    });
    expect(output).not.toHaveProperty("password");
  });

  it("rejeita e-mail inexistente com mensagem generica", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const useCase = new LoginUser(userRepository, cryptoProvider);

    await expect(
      useCase.execute(buildInput({ email: "nao.existe@example.com" })),
    ).rejects.toMatchObject({
      message: "user.credentials.invalid",
      statusCode: 401,
    });
    await expect(
      useCase.execute(buildInput({ email: "nao.existe@example.com" })),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita senha incorreta com a mesma mensagem generica", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    await registerBaseUser(userRepository, cryptoProvider);
    const useCase = new LoginUser(userRepository, cryptoProvider);

    await expect(
      useCase.execute(buildInput({ password: "SenhaErrada!123" })),
    ).rejects.toMatchObject({
      message: "user.credentials.invalid",
      statusCode: 401,
    });
    await expect(
      useCase.execute(buildInput({ password: "SenhaErrada!123" })),
    ).rejects.toBeInstanceOf(DomainError);
  });

  it("rejeita e-mail vazio", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const useCase = new LoginUser(userRepository, cryptoProvider);

    await expect(
      useCase.execute(buildInput({ email: "" })),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it("rejeita e-mail invalido", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const useCase = new LoginUser(userRepository, cryptoProvider);

    await expect(
      useCase.execute(buildInput({ email: "email-invalido" })),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it("rejeita senha vazia", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const useCase = new LoginUser(userRepository, cryptoProvider);

    await expect(
      useCase.execute(buildInput({ password: "" })),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});
