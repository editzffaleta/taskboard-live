import { DomainError, ValidationException } from "@taskboard/shared";
import { ChangePassword } from "../../../src/user/usecase/change-password.usecase";
import { RegisterUser } from "../../../src/user/usecase/register-user.usecase";
import { LoginUser } from "../../../src/user/usecase/login-user.usecase";
import { FakeCryptoProvider, FakeUserRepository } from "../../mock";

async function registerBaseUser(
  userRepository: FakeUserRepository,
  cryptoProvider: FakeCryptoProvider,
): Promise<string> {
  const registerUser = new RegisterUser(userRepository, cryptoProvider);
  await registerUser.execute({
    name: "Maria Silva",
    email: "maria.silva@example.com",
    password: "Str0ng!Passw0rd",
  });
  return userRepository.users[0].id;
}

describe("ChangePassword", () => {
  it("troca a senha com sucesso e permite login com a nova senha", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const userId = await registerBaseUser(userRepository, cryptoProvider);
    const useCase = new ChangePassword(userRepository, cryptoProvider);

    await useCase.execute({
      userId,
      currentPassword: "Str0ng!Passw0rd",
      newPassword: "N0v@SenhaForte!",
    });

    const loginUser = new LoginUser(userRepository, cryptoProvider);
    const output = await loginUser.execute({
      email: "maria.silva@example.com",
      password: "N0v@SenhaForte!",
    });
    expect(output.id).toBe(userId);
  });

  it("rejeita senha atual incorreta sem alterar o hash persistido", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const userId = await registerBaseUser(userRepository, cryptoProvider);
    const useCase = new ChangePassword(userRepository, cryptoProvider);
    const previousHash = userRepository.users[0].password;

    await expect(
      useCase.execute({
        userId,
        currentPassword: "SenhaErrada!123",
        newPassword: "N0v@SenhaForte!",
      }),
    ).rejects.toMatchObject({
      message: "user.password.current.invalid",
      statusCode: 401,
    });
    await expect(
      useCase.execute({
        userId,
        currentPassword: "SenhaErrada!123",
        newPassword: "N0v@SenhaForte!",
      }),
    ).rejects.toBeInstanceOf(DomainError);
    expect(userRepository.users[0].password).toBe(previousHash);
  });

  it("rejeita nova senha fraca sem comparar a senha atual", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const compareSpy = jest.spyOn(cryptoProvider, "compare");
    const userId = await registerBaseUser(userRepository, cryptoProvider);
    const useCase = new ChangePassword(userRepository, cryptoProvider);
    const previousHash = userRepository.users[0].password;

    await expect(
      useCase.execute({
        userId,
        currentPassword: "Str0ng!Passw0rd",
        newPassword: "123456",
      }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(userRepository.users[0].password).toBe(previousHash);
    expect(compareSpy).not.toHaveBeenCalled();
  });
});
