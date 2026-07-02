# Checklist OWASP aplicado ao stack (Web + API)

> Marque cada item contra o codigo real. Severidade = impacto x explorabilidade.

## OWASP Top 10 (Web)
- [ ] **A01 Broken Access Control:** rota protegida pelo guard certo? caso de uso
      verifica **propriedade** do recurso (evita IDOR)? sem rota privada exposta?
- [ ] **A02 Cryptographic Failures:** senha com hash forte? segredo fora do codigo?
      TLS/at-rest onde necessario? sem algoritmo fraco?
- [ ] **A03 Injection:** Prisma parametrizado (sem `$queryRawUnsafe`/interpolacao)?
      entrada validada antes do banco? sem command injection?
- [ ] **A04 Insecure Design:** fluxo sensivel tem limites/abuso previsto? (ver
      `security-threat-model`).
- [ ] **A05 Security Misconfiguration:** CORS restrito? erro nao verboso em prod?
      headers de seguranca? sem credencial default?
- [ ] **A06 Vulnerable Components:** `npm audit` limpo? versoes suportadas?
- [ ] **A07 Identification & Auth Failures:** rate limit no login? politica de senha?
      sessao/token tratados com seguranca (sem log/URL)?
- [ ] **A08 Software & Data Integrity:** dependencia/origem confiavel? sem desserial.
      insegura?
- [ ] **A09 Logging & Monitoring:** login falho, negacao de acesso e erro critico
      sao registrados (sem vazar dado sensivel)?
- [ ] **A10 SSRF:** requisicao de saida com URL do usuario tem allowlist?

## OWASP API Security Top 10
- [ ] **API1 BOLA:** autorizacao por objeto (o id pertence ao usuario do token)?
- [ ] **API2 Broken Authentication:** mesmos pontos de auth acima, no nivel de API.
- [ ] **API3 Broken Object Property Level Authorization:** sem **mass assignment**
      (campos arbitrarios) e sem **excessive data exposure** (campos internos na resposta)?
- [ ] **API4 Unrestricted Resource Consumption:** paginacao/limite em listas?
      payload e taxa limitados?
- [ ] **API5 Broken Function Level Authorization:** acoes administrativas exigem papel?
- [ ] **API6 Unrestricted Access to Sensitive Business Flows:** fluxo sensivel
      protegido contra automacao/abuso?
- [ ] **API7 SSRF:** idem A10, no contexto de API.
- [ ] **API8 Security Misconfiguration:** idem A05.
- [ ] **API9 Improper Inventory Management:** endpoint versionado/documentado?
      sem rota debug/legada exposta?
- [ ] **API10 Unsafe Consumption of APIs:** resposta de terceiro validada antes de usar?

## Remediacao -> skill do catalogo
- Authz/papeis/ownership -> `backend-authorization`
- Validacao de entrada / regra -> `module-entity`, `module-value-object`, `shared-validation-rule`
- Design de fluxo sensivel -> `security-threat-model`
- Erro padronizado / saida -> padrao `ApiErrorResponse` do `backend-nest-config`
