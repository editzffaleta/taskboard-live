<!-- TEMPLATE — delta da capability armazenamento-de-arquivos. Placeholders: {{produto}}. -->

## ADDED Requirements

### Requirement: Upload validado com registro

O sistema SHALL receber uploads autenticados validando tamanho, mimetype (allowlist + magic
bytes) e sanitizacao, armazenando o blob sob chave UUID e registrando `stored-file` com dono e
organizacao.

#### Scenario: Upload valido

- **WHEN** um usuario autenticado envia um arquivo dentro do limite e da allowlist
- **THEN** o blob e gravado sob `storageKey` UUID e o registro e criado com dono/organizacao

#### Scenario: Upload invalido

- **WHEN** o arquivo excede `UPLOAD_MAX_MB` ou o conteudo real nao bate com a allowlist
- **THEN** a requisicao e rejeitada (413/422) sem gravar blob nem registro

### Requirement: Drivers local e S3 por env

O storage SHALL operar com driver `local` (diretorio persistente) ou `s3` (S3-compativel com URL
assinada), selecionado por `STORAGE_DRIVER`, sem mudanca de codigo.

#### Scenario: Troca de driver

- **WHEN** `STORAGE_DRIVER` muda entre `local` e `s3` com as envs do driver presentes
- **THEN** upload e download funcionam pelo driver ativo
- **AND** no `s3` o download responde redirect com URL assinada de vida curta

### Requirement: Acesso autorizado e escopado

O download e a exclusao SHALL ser permitidos apenas ao dono ou a admin da mesma organizacao.

#### Scenario: Escopo por organizacao

- **WHEN** um usuario de outra organizacao tenta `GET/DELETE /files/:id`
- **THEN** o acesso e negado

### Requirement: Build, testes e configuracao

O projeto SHALL permanecer sem erros de TypeScript/build, com validacao, drivers e autorizacao
testados e as envs documentadas.

#### Scenario: Verificacao

- **WHEN** o typecheck/build e os testes sao executados
- **THEN** nao ha erros e os testes passam
- **AND** `.env.example` documenta driver, limites e credenciais S3 vazias
