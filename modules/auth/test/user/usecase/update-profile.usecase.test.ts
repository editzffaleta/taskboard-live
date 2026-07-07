import { DomainError, ValidationException } from "@taskboard/shared";
import { UpdateProfile } from "../../../src/user/usecase/update-profile.usecase";
import { RegisterUser } from "../../../src/user/usecase/register-user.usecase";
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

describe("UpdateProfile", () => {
  it("atualiza o nome com sucesso e retorna dados publicos", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const userId = await registerBaseUser(userRepository, cryptoProvider);
    const useCase = new UpdateProfile(userRepository);

    const output = await useCase.execute({ userId, name: "Maria Souza" });

    expect(output).toEqual({
      id: userId,
      name: "Maria Souza",
      email: "maria.silva@example.com",
    });
    expect(userRepository.users[0].name).toBe("Maria Souza");
  });

  it("rejeita nome invalido (muito curto) sem persistir", async () => {
    const userRepository = new FakeUserRepository();
    const cryptoProvider = new FakeCryptoProvider();
    const userId = await registerBaseUser(userRepository, cryptoProvider);
    const useCase = new UpdateProfile(userRepository);

    await expect(
      useCase.execute({ userId, name: "ab" }),
    ).rejects.toBeInstanceOf(ValidationException);
    expect(userRepository.users[0].name).toBe("Maria Silva");
  });

  it("rejeita userId inexistente com user.not.found", async () => {
    const userRepository = new FakeUserRepository();
    const useCase = new UpdateProfile(userRepository);

    const inexistentUserId = "b3764b56-ffde-4f3e-8443-26b6a341fc88";
    await expect(
      useCase.execute({
        userId: inexistentUserId,
        name: "Nome Valido",
      }),
    ).rejects.toMatchObject({ message: "user.not.found", statusCode: 404 });
    await expect(
      useCase.execute({
        userId: inexistentUserId,
        name: "Nome Valido",
      }),
    ).rejects.toBeInstanceOf(DomainError);
  });
});
