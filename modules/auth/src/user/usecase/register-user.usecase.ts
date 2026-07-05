import {
  DomainError,
  NoCommonPasswordRule,
  RequiredRule,
  StrongPasswordRule,
  UseCase,
  Validator,
} from "@taskboard/shared";
import { User } from "../model";
import { CryptoProvider, UserRepository } from "../provider";

export interface RegisterUserIn {
  name: string;
  email: string;
  password: string;
}

export class RegisterUser implements UseCase<RegisterUserIn, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cryptoProvider: CryptoProvider,
  ) {}

  async execute(input: RegisterUserIn): Promise<void> {
    Validator.validate([
      {
        code: "registerUser.password",
        value: input.password,
        rules: [
          new RequiredRule(),
          new StrongPasswordRule(),
          new NoCommonPasswordRule(),
        ],
      },
    ]);

    const existingUser = await this.userRepository.findByEmail(input.email);

    if (existingUser) {
      throw new DomainError("user.email.already.registered", 409);
    }

    const hashedPassword = await this.cryptoProvider.hash(input.password);

    const user = new User({
      name: input.name,
      email: input.email,
      password: hashedPassword,
    });
    user.validate();

    await this.userRepository.create(user);
  }
}
