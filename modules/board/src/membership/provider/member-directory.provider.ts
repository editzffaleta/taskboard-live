/**
 * Porta minima para resolver dados basicos de usuario a partir do modulo
 * `auth` sem que o pacote `@taskboard/board` passe a depender de
 * `@taskboard/auth` (regra de dependencia da Clean Architecture — cada
 * modulo de negocio expoe apenas as portas que consome). Implementada no
 * `apps/backend` por um adapter que delega ao `UserRepository` do modulo
 * `auth` (decisao registrada na evidencia da task 1.1 da change 010).
 */
export interface MemberDirectoryUser {
  id: string;
  name: string;
  email: string;
}

export interface MemberDirectory {
  findByEmail(email: string): Promise<MemberDirectoryUser | null>;
  findById(id: string): Promise<MemberDirectoryUser | null>;
}
