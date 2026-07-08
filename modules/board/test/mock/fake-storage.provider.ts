import { StorageProvider } from "../../src/attachment/provider";

export class FakeStorageProvider implements StorageProvider {
  readonly files = new Map<string, Buffer>();

  async save(storageKey: string, content: Buffer): Promise<void> {
    this.files.set(storageKey, content);
  }

  async read(storageKey: string): Promise<Buffer> {
    const content = this.files.get(storageKey);

    if (!content) {
      throw new Error(`storage.key.not.found: ${storageKey}`);
    }

    return content;
  }

  async remove(storageKey: string): Promise<void> {
    this.files.delete(storageKey);
  }
}
