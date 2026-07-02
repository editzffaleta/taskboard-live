// Exemplo de decorator de metadata de papeis. Ajuste paths/naming aos do projeto.
import { SetMetadata } from "@nestjs/common";

export type AppRole = "admin" | "member" | "viewer";

export const ROLES_KEY = "roles";

/** Marca a rota/controller com os papeis aceitos. Sem este decorator, a rota e
 *  apenas autenticada (nao publica). */
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

// (opcional) permissoes granulares
export type AppPermission = `${string}:${"read" | "write" | "delete"}`;
export const PERMISSIONS_KEY = "permissions";
export const Permissions = (...perms: AppPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);
