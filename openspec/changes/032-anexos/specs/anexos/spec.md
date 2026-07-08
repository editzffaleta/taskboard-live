## ADDED Requirements

### Requirement: Upload de anexo em cartão

O sistema SHALL permitir que um membro do quadro faça upload de um arquivo como anexo de um
cartão, validando tamanho máximo (10MB) e mimetype/extensão contra uma allowlist, antes de
gravar qualquer conteúdo em disco ou persistir o metadado.

#### Scenario: Membro faz upload de um arquivo válido

- **WHEN** um membro autenticado envia `POST /boards/:boardId/cards/:cardId/attachments` com um
  arquivo `multipart/form-data` dentro do limite de tamanho e com mimetype na allowlist
- **THEN** o arquivo é salvo no armazenamento local via `StorageProvider`
- **AND** um `Attachment` é criado associado ao `cardId` e ao usuário autenticado como
  `uploadedBy`
- **AND** o evento `card.updated` é emitido para `board:{boardId}` com o cartão completo

#### Scenario: Upload rejeita arquivo acima do limite de tamanho

- **WHEN** um membro autenticado envia `POST .../attachments` com um arquivo maior que 10MB
- **THEN** a requisição é rejeitada
- **AND** nenhum conteúdo é gravado em disco
- **AND** nenhum `Attachment` é persistido
- **AND** nenhum evento de tempo real é emitido

#### Scenario: Upload rejeita mimetype ou extensão fora da allowlist

- **WHEN** um membro autenticado envia `POST .../attachments` com um arquivo cujo mimetype ou
  extensão não estão na allowlist definida (imagens png/jpg/gif/webp, pdf, txt, docx)
- **THEN** a requisição é rejeitada
- **AND** nenhum conteúdo é gravado em disco
- **AND** nenhum `Attachment` é persistido
- **AND** nenhum evento de tempo real é emitido

#### Scenario: Upload em cartão de outro quadro é rejeitado

- **WHEN** um membro autenticado envia `POST /boards/:boardId/cards/:cardId/attachments`
  referenciando um `cardId` que não pertence ao `boardId` da rota
- **THEN** a requisição é rejeitada
- **AND** nenhum arquivo é gravado nem persistido

### Requirement: Geração de `storageKey` sem depender do nome enviado pelo usuário

O sistema SHALL gerar o identificador de armazenamento (`storageKey`) de cada anexo de forma
independente do `filename` fornecido pelo cliente, para eliminar colisão de nomes e ataques de
path traversal por construção.

#### Scenario: `storageKey` nunca deriva do nome do arquivo do usuário

