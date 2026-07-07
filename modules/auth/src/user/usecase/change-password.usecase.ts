import {
  DomainError,
  NoCommonPasswordRule,
  NotFoundError,
  RequiredRule,
  StrongPasswordRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { CryptoProvider, UserRepository } from "../provider";

export interface ChangePasswordIn {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export class ChangePassword implements UseCase<ChangePasswordIn, void> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly cryptoProvider: CryptoProvider,
  ) {}

  async execute(input: ChangePasswordIn): Promise<void> {
    Validator.validate([
      {
        code: "changePassword.userId",
        value: input.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
      {
        code: "changePassword.newPassword",
        value: input.newPassword,
        rules: [
          new RequiredRule(),
          new StrongPasswordRule(),
          new NoCommonPasswordRule(),
        ],
      },
    ]);

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundError("user.not.found");
    }

    const currentMatches = await this.cryptoProvider.compare(
      input.currentPassword,
      user.password,
    );

    if (!currentMatches) {
      throw new DomainError("user.password.current.invalid", 401);
    }

    const hashed = await this.cryptoProvider.hash(input.newPassword);
    const updated = user.clone({ password: hashed });
    updated.validate();

    await this.userRepository.update(updated);
  }
}
