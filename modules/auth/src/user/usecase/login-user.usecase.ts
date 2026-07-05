import {
  DomainError,
  EmailRule,
  RequiredRule,
  UseCase,
  Validator,
} from "@taskboard/shared";
import { CryptoProvider, UserRepository } from "../provider";

export interface LoginUserIn {
  email: string;
  password: string;
}

export interface LoginUserOut {
  id: string;
  name: string;
  email: string;
}

export class LoginUser implements UseCase<LoginUserIn, LoginUserOut> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cryptoProvider: CryptoProvider,
  ) {}

  async execute(input: LoginUserIn): Promise<LoginUserOut> {
    Validator.validate([
      {
        code: "loginUser.email",
        value: input.email,
        rules: [new RequiredRule(), new EmailRule()],
      },
      {
        code: "loginUser.password",
        value: input.password,
        rules: [new RequiredRule()],
      },
    ]);

    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      throw new DomainError("user.credentials.invalid", 401);
    }

    const passwordMatches = await this.cryptoProvider.compare(
      input.password,
      user.password,
    );

    if (!passwordMatches) {
      throw new DomainError("user.credentials.invalid", 401);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
    };
  }
}
