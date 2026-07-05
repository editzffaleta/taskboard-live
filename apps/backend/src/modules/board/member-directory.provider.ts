import { Injectable } from '@nestjs/common';
import { MemberDirectory, MemberDirectoryUser } from '@taskboard/board';
import { PrismaUserRepository } from '../auth/user.prisma';

/**
 * Adapter que satisfaz a porta `MemberDirectory` (definida em
 * `@taskboard/board`) delegando ao `UserRepository` do modulo `auth`,
 * evitando que o pacote `@taskboard/board` dependa de `@taskboard/auth`
 * (regra de dependencia da Clean Architecture). Decisao registrada na
 * evidencia da task 1.1 da change 010.
 */
@Injectable()
export class MemberDirectoryAdapter implements MemberDirectory {
  constructor(private readonly userRepository: PrismaUserRepository) {}

  async findByEmail(email: string): Promise<MemberDirectoryUser | null> {
    const user = await this.userRepository.findByEmail(email);
    return user ? { id: user.id, name: user.name, email: user.email } : null;
  }

  async findById(id: string): Promise<MemberDirectoryUser | null> {
    const user = await this.userRepository.findById(id);
    return user ? { id: user.id, name: user.name, email: user.email } : null;
  }
}
