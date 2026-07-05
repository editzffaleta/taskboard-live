## ADDED Requirements

### Requirement: Modulo board com agregados board e membership

O sistema SHALL prover o módulo `board` com os agregados `board` e `membership`, contendo as
entidades `Board` e `BoardMember` validadas e os casos de uso `create-board`, `rename-board`,
`delete-board`, `list-my-boards` e `get-board` implementados e testados.

#### Scenario: Entidades validadas

- **WHEN** a entidade `Board` é criada
- **THEN** `name` e `ownerId` são validados pelas regras de domínio
- **AND** a entidade `BoardMember` exige `boardId`, `userId` e `role` (apenas `owner` ou `member`)

#### Scenario: create-board cria o owner automaticamente

- **WHEN** o caso de uso `create-board` é executado com `{ name, ownerId }` válidos
- **THEN** um `Board` é criado e persistido
- **AND** na mesma transação um `BoardMember` com `role = 'owner'` é criado para `ownerId`
- **AND** ambos os registros são cobertos por teste unitário verificando a atomicidade

#### Scenario: rename-board e delete-board restritos ao owner

- **WHEN** o caso de uso `rename-board` ou `delete-board` é executado por um usuário que não é
  `owner` do quadro
- **THEN** a operação é rejeitada com erro de domínio (`board.owner.required`, 403)
- **AND** quando o quadro não existe, o erro é `board.not.found` (404)

#### Scenario: list-my-boards filtra por membership do usuário

- **WHEN** o caso de uso `list-my-boards` é executado para um usuário autenticado
- **THEN** apenas os quadros nos quais existe `BoardMember` para esse usuário são retornados

#### Scenario: get-board restrito a membros

- **WHEN** o caso de uso `get-board` é executado por um usuário sem `BoardMember` no quadro
- **THEN** a operação é rejeitada com erro `board.not.found` (404), sem confirmar a existência do
  quadro a não-membros

### Requirement: Persistencia de Board e BoardMember no Prisma

O sistema SHALL sincronizar os models `Board` e `BoardMember` no Prisma, com `BoardMember` possuindo
restrição única no par `(boardId, userId)`, com a migration aplicada.

#### Scenario: Models disponíveis no banco

- **WHEN** a sincronização do módulo `board` com o Prisma é executada
- **THEN** existem os models `Board` (com FK `ownerId` → usuário) e `BoardMember` (com FKs
  `boardId` → `Board` e `userId` → usuário, e `@@unique([boardId, userId])`)
- **AND** a migration correspondente foi aplicada

### Requirement: Endpoints autenticados de quadros

O backend SHALL expor os endpoints autenticados `POST /boards`, `GET /boards`, `GET /boards/:id`,
`PATCH /boards/:id` e `DELETE /boards/:id`, com autorização resolvida por `BoardMember`.

#### Scenario: Criação de quadro

- **WHEN** uma requisição `POST /boards` é enviada por um usuário autenticado com `{ name }` válido
- **THEN** o quadro é criado com o usuário autenticado como `owner`
- **AND** um `BoardMember` `role = 'owner'` é criado para o mesmo usuário

#### Scenario: Listagem restrita aos quadros do usuário

- **WHEN** uma requisição `GET /boards` é enviada por um usuário autenticado
- **THEN** a resposta contém apenas os quadros nos quais o usuário é membro

#### Scenario: Detalhe restrito a membros

- **WHEN** uma requisição `GET /boards/:id` é enviada por um usuário que não é membro do quadro
- **THEN** a resposta é `404`

#### Scenario: Renomear e excluir restritos ao owner

- **WHEN** uma requisição `PATCH /boards/:id` ou `DELETE /boards/:id` é enviada por um usuário que
  não é `owner` do quadro
- **THEN** a resposta é `403`

### Requirement: Mapeamento de erros no i18n

Todos os códigos de erro dos endpoints de `/boards` SHALL estar mapeados no i18n em português e
inglês.

#### Scenario: Chaves de erro presentes em pt e en

- **WHEN** um código de erro é retornado por qualquer endpoint de `/boards` no campo `errors[]`
- **THEN** existe a chave correspondente em `messages.pt.ts` e `messages.en.ts`

### Requirement: Dashboard com meus quadros e navegacao

O frontend SHALL prover, em `app/(private)`, um dashboard listando os quadros do usuário
autenticado, com criação de quadro e navegação para a rota `/boards/[id]`.

#### Scenario: Listagem e criação de quadro

- **WHEN** o usuário autenticado acessa o dashboard
- **THEN** os quadros dos quais ele é membro são listados como cards clicáveis
- **AND** existe um botão/modal para criar um novo quadro que, em sucesso, atualiza a listagem

#### Scenario: Navegação para o quadro

- **WHEN** o usuário clica em um card de quadro
- **THEN** ele é navegado para `/boards/[id]`, que exibe ao menos o nome do quadro como placeholder
- **AND** o conteúdo completo do quadro ao vivo (colunas, cartões, tempo real) não é implementado
  nesta mudança

### Requirement: Escopo restrito a quadros e membership do owner

Esta mudança SHALL entregar apenas o CRUD de quadros e o nascimento automático do `BoardMember`
owner, e MUST NOT implementar listas, cartões, tempo real ou convite de outros membros.

#### Scenario: Nenhum outro agregado é introduzido

- **WHEN** a mudança `005-quadros-crud` é entregue
- **THEN** nenhum model ou caso de uso de `List`, `Card` ou `Activity` é criado
- **AND** nenhuma integração de tempo real (Socket.IO) é introduzida
- **AND** nenhum fluxo de convite de membro além do owner automático é implementado
