# Execution Log

Histórico de execução das mudanças (uma linha por mudança): data, commit, observações.

| Mudança | Data | Commit | Observações |
| --- | --- | --- | --- |
| 001-base-do-projeto | 2026-07-05 | d511c2d (#6) | Base técnica: Prisma (DbModule/PrismaService, schema modular, seed neutro, docker-compose), pacote @taskboard/shared (96 testes), base Nest de erros+JWT; frontend shell (public)/(private), i18n pt/en, branding TaskBoard Live. Gate/CI verde. Frições do scaffold resolvidas (multer override, @repo→@taskboard, Next 16 lockfile, postinstall prisma generate, turbo ^build, semgrep pin/cooldown/.semgrepignore). Capability base-projeto (corrigido nome de pasta que nascera fundacao-e2e). |
| 002-design-system-shell | 2026-07-05 | #11 | Design system: paleta TaskBoard Live (azul #2563EB/#1D4ED8) claro/escuro, toggle de tema persistente, tipografia Inter/JetBrains Mono, shell (logo, sidebar Quadros/Conta, toaster theme-aware), i18n pt/en. Gate/CI verde. Capability design-system. |
| 003-registro-usuario | 2026-07-05 | #12 | Registro: módulo auth (agregado user name/email/password, single-tenant), bcrypt, register-user (unicidade global, 100% cobertura, 24 testes), model Prisma User + migration, POST /auth/register (201/409/422), i18n; tela /join (cadastro integrado, login visual). Fix: modules/auth passou a declarar @taskboard/shared (ordem topológica do turbo ^build). Gate/CI verde. Capability registro-usuario. |
| 004-login-sessao | 2026-07-05 | #13 | Login/sessão: login-user (401 credenciais inválidas, 100% cobertura, 30 testes), jwt.util { sub, name, email }, POST /auth/login → { token, user }; frontend AuthContext/AuthGuard, decodeJwtPayload UTF-8, cookie auth_token, proteção de (private), redirects, logout. Validado por Playwright. Gate/CI verde. Capability login-sessao. |
