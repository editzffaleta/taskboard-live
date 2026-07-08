export interface StorageProvider {
  save(storageKey: string, content: Buffer): Promise<void>;
  read(storageKey: string): Promise<Buffer>;
  remove(storageKey: string): Promise<void>;
}
