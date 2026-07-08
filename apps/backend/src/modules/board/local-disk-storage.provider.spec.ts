import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { LocalDiskStorage } from './local-disk-storage.provider';

const UPLOADS_DIR = join(process.cwd(), 'storage', 'uploads');

describe('LocalDiskStorage', () => {
  it('grava, le o mesmo conteudo de volta e remove', async () => {
    const storage = new LocalDiskStorage();
    const storageKey = 'teste-local-disk-storage.txt';
    const content = Buffer.from('conteudo de teste');

    await storage.save(storageKey, content);
    expect(existsSync(join(UPLOADS_DIR, storageKey))).toBe(true);

    const read = await storage.read(storageKey);
    expect(read).toEqual(content);

    await storage.remove(storageKey);
    expect(existsSync(join(UPLOADS_DIR, storageKey))).toBe(false);
  });

  it('lanca erro tratavel ao ler storageKey inexistente', async () => {
    const storage = new LocalDiskStorage();

    await expect(storage.read('inexistente.txt')).rejects.toThrow();
  });

  it('rejeita storageKey com separadores de caminho ou ".."', async () => {
    const storage = new LocalDiskStorage();

    await expect(
      storage.save('../fora-do-dir.txt', Buffer.from('x')),
    ).rejects.toThrow();
    await expect(
      storage.save('sub/dir.txt', Buffer.from('x')),
    ).rejects.toThrow();
    await expect(storage.read('../../etc/passwd')).rejects.toThrow();
  });
});
