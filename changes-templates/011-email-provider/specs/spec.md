<!-- TEMPLATE — delta da capability email-transacional. Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Port de e-mail com drivers console e SMTP

O modulo `auth` SHALL prover o port `mail.provider` com drivers `console` (default, dev) e
`smtp` (producao, agnostico de vendor), selecionados por env.

#### Scenario: Driver console em desenvolvimento

- **WHEN** `MAIL_DRIVER` e `console` (ou ausente) e um envio ocorre
- **THEN** o e-mail e logado formatado (destinatario, assunto, links) sem envio real

#### Scenario: Driver SMTP em producao

- **WHEN** `MAIL_DRIVER=smtp` com `MAIL_HOST/PORT/USER/PASS/FROM` validos
- **THEN** o envio ocorre via SMTP com timeout curto
- **AND** as credenciais vem de env (nunca versionadas)

### Requirement: Integracao tolerante a falha nos fluxos presentes

O envio SHALL ser um efeito colateral tolerante a falha dos fluxos de convite (`008c`) e
recuperacao/primeiro acesso (`009c`), quando essas changes estiverem aplicadas.

#### Scenario: Convite com e-mail (008c aplicada)

- **WHEN** `invite-user` cria um convite
- **THEN** o link A6 e enviado ao e-mail convidado via driver ativo
- **AND** falha no envio e logada sem invalidar o convite nem esconder o link

#### Scenario: Recuperacao com e-mail (009c aplicada)

- **WHEN** `request-password-reset` cria um token
- **THEN** o link A4 e enviado mantendo a resposta neutra do endpoint
- **AND** o link de primeiro acesso (A5) pode ser enviado na criacao de conta pelo admin

### Requirement: Build, testes e configuracao

O projeto SHALL permanecer sem erros de TypeScript/build, com os envios testados via fake do
provider e as envs documentadas.

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes sao executados
- **THEN** nao ha erros e os testes passam
- **AND** o `.env.example` documenta `MAIL_DRIVER/HOST/PORT/USER/PASS/FROM` sem valores reais
