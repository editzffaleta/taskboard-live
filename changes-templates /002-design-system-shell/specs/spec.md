<!-- TEMPLATE — delta de capability da 002. Placeholders: {{produto}}, {{fonte-texto}}, {{fonte-dados}}. -->

## ADDED Requirements

### Requirement: Paleta {{produto}} aplicada via CSS variables

O frontend SHALL aplicar a paleta visual do {{produto}} (primaria, escala neutra e semanticas) por
meio das CSS variables consumidas pela biblioteca de componentes, em tema claro e tema escuro.

#### Scenario: Componentes refletem a paleta sem alteracao individual

- **WHEN** o tema {{produto}} e aplicado no `globals.css`
- **THEN** os componentes de `shared/components/ui/*` renderizam com a cor primaria, a escala neutra
  e as semanticas (`success`, `warning`, `danger`) das telas
- **AND** a paleta esta definida para tema claro e tema escuro
- **AND** nenhum componente precisa ser alterado individualmente para refletir a paleta

### Requirement: Tipografia da marca

O frontend SHALL usar {{fonte-texto}} para texto e {{fonte-dados}} para dados/codigo, carregadas via `next/font`.

#### Scenario: Fontes da marca aplicadas

- **WHEN** a tipografia e configurada
- **THEN** o texto da aplicacao usa {{fonte-texto}}
- **AND** conteudos de dados/codigo usam {{fonte-dados}}

### Requirement: Alternancia de tema claro/escuro persistente

O frontend SHALL prover alternancia entre tema claro e escuro, com persistencia da escolha do
usuario, sendo o tema claro o padrao.

#### Scenario: Usuario alterna e a escolha persiste

- **WHEN** o usuario aciona o controle de tema no shell
- **THEN** a aplicacao alterna entre claro e escuro via classe `.dark`
- **AND** a escolha e persistida (via `use-local-storage.hook`) e mantida entre sessoes
- **AND** na ausencia de escolha previa, o tema padrao e o claro

### Requirement: Marca {{produto}} no shell

O shell de navegacao SHALL exibir a marca {{produto}}.

#### Scenario: Logo da marca no shell

- **WHEN** o shell e renderizado
- **THEN** o `app-logo.component` exibe a marca {{produto}}

### Requirement: Navegacao por secoes preparada para papeis

O frontend SHALL prover a navegacao da sidebar organizada por secoes, de forma declarativa e
preparada para receber o gating por papel em mudanca futura, sem aplicar regras de papel nesta mudanca.

#### Scenario: Sidebar com estrutura por secoes

- **WHEN** o shell e renderizado
- **THEN** a sidebar apresenta a estrutura por secoes do {{produto}} (config estatica)
- **AND** a estrutura e declarativa e permite adicionar gating por papel na `006` sem reescrita
- **AND** nenhuma regra de papel e aplicada nesta mudanca

### Requirement: Reuso da biblioteca de componentes

Esta mudanca SHALL reaproveitar a biblioteca de componentes herdada da `001` e MUST NOT recria-la ou duplica-la.

#### Scenario: Biblioteca reaproveitada, nao recriada

- **WHEN** o design system {{produto}} e aplicado
- **THEN** os componentes de `shared/components/ui/*` sao reaproveitados como estao
- **AND** o re-skin acontece via CSS variables e tipografia, sem recriar componentes

### Requirement: Escopo restrito ao frontend

Esta mudanca SHALL alterar apenas o frontend e MUST NOT introduzir modulo de dominio, regra de papel
ou conceito de tenant.

#### Scenario: Nenhum dominio, papel ou tenant introduzido

- **WHEN** a tematizacao e entregue
- **THEN** nenhum modulo de dominio e criado
- **AND** nenhuma regra de papel/RBAC e aplicada
- **AND** nenhum conceito de organizacao/tenant e introduzido
