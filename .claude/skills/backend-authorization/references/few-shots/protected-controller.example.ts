// Exemplo de uso. A ordem dos guards garante: autentica -> autoriza.
// (Se o AuthGuard for global via APP_GUARD, basta o @Roles + RolesGuard.)
import { Controller, Get, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Roles } from "../shared/auth/roles.decorator";
import { RolesGuard } from "../shared/auth/roles.guard";

@Controller("reports")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class ReportsController {
  // apenas autenticado (sem @Roles): qualquer usuario logado
  @Get("me")
  myReports() {
    return { ok: true };
  }

  // autorizado: precisa do papel admin OU member
  @Get("all")
  @Roles("admin", "member")
  allReports() {
    return { ok: true };
  }
}
