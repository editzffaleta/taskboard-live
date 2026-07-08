import { existsSync, mkdirSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join, normalize, sep } from 'node:path';
import { Injectable } from '@nestjs/common';
import { StorageProvider } from '@taskboard/board';

// `process.cwd()` é sempre a raiz do workspace `apps/backend` (é assim que
// `npm run <script> --workspace apps/backend`/Turbo/`nest start` executam o
// processo), independente de rodar via `ts-node` (`src/`) ou via `dist/`
// compilado — diferente de `__dirname`, que muda de profundidade entre os
// dois modos.
const UPLOADS_DIR = join(process.cwd(), 'storage', 'uploads');

/**
 * Implementação concreta de `StorageProvider` (porta definida em
 * `@taskboard/board`): grava/lê/remove arquivos em disco local, dentro de
 * `apps/backend/storage/uploads/` (diretório fora do git, `.gitignore`).
 * Nunca aceita nem retorna caminho absoluto do disco — o contrato só troca
 * `storageKey` (string opaca) por conteúdo binário. Todo caminho é resolvido
 * via `path.join` a partir de `UPLOADS_DIR`, e qualquer `storageKey` que
 * tente escapar do diretório (`..`, separador de caminho) é rejeitado antes
 * de tocar o disco, mesmo que a geração interna (`add-attachment.usecase`)
 * já garanta uma chave segura — defesa em profundidade.
 */
@Injectable()
export class LocalDiskStorage implements StorageProvider {
  constructor() {
    this.ensureUploadsDir();
  }

  async save(storageKey: string, content: Buffer): Promise<void> {
    const path = this.resolvePath(storageKey);
    await writeFile(path, content);
  }

  async read(storageKey: string): Promise<Buffer> {
    const path = this.resolvePath(storageKey);

    try {
      return await readFile(path);
    } catch {
      throw new Error(`attachment.storage.key.not.found: ${storageKey}`);
    }
  }

  async remove(storageKey: string): Promise<void> {
    const path = this.resolvePath(storageKey);
    await rm(path, { force: true });
  }

  private resolvePath(storageKey: string): string {
    if (
      !storageKey ||
      storageKey.includes('..') ||
      storageKey.includes('/') ||
      storageKey.includes('\\')
    ) {
      throw new Error('attachment.storage.key.invalid');
    }

    const resolved = normalize(join(UPLOADS_DIR, storageKey));

    if (!resolved.startsWith(UPLOADS_DIR + sep) && resolved !== UPLOADS_DIR) {
      throw new Error('attachment.storage.key.invalid');
    }

    return resolved;
  }

  private ensureUploadsDir(): void {
    if (!existsSync(UPLOADS_DIR)) {
      mkdirSync(UPLOADS_DIR, { recursive: true });
    }
  }
}
