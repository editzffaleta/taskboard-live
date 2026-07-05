# atividade Specification

## Purpose
TBD - created by archiving change 011-atividade-do-quadro. Update Purpose after archive.
## Requirements
### Requirement: Registro persistente de atividade do quadro

O sistema SHALL persistir cada mutação relevante de um quadro (criação de lista, criação/
movimentação/exclusão de cartão, adição de membro) como uma `Activity` associada ao `boardId` e
ao `actorId` que a originou.

#### Scenario: Mutação relevante gera uma Activity

- **WHEN** um membro cria uma lista, cria/move/exclui um cartão, ou adiciona um novo membro ao
  quadro
- **THEN** uma `Activity` é persistida com `boardId`, `actorId`, `type` correspondente à ação e
  `data` com o payload mínimo daquela ação
- **AND** a falha ao gravar a `Activity` não impede a resposta de sucesso da mutação original

### Requirement: Emissão em tempo real da atividade registrada

O sistema SHALL emitir o evento `activity.created` via `RealtimeEmitter` para a sala do quadro
imediatamente após persistir cada `Activity`.

#### Scenario: Membro conectado recebe a atividade ao vivo

- **WHEN** uma `Activity` é registrada para um quadro
- **THEN** todos os sockets conectados à sala `board:{boardId}` recebem o evento
  `activity.created` com os dados da atividade recém-criada

### Requirement: Consulta paginada de atividade restrita a membros

O sistema SHALL expor um endpoint que retorna o histórico de atividade de um quadro, paginado e
ordenado do mais recente para o mais antigo, acessível apenas a membros do quadro.

#### Scenario: Membro consulta o histórico de atividade

- **WHEN** um membro do quadro chama `GET /boards/:boardId/activity`
- **THEN** recebe uma página de atividades ordenadas por `createdAt` decrescente
- **AND** um usuário que não é membro do quadro recebe erro de acesso negado
- **AND** um `boardId` inexistente resulta em erro de não encontrado

### Requirement: Painel de atividade no frontend

O frontend SHALL exibir, na página do quadro, um painel lateral que carrega o histórico de
atividade via REST e recebe novas entradas em tempo real via `activity.created`, com rótulos
i18n legíveis.

#### Scenario: Painel exibe histórico e atualiza ao vivo

- **WHEN** a página do quadro é aberta
- **THEN** o painel lateral carrega o histórico de atividade via `GET /boards/:boardId/activity`
- **AND** ao ocorrer uma nova atividade no quadro, o painel insere a nova entrada sem recarregar
  a página, sem duplicar entradas já exibidas
- **AND** cada entrada é renderizada com um rótulo legível em português ou inglês, com um rótulo
  de fallback para tipos de atividade não mapeados

### Requirement: Escopo restrito ao registro e consulta de atividade

Esta mudança SHALL entregar apenas o agregado `activity`, sua integração de gancho nos
controllers existentes e o painel de consulta, e MUST NOT alterar o comportamento funcional dos
casos de uso de listas, cartões ou membros.

#### Scenario: Nenhuma regra de negócio de outros agregados é alterada

- **WHEN** o agregado `activity` é entregue
- **THEN** os casos de uso de `list`, `card` e `member` continuam se comportando exatamente como
  antes desta mudança
- **AND** a única alteração nos controllers desses agregados é a chamada adicional a
  `ActivityRecorder.record` após a emissão do evento de domínio já existente

