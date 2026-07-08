import Cookies from 'js-cookie';

/** Mesmo nome usado pelo AuthContext (004). */
export const AUTH_TOKEN_COOKIE = 'auth_token';

let handling = false;

/**
 * Tratamento GLOBAL de 401 vindo da API: a sessão é inválida/expirada (ex.: token de
 * usuário removido — ver change 028). Limpa o cookie e manda para o login, evitando
 * mostrar o 401 como um toast de erro cru ("Sessão inválida"). Idempotente por navegação.
 */
export function handleUnauthorized(): void {
  if (typeof window === 'undefined') return;
  if (handling) return;
  handling = true;

  Cookies.remove(AUTH_TOKEN_COOKIE);

  const path = window.location.pathname;
  const isPublic =
    path === '/' || path.startsWith('/join') || path.startsWith('/convite');
  if (!isPublic) {
    window.location.href = '/join?expirada=1';
  } else {
    // Já estamos numa rota pública; permite novo tratamento em navegações futuras.
    handling = false;
  }
}
