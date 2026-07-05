import { createHash } from "node:crypto";
import { CryptoProvider } from "../../src/user/provider";

const SAFE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./";

function toSafeChars(input: string, length: number): string {
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += SAFE_ALPHABET[input.charCodeAt(i % input.length) % SAFE_ALPHABET.length];
  }
  return result;
}

export class FakeCryptoProvider implements CryptoProvider {
  async hash(plain: string): Promise<string> {
    const digest = createHash("sha256").update(plain).digest("hex");
    return `$2b$10$${toSafeChars(digest, 53)}`;
  }

  async compare(plain: string, hashed: string): Promise<boolean> {
    return hashed === (await this.hash(plain));
  }
}
