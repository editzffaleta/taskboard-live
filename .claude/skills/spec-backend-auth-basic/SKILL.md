---
name: spec-backend-auth-basic
description: Orquestra a criacao da base de autenticacao do backend, incluindo modulo de dominio, agregados, entidades, repositorios, casos de uso, persistencia, autenticacao JWT e integracao com o NestJS, reaproveitando as skills especializadas do projeto.
compatibility: claude-code, opencode
---

# Spec Backend Auth Basic

Esta skill e uma orquestradora. Ela existe para conduzir, de forma deterministica, a criacao ou evolucao da base de autenticacao do backend e do banco de dados sem reimplementar o trabalho detalhado das skills especializadas do catalogo.

O foco desta primeira versao e somente:

- backend
- dominio
- persistencia
- banco de dados
- autenticacao JWT
- infraestrutura compartilhada do NestJS para rotas autenticadas

Nao incluir frontend por padrao.

## Objetivo

Construir a base de autenticacao do backend da aplicacao de forma orientada por especificacao, coordenando uma sequencia previsivel de skills menores para entregar:

- modulo de autenticacao criado ou evoluido
- agregado principal de usuario
- entidade de usuario
- contrato de repositorio de usuario
- casos de uso de registro e login
- persistencia Prisma
- provider de criptografia
- provider de JWT
- controllers de autenticacao
- infraestrutura compartilhada do NestJS para proteger endpoints

## Natureza da skill

- Esta skill delega para skills especializadas.
- Esta skill nao deve duplicar os workflows detalhados das skills filhas.
- Esta skill deve verificar o resultado de cada etapa antes de avancar.
- Esta skill deve parar de forma explicita quando faltar uma skill critica do catalogo local.
- Esta skill deve respeitar a estrutura real do repositorio e evoluir implementacoes existentes antes de recriar do zero.

## Entradas obrigatorias

Antes de executar a orquestracao, confirme que estas entradas estao claras:

1. nome do modulo de autenticacao, quando nao for simplesmente `auth`
2. nome do agregado principal de usuario
3. nome da entidade principal
4. especificacao minima dos atributos do usuario
5. confirmacao de que o fluxo inclui, no minimo:
   - cadastro
   - login

## Entradas opcionais

Se o usuario informar, incorporar tambem:

- nome dos casos de uso
- nome dos endpoints
- estrutura do payload JWT
- campos de login
- regras adicionais de autenticacao
- se deve usar e-mail como login
- se deve usar username, telefone ou outro identificador
- campos obrigatorios de cadastro
- regras especificas de senha
- claims desejadas no JWT
- tempo de expiracao do token
- se deve haver refresh token nesta primeira versao
- nomes especificos de arquivos, classes ou rotas

## Escopo minimo obrigatorio

Esta skill so esta completa quando a cadeia final contem, no minimo:

1. endpoint de registro de usuario
2. endpoint de login
3. persistencia do usuario
4. senha protegida por provider tecnico apropriado
5. geracao de JWT
6. estrutura para proteger endpoints autenticados
7. acesso ao usuario autenticado via decorator compartilhado
8. tratamento centralizado de erro respeitando `packages/shared`

## Limites

- Nao incluir frontend nesta versao.
- Nao tentar resolver refresh token, autorizacao por perfil, recuperacao de senha ou confirmacao por e-mail, salvo pedido explicito.
- O objetivo padrao e autenticacao basica, solida e extensivel.
- Se o usuario pedir extensoes, mante-las incrementais e simples.

## Validacao obrigatoria do catalogo e leituras minimas

Antes de orquestrar: validar cada item do catalogo de skills exigido e fazer as leituras
minimas de contexto. Checklist completo (item a item, com o que verificar em cada skill e
quais arquivos ler): [references/orquestracao-detalhada.md](references/orquestracao-detalhada.md).
Falhou qualquer item do catalogo → **parar** e reportar; nao improvisar substitutos.

## Regras de coerencia de nomes

Durante todo o fluxo:

- manter consistencia entre nome do modulo, agregado, entidade, repositorio, casos de uso, providers, payload JWT e controllers
- preferir nomes simples e previsiveis
- reaproveitar o naming ja existente no repositorio quando houver implementacao parcial
- evitar criar uma arquitetura paralela ao padrao atual do projeto

## Regra especial sobre o modulo

Esta skill deve preferir evoluir o modulo existente antes de criar um novo scaffold.

Fluxo:

1. se `modules/<modulo>` e `apps/backend/src/modules/<modulo>` ja existirem, evoluir a estrutura atual
2. se o modulo nao existir:
   - tentar usar `config-new-module`
   - se o catalogo atual so oferecer scaffold que toca frontend, trate isso como efeito colateral tolerado do bootstrap inicial
   - nao expandir, nao evoluir e nao considerar o frontend como parte da entrega desta skill
3. se o scaffold disponivel nao permitir criar o minimo necessario para seguir com seguranca, parar e reportar a limitacao do catalogo

## Sequencia deterministica de orquestracao

A implementacao segue uma sequencia FIXA de etapas (crypto.provider → agregado user →
entidade → contrato/repos → register-user → login-user → Prisma → controller → i18n →
verificacao), cada uma com skill designada, insumos e criterio de pronto. A sequencia
integral, etapa por etapa, esta em
[references/orquestracao-detalhada.md](references/orquestracao-detalhada.md) — executa-la
**na ordem, sem pular nem paralelizar**.

## Regras de orquestracao

- delegar para a skill especializada em vez de repetir suas instrucoes detalhadas
- sempre passar para a skill filha o resultado concreto da etapa anterior
- verificar arquivos e testes gerados em cada etapa antes de seguir
- preferir estruturas simples e faceis de manter
- manter o fluxo incremental e reversivel
- respeitar o padrao atual do projeto e o contexto real do repositorio

## Regras especificas para autenticacao basica

Na ausencia de instrucao mais forte do usuario, adote defaults simples:

- login por e-mail quando o identificador nao for informado
- senha armazenada apenas em formato protegido por provider tecnico
- JWT com claims minimas e estaveis, como `sub` e identificador principal de login, quando isso for compativel com o projeto
- expiracao simples e configuravel do token
- sem refresh token nesta primeira versao

Se o usuario informar outro identificador principal, adapte todas as etapas para manter coerencia entre entidade, repositorio, caso de uso, persistencia e controller.

## Regras de teste e validacao final

Cobertura minima, fakes e validacao final detalhadas em
[references/orquestracao-detalhada.md](references/orquestracao-detalhada.md); o gate da
skill so fecha com `npx tsc --noEmit` limpo e a suite do modulo verde.

## Condicoes de parada obrigatoria

Pare e reporte com clareza quando ocorrer qualquer um destes casos:

- falta de skill obrigatoria do catalogo
- ambiguidade real sobre modulo, agregado, entidade ou provider alvo
- conflito serio entre a especificacao do usuario e a estrutura atual do repositorio
- impossibilidade de montar o fluxo minimo de autenticacao sem improvisar arquitetura paralela
- falha em testes obrigatorios ou build final

## Formato do relatorio final

Modelo do relatorio (secoes e campos) em
[references/orquestracao-detalhada.md](references/orquestracao-detalhada.md).

## Saida esperada

1. modulo de autenticacao funcional no backend
2. estrutura de dominio criada ou atualizada
3. persistencia integrada ao Prisma
4. providers tecnicos implementados
5. configuracao Nest compartilhada aplicada
6. controllers principais da autenticacao criados
7. JWT integrado
8. base pronta para proteger endpoints autenticados de outros modulos