- **WHEN** um anexo é criado, inclusive com um `filename` contendo separadores de caminho
  (`../`, `/`, `\`) ou caracteres de controle
- **THEN** o `storageKey` usado para gravar e ler o arquivo no disco é gerado internamente
  (identificador único), nunca derivado diretamente do `filename` recebido
- **AND** o `filename` original é sanitizado antes de ser persistido/exibido, sem afetar o local
  físico do arquivo no armazenamento

### Requirement: Listagem de anexos de um cartão

O sistema SHALL permitir que membros do quadro listem os metadados dos anexos de um cartão, sem
expor o `storageKey` interno nem o conteúdo do arquivo.

#### Scenario: Membro lista os anexos de um cartão

- **WHEN** um membro autenticado envia `GET /boards/:boardId/cards/:cardId/attachments`
- **THEN** a resposta contém, para cada anexo, `id`, `filename`, `mimeType`, `size`, `createdAt`
  e `uploadedBy` (`id`, `name`)
- **AND** a resposta NÃO SHALL incluir `storageKey` nem o conteúdo binário do arquivo

#### Scenario: Não-membro é bloqueado ao listar anexos

- **WHEN** um usuário autenticado que não é `BoardMember` do quadro tenta listar os anexos de um
  cartão do quadro
- **THEN** a requisição é rejeitada

### Requirement: Download autenticado de anexo

O sistema SHALL servir o conteúdo de um anexo apenas através de um endpoint autenticado que
verifica membership do quadro, nunca como arquivo estático publicamente acessível.

#### Scenario: Membro baixa um anexo

- **WHEN** um membro autenticado envia
  `GET /boards/:boardId/cards/:cardId/attachments/:id/download` com um token JWT válido
- **THEN** a resposta contém o conteúdo binário do arquivo, com `Content-Type` igual ao
  `mimeType` registrado e `Content-Disposition: attachment` com o `filename` sanitizado
- **AND** o conteúdo devolvido é byte-a-byte idêntico ao arquivo originalmente enviado

#### Scenario: Download é negado para não-membro do quadro

- **WHEN** um usuário autenticado que não é `BoardMember` do quadro tenta baixar um anexo de um
  cartão do quadro
- **THEN** a requisição é rejeitada
- **AND** nenhum conteúdo do arquivo é retornado

#### Scenario: Download sem autenticação é negado

- **WHEN** uma requisição sem token JWT válido é enviada a
  `GET .../attachments/:id/download`
- **THEN** a requisição é rejeitada antes de qualquer leitura do arquivo em disco

#### Scenario: Anexo não é acessível por caminho estático público

- **WHEN** o backend é inspecionado quanto às rotas registradas
- **THEN** nenhuma rota expõe diretamente o diretório de armazenamento (`apps/backend/storage/
  uploads/`) como conteúdo estático público
- **AND** o único caminho de leitura de um anexo é o endpoint de download autenticado

### Requirement: Remoção de anexo restrita ao autor do upload ou ao owner do quadro

O sistema SHALL permitir a remoção de um anexo apenas pelo usuário que fez o upload ou pelo
`owner` do quadro, removendo o arquivo do armazenamento e o registro do banco.

#### Scenario: Autor do upload remove seu próprio anexo

- **WHEN** o usuário que fez o upload de um anexo envia
  `DELETE /boards/:boardId/cards/:cardId/attachments/:id`
- **THEN** o arquivo é removido do armazenamento local
- **AND** o registro `Attachment` é removido do banco
- **AND** o evento `card.updated` é emitido para `board:{boardId}` com o cartão completo

#### Scenario: Owner do quadro remove anexo de outro membro

- **WHEN** o `owner` do quadro (que não é o autor do upload) envia
  `DELETE .../attachments/:id`
- **THEN** o arquivo é removido do armazenamento local
- **AND** o registro `Attachment` é removido do banco
- **AND** o evento `card.updated` é emitido com o cartão completo

#### Scenario: Membro que não é autor nem owner não pode remover o anexo

- **WHEN** um membro autenticado do quadro, que não é o autor do upload nem o `owner` do quadro,
  envia `DELETE .../attachments/:id`
- **THEN** a requisição é rejeitada
- **AND** o arquivo permanece no armazenamento e no banco
- **AND** nenhum evento de tempo real é emitido

#### Scenario: Remoção de anexo de outro cartão é rejeitada

- **WHEN** um membro autenticado envia `DELETE .../attachments/:id` referenciando um `id` de
  anexo que não pertence ao `cardId` da rota
- **THEN** a requisição é rejeitada
- **AND** nenhuma remoção ocorre

### Requirement: Anexos removidos em cascata com o cartão

O sistema SHALL remover todos os anexos de um cartão (registro e arquivo em disco) quando o
cartão é excluído.

#### Scenario: Excluir um cartão remove seus anexos

- **WHEN** um cartão com um ou mais anexos é excluído
- **THEN** todos os registros `Attachment` associados a ele são removidos, sem erro de
  integridade referencial

### Requirement: Anexos fora do payload de cartão e do detalhe do quadro

O sistema SHALL manter a lista de anexos fora do `CardResponse` e do payload de
`GET /boards/:id`, disponível apenas sob demanda via
`GET /boards/:boardId/cards/:cardId/attachments`.

#### Scenario: Detalhe do quadro não inclui anexos

- **WHEN** um membro autenticado envia `GET /boards/:id`
- **THEN** nenhum cartão do payload inclui a lista de anexos
- **AND** os campos já existentes (`labels`, `dueDate`, `assignees`, `checklist`, etc.)
  permanecem presentes sem alteração

### Requirement: Armazenamento local em disco (escopo de desenvolvimento)

Esta mudança SHALL armazenar o conteúdo dos anexos em disco local, num diretório fora do
controle de versão, atrás da porta `StorageProvider`, e MUST NOT implementar integração com
object storage (S3, MinIO ou equivalente) nesta change.

#### Scenario: Diretório de armazenamento não é versionado

- **WHEN** um upload é realizado e o repositório é inspecionado
- **THEN** o arquivo gravado no diretório de armazenamento não aparece como alteração rastreável
  pelo git

#### Scenario: Nenhuma dependência de object storage é adicionada

- **WHEN** as dependências do backend são inspecionadas após esta change
- **THEN** nenhuma biblioteca de cliente de object storage (S3, MinIO ou equivalente) foi
  adicionada
