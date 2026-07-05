const DEFAULT_DEV_ORIGIN = 'http://localhost:3000';

export class CorsOriginNotConfiguredError extends Error {
  constructor() {
    super(
      'CORS_ORIGIN é obrigatória quando NODE_ENV=production. Configure a URL do frontend antes de subir o servidor.',
    );
    this.name = 'CorsOriginNotConfiguredError';
  }
}

/**
 * Resolve a origem única de CORS (HTTP e gateway Socket.IO) a partir da env `CORS_ORIGIN`.
 * Em produção (`NODE_ENV=production`) sem a env definida, falha rápido (fail-fast) em vez de
 * abrir para qualquer origem. Fora de produção, cai para o default de desenvolvimento.
 */
export function resolveCorsOrigin(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const corsOrigin = env.CORS_ORIGIN?.trim();

  if (corsOrigin) {
    return corsOrigin;
  }

  if (env.NODE_ENV === 'production') {
    throw new CorsOriginNotConfiguredError();
  }

  return DEFAULT_DEV_ORIGIN;
}
