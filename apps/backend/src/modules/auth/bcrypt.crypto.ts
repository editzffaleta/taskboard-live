import { Injectable } from '@nestjs/common';
import { CryptoProvider } from '@taskboard/auth';
import { compare, hash } from 'bcrypt';

const BCRYPT_SALT_ROUNDS = 10;

@Injectable()
export class BcryptCryptoProvider implements CryptoProvider {
  async hash(plain: string): Promise<string> {
    return hash(plain, BCRYPT_SALT_ROUNDS);
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return compare(plain, hashed);
  }
}
