<!-- TEMPLATE — delta da capability protecao-http. Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Headers, CORS e payload

O backend SHALL aplicar headers de seguranca (helmet), CORS de origem unica por env com
credenciais e limite de payload JSON.

#### Scenario: Envelope seguro

- **WHEN** qualquer resposta HTTP e emitida
- **THEN** os headers de seguranca estao presentes
- **AND** apenas a origem de `CORS_ORIGIN` e aceita, e body acima do limite recebe 413

#### Scenario: Producao sem CORS_ORIGIN nao sobe

- **WHEN** `NODE_ENV=production` e `CORS_ORIGIN` esta ausente
- **THEN** o boot falha com erro claro (fail-fast), sem abrir `*`

### Requirement: Rate limiting global e estrito

O backend SHALL limitar requisicoes por IP com um teto global folgado e limites estritos nas
rotas publicas de autenticacao presentes no projeto, respondendo `429` com mensagem i18n.

#### Scenario: Forca bruta no login barrada

- **WHEN** um IP excede o limite estrito em `POST /auth/login` (e nas demais rotas de auth
  presentes: `/join`; `/auth/login/mfa` se `009b`; `forgot`/`reset` se `009c`; aceite A6 se `008c`)
- **THEN** as tentativas seguintes recebem `429` ate a janela expirar

#### Scenario: Uso legitimo nao afetado

- **WHEN** o trafego normal do frontend ocorre dentro do teto global
- **THEN** nenhuma requisicao legitima recebe 429

### Requirement: Build, testes e configuracao

O projeto SHALL permanecer sem erros de TypeScript/build, com os limites testados em janela curta
e as envs documentadas.

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes sao executados
- **THEN** nao ha erros e os testes passam
- **AND** `.env.example` documenta `CORS_ORIGIN` e os limites de throttle
