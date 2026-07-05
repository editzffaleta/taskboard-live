import { CorsOriginNotConfiguredError, resolveCorsOrigin } from './cors.config';

describe('resolveCorsOrigin', () => {
  it('retorna a env CORS_ORIGIN quando definida', () => {
    const origin = resolveCorsOrigin({
      CORS_ORIGIN: 'https://taskboard.example.com',
    });

    expect(origin).toBe('https://taskboard.example.com');
  });

  it('cai para o default de desenvolvimento quando ausente e NODE_ENV != production', () => {
    const origin = resolveCorsOrigin({
      NODE_ENV: 'test',
    });

    expect(origin).toBe('http://localhost:3000');
  });

  it('falha rapido em producao sem CORS_ORIGIN', () => {
    expect(() => resolveCorsOrigin({ NODE_ENV: 'production' })).toThrow(
      CorsOriginNotConfiguredError,
    );
  });

  it('nao falha em producao quando CORS_ORIGIN esta definida', () => {
    const origin = resolveCorsOrigin({
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://taskboard.example.com',
    });

    expect(origin).toBe('https://taskboard.example.com');
  });
});
