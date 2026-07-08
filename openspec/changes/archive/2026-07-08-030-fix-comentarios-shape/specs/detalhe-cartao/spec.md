## ADDED Requirements

### Requirement: Leitura da lista de comentários do cartão

O cliente SHALL consumir a lista de comentários no formato retornado pelo backend
(`{ comments, total, page, pageSize }`), exibindo o detalhe do cartão sem erro.

#### Scenario: abrir o detalhe de um cartão lista os comentários

- **WHEN** o usuário abre o detalhe de um cartão
- **THEN** a lista de comentários é lida do campo `comments` da resposta
- **AND** o detalhe do cartão renderiza sem estourar o error boundary
