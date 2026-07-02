# Template / exemplo de Mapa de Contexto

> Preencha por projeto. Exemplo ilustrativo de uma plataforma corporativa.

## Subdominios
| Subdominio | Tipo | Justificativa |
|---|---|---|
| Treinamento & Conformidade | core | diferencial do produto |
| Cofre de Credenciais | supporting | necessario, sem diferencial |
| Autenticacao / Identidade | generic | resolvido por padrao (JWT/MFA) |
| Notificacao por e-mail | generic | terceiro (provedor de e-mail) |

## Bounded Contexts
| Contexto | Responsabilidade | Modulo sugerido |
|---|---|---|
| Identity | login, sessao, MFA | `modules/identity` |
| Training | trilhas, conteudo, progresso | `modules/training` |
| Vault | segredos cifrados, acesso | `modules/vault` |

## Linguagem Ubiqua (por contexto)
- **Training:** Trilha, Modulo de Conteudo, Progresso, Conclusao.
- **Vault:** Segredo, Cofre, Concessao de Acesso, Rotacao.

## Mapa de relacionamentos
- Training (downstream) -> Identity (upstream): **Customer-Supplier** + **ACL**
  (Training traduz o usuario de Identity para o seu proprio conceito de Aluno).
- Vault (downstream) -> Identity (upstream): **Conformist** (usa o usuario como vem).
- Notificacao: **Published Language** (eventos de dominio) consumidos por um
  contexto generico de e-mail.

## Pontos de integracao que exigem ACL
- Fronteira Training <-> Identity: traduzir `User` -> `Aluno`.

## Recomendacao final
- Comecar como modular monolito (`modules/identity`, `modules/training`, `modules/vault`).
- Eventos via Published Language para desacoplar notificacao.
- Reavaliar split em servico apenas se houver pressao real de escala/time.
