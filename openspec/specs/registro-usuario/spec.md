# registro-usuario Specification

## Purpose
TBD - created by archiving change 003-registro-usuario. Update Purpose after archive.
## Requirements
### Requirement: Modulo auth com agregado user

O sistema SHALL prover o modulo `auth` com o agregado `user`, contendo a entidade `user` validada
(apenas `name`, `email`, `password`) e o caso de uso `register-user` implementado e testado.

#### Scenario: Entidade user validada

- **WHEN** a entidade `user` e criada
- **THEN** `name`, `email` e `password` sao validados pelas regras de dominio (person name, email, hash pass)
- **AND** o `user` nao possui nenhum campo de organizacao, papel ou status

#### Scenario: register-user implementado e testado

- **WHEN** o caso de uso `register-user` e executado com dados validos
- **THEN** ele valida a entrada, valida a unicidade global do e-mail, criptografa a senha, cria o
  `user` e persiste
- **AND** esta coberto por testes unitarios, incluindo e-mail duplicado

### Requirement: Persistencia do user no Prisma

O sistema SHALL sincronizar o model `user` no Prisma, com e-mail unico global, com a migration
aplicada.

#### Scenario: Model user disponivel no banco

- **WHEN** a sincronizacao do modulo `auth` com o Prisma e executada
- **THEN** existe o model `user` com `name`, `email` (indice unico) e `password`
- **AND** a migration correspondente foi aplicada

### Requirement: Endpoint de cadastro de usuario

O backend SHALL expor `POST /auth/register`, que registra um usuario com a senha criptografada via
bcrypt.

#### Scenario: Cadastro com dados validos

- **WHEN** uma requisicao `POST /auth/register` e enviada com `{ name, email, password }` validos
- **THEN** o usuario e persistido com a senha criptografada via bcrypt
- **AND** a resposta e `201` sem corpo

#### Scenario: E-mail ja cadastrado

- **WHEN** uma requisicao `POST /auth/register` usa um e-mail ja existente
- **THEN** o registro e rejeitado com erro de e-mail duplicado (409)

#### Scenario: Senha fraca ou dados invalidos

- **WHEN** uma requisicao `POST /auth/register` e enviada com senha fraca ou dados invalidos
- **THEN** o registro e rejeitado com erro de validacao (422)
- **AND** o corpo de erro segue `ApiErrorResponse` com `errors[]` de chaves i18n

### Requirement: Testes de integracao HTTP do registro

O sistema SHALL prover testes de integracao em `auth.integration.http` que executam com sucesso
cobrindo o fluxo de registro.

#### Scenario: Testes de integracao executam

- **WHEN** os testes de `auth.integration.http` sao executados
- **THEN** o fluxo de registro (sucesso, e-mail duplicado e dados invalidos) e coberto e passa

### Requirement: Mapeamento de erros no i18n

Todos os codigos de erro de `POST /auth/register` SHALL estar mapeados no i18n em portugues e ingles.

#### Scenario: Chaves de erro presentes em pt e en

- **WHEN** um codigo de erro e retornado por `POST /auth/register` no campo `errors[]`
- **THEN** existe a chave correspondente em `messages.pt.ts` e `messages.en.ts`
- **AND** cada item de `errors[]` gera um toaster individual no frontend

### Requirement: Tela /join com cadastro integrado e login visual

A rota `/join` SHALL exibir a alternancia entre cadastro e login, com o cadastro integrado ao
backend e o login apenas com estrutura visual.

#### Scenario: Alternancia entre cadastro e login

- **WHEN** o usuario acessa `/join` e usa o botao/link de troca
- **THEN** a tela alterna entre o formulario de cadastro (`register`) e o de login (`login`),
  seguindo o tema da `002`

#### Scenario: Cadastro integrado exibe toasters sem redirecionar

- **WHEN** o usuario submete o formulario de cadastro
- **THEN** em sucesso (201) e exibido um `toast.success` de confirmacao
- **AND** em erro, cada item de `errors[]` gera um `toast.error(getMessage(code))` individual
- **AND** em nenhum caso ha redirecionamento

#### Scenario: Login apenas visual

- **WHEN** o usuario visualiza o formulario de login
- **THEN** existem os campos `email` e `password` com botao de submissao
- **AND** nao ha integracao funcional com o backend nesta mudanca

### Requirement: Escopo restrito a usuario simples

Esta mudanca SHALL entregar um agregado `user` sem organizacao, papel global ou status, e MUST NOT
introduzir qualquer conceito de multi-tenancy.

#### Scenario: Nenhum campo de tenant e criado

- **WHEN** o agregado `user` e entregue
- **THEN** ele contem apenas `id`, `name`, `email`, `password`
- **AND** nenhuma organizacao, papel global ou status de usuario e introduzido

### Requirement: Build sem erros

O projeto SHALL permanecer sem erros de TypeScript ou de build apos as alteracoes.

#### Scenario: Verificacao de build

- **WHEN** o typecheck/build e executado em `apps/backend` e `apps/frontend`
- **THEN** nao ha erros de TypeScript nem de build

