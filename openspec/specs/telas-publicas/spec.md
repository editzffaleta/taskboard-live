# telas-publicas Specification

## Purpose
TBD - created by archiving change 014-telas-publicas. Update Purpose after archive.
## Requirements
### Requirement: Landing pública fiel ao mockup e sem chamada de API

O frontend SHALL expor uma landing pública em `/` reproduzindo a estrutura de
`mockups/Landing.dc.html` (header com CTA "Entrar", hero "Veja os cartões se moverem ao vivo",
prévia de quadro ilustrativa, grid de 4 recursos — tempo real, colaboração, presença, atividade —
e CTA final), usando os tokens do design system (`002`). A landing MUST NOT chamar nenhum
endpoint de quadros/usuário — a prévia de quadro é estática/decorativa.

#### Scenario: Visitante deslogado vê a landing

- **WHEN** um usuário sem sessão ativa acessa `/`
- **THEN** a landing é renderizada com hero, os 4 recursos e o CTA final
- **AND** todos os CTAs ("Começar grátis", "Criar meu quadro grátis", nav "Entrar") levam a `/join`

#### Scenario: Usuário autenticado é redirecionado

- **WHEN** um usuário com sessão ativa (`AuthContext` em `authenticated`) acessa `/`
- **THEN** é redirecionado para `/boards` sem renderizar a landing
- **AND** enquanto o contexto ainda está `loading`, nenhum flash de landing ou de dashboard ocorre

### Requirement: Tela Entrar reestilizada preservando a integração real

A tela `/join` SHALL adotar o layout de `mockups/Entrar.dc.html` (alternância entre registro e
login em um único cartão), preservando integralmente a integração já existente: `POST
/auth/register`, `POST /auth/login`, gravação de sessão via `AuthContext` e toasts de erro via
`getMessage`.

#### Scenario: Registro continua funcional com o novo visual

- **WHEN** um visitante preenche o formulário de registro no novo layout e envia dados válidos
- **THEN** `POST /auth/register` é chamado e o comportamento de sucesso/erro é idêntico ao
  existente antes da reestilização

#### Scenario: Login continua funcional com o novo visual

- **WHEN** um visitante preenche o formulário de login no novo layout e envia credenciais válidas
- **THEN** `POST /auth/login` é chamado, a sessão é gravada via `AuthContext` e o usuário é
  redirecionado para `/boards`

#### Scenario: Seletores de teste preservados

- **WHEN** os testes e2e da fundação (`013`) executam contra a tela `/join` reestilizada
- **THEN** os `data-testid` existentes (`register-form`, `login-form`, `join-toggle-mode`, entre
  outros) continuam presentes e funcionais

### Requirement: Estados de sistema (404, erro, skeleton) refletem o mockup

O frontend SHALL prover uma tela de 404 e uma tela de erro de rota reproduzindo o cartão central
de `mockups/Estados de Sistema.dc.html` (ícone, título, descrição, ação), e SHALL substituir
indicadores textuais de carregamento por skeletons visuais equivalentes ao mockup no dashboard de
quadros e na visualização de um quadro.

#### Scenario: Rota inexistente mostra 404 estilizado

- **WHEN** o usuário acessa uma rota inexistente do grupo privado
- **THEN** a tela "Página não encontrada" é renderizada com ação "Voltar aos quadros" para `/boards`

#### Scenario: Erro de renderização mostra tela de erro com opção de retry

- **WHEN** ocorre um erro não tratado na renderização de uma rota do grupo privado
- **THEN** a tela "Algo deu errado" é renderizada
- **AND** o botão "Tentar novamente" chama `reset()` do error boundary do Next.js

#### Scenario: Carregamento do dashboard usa skeleton

- **WHEN** o dashboard de quadros está buscando os dados do usuário
- **THEN** cards-esqueleto são exibidos no lugar de texto de carregamento puro

### Requirement: Indicador de reconexão do Socket.IO

O hook `useBoardSocket` SHALL expor um estado `reconnecting: boolean`, verdadeiro quando o socket
já conectou ao menos uma vez e em seguida foi desconectado (aguardando reconexão automática), e o
frontend SHALL exibir um banner reproduzindo o indicador "Reconectando… tentativa N" de
`mockups/Estados de Sistema.dc.html` enquanto esse estado for verdadeiro, usando o número de
tentativa nativo do `socket.io-client`.

#### Scenario: Queda de conexão aciona o banner de reconexão

- **WHEN** a conexão com o backend cai enquanto um quadro está aberto e já esteve conectado
- **THEN** `useBoardSocket` reporta `reconnecting: true`
- **AND** o banner "Reconectando… tentativa N" é exibido com o número real de tentativa

#### Scenario: Reconexão bem-sucedida remove o banner

- **WHEN** o socket reconecta com sucesso após uma queda
- **THEN** `reconnecting` volta a `false` e o banner desaparece

### Requirement: Onboarding guiado de primeiro acesso com ações reais

O frontend SHALL exibir um onboarding guiado de 3 passos (criar primeiro quadro, convidar
alguém, arrastar um cartão), reproduzindo a estrutura de `mockups/Onboarding.dc.html`, quando um
usuário autenticado não possuir nenhum quadro. O passo de criação de quadro SHALL usar uma
chamada real de criação de quadro (nenhum quadro fictício/mockado).

#### Scenario: Usuário sem quadros vê o onboarding

- **WHEN** um usuário autenticado acessa `/boards` e não possui nenhum quadro
- **THEN** o onboarding de 3 passos é exibido no lugar do estado vazio padrão

#### Scenario: Passo 1 cria um quadro real

- **WHEN** o usuário informa um nome de quadro no passo 1 e avança
- **THEN** um quadro é criado de verdade via API
- **AND** esse quadro passa a existir na lista de quadros do usuário

#### Scenario: Concluir o onboarding navega para o quadro criado

- **WHEN** o usuário conclui o último passo do onboarding
- **THEN** é redirecionado para a página do quadro recém-criado (`/boards/{id}`)

#### Scenario: Pular introdução não cria quadro

- **WHEN** o usuário clica em "Pular introdução"
- **THEN** nenhum quadro é criado
- **AND** o estado vazio padrão do dashboard é exibido

#### Scenario: Usuário com quadros nunca vê o onboarding

- **WHEN** um usuário autenticado possui ao menos um quadro
- **THEN** o dashboard exibe a lista normal de quadros, sem o onboarding

### Requirement: Ausência de dado fake no código final

O código de produção das telas públicas MUST NOT conter dado de exemplo (lorem ipsum, nomes ou
valores fixos copiados literalmente dos mockups) fora de elementos comprovadamente decorativos e
documentados como tal (ex.: prévia estática da landing).

#### Scenario: Verificação de ausência de dado fake

- **WHEN** o código de `apps/frontend/src/app` e dos componentes desta change é inspecionado
- **THEN** nenhum valor como nome de quadro fixo, e-mail de exemplo ou texto lorem aparece como
  dado dinâmico (props/estado) de um componente que deveria refletir dado real

