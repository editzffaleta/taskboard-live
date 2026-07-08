# sessao-invalida Specification

## Purpose
TBD - created by archiving change 028-sessao-invalida. Update Purpose after archive.
## Requirements
### Requirement: Rejeitar token de usuário inexistente

O backend do TaskBoard Live SHALL verificar, em toda requisição autenticada, que o usuário
identificado pela claim `sub` do JWT ainda existe, antes de permitir que a requisição alcance
qualquer controller ou caso de uso.

#### Scenario: Token de usuário inexistente

- **WHEN** uma requisição autenticada chega com um JWT assinado e não expirado cujo `sub` não
  corresponde a nenhum usuário existente
- **THEN** o backend responde `401 Unauthorized`
- **AND** nenhum caso de uso ou consulta que use esse `userId` como chave estrangeira é executado

#### Scenario: Token de usuário válido segue autenticando

- **WHEN** uma requisição autenticada chega com um JWT assinado, não expirado e cujo `sub`
  corresponde a um usuário existente
- **THEN** o backend autentica normalmente e a requisição segue para o controller/caso de uso

### Requirement: Conta excluída invalida a sessão

O backend SHALL tratar a exclusão de conta (`021`) como invalidação implícita de qualquer sessão
(JWT) emitida anteriormente para aquele usuário.

#### Scenario: Sessão de conta excluída deixa de autenticar

- **WHEN** um usuário exclui a própria conta e, em seguida, uma requisição chega usando um JWT
  emitido antes da exclusão
- **THEN** o backend responde `401 Unauthorized` na primeira requisição autenticada seguinte
- **AND** nenhuma operação que dependa desse `userId` (ex.: criar quadro) chega a executar e
  falhar com erro de integridade referencial (500)

### Requirement: Build e testes sem regressão

O projeto SHALL permanecer sem erros de TypeScript/build, com a suíte de testes do backend verde,
cobrindo o cenário de token de usuário inexistente e o de usuário existente.

#### Scenario: Verificação

- **WHEN** o typecheck e os testes do backend são executados
- **THEN** não há erros
- **AND** os testes cobrindo os cenários acima passam

