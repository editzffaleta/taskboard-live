// Exemplo de RolesGuard default-deny. Roda APOS o AuthGuard (usuario ja em request.user).
// Ajuste a fonte do usuario, o tipo do request e o erro ao padrao do projeto.
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AppRole, ROLES_KEY } from "./roles.decorator";

interface AuthenticatedUser {
  id: string;
  roles?: AppRole[];
}

@Injectable()
export class RolesGuard implements CanActivate {
  // papel "super" que ignora a checagem (opcional)
  private static readonly SUPER_ROLE: AppRole = "admin";

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Sem metadata de papel => rota apenas autenticada; RBAC nao se aplica.
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    // default-deny
    if (!user) throw new ForbiddenException("auth.forbidden");

    const userRoles = user.roles ?? [];
    if (userRoles.includes(RolesGuard.SUPER_ROLE)) return true;

    // combinacao padrao: exigir QUALQUER UM dos papeis
    const allowed = required.some((role) => userRoles.includes(role));
    if (!allowed) throw new ForbiddenException("auth.forbidden");

    return true;
  }
}
