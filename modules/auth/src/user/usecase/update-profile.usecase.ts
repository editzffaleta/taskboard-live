import {
  NotFoundError,
  RequiredRule,
  UseCase,
  UuidRule,
  Validator,
} from "@taskboard/shared";
import { UserRepository } from "../provider";

export interface UpdateProfileIn {
  userId: string;
  name: string;
}

export interface UpdateProfileOut {
  id: string;
  name: string;
  email: string;
}

export class UpdateProfile implements UseCase<UpdateProfileIn, UpdateProfileOut> {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(input: UpdateProfileIn): Promise<UpdateProfileOut> {
    Validator.validate([
      {
        code: "updateProfile.userId",
        value: input.userId,
        rules: [new RequiredRule(), new UuidRule()],
      },
    ]);

    const user = await this.userRepository.findById(input.userId);

    if (!user) {
      throw new NotFoundError("user.not.found");
    }

    const updated = user.clone({ name: input.name });
    updated.validate();

    await this.userRepository.update(updated);

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
    };
  }
}
