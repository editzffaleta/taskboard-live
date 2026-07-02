# Mandatory Readings

Leia estes arquivos exatamente nesta ordem antes de implementar o Value Object:

1. `packages/shared/src/model/entity.ts` (estilo da classe base de dominio)
2. `packages/shared/src/model/index.ts` (verificar se ja existe `ValueObject`)
3. `packages/shared/src/validation/validator.ts`
4. `packages/shared/src/validation/index.ts`
5. `packages/shared/src/validation/rules/` (regras disponiveis para reuso)
6. uma entidade real, ex. `modules/auth/src/user/model/user.entity.ts` (naming + codigos de erro)
7. o agregado alvo em `modules/<modulo>/src/<aggregate>/` (onde o VO vai morar)

Extraia dessas leituras:

- o estilo exato da classe base e o uso de `props`/imutabilidade
- se ja existe uma base `ValueObject` para reutilizar
- o padrao de `Validator.validate([...])` e os codigos de erro
- as regras compartilhadas que ja cobrem o caso (Email, Cpf, etc.)
- o nome real do workspace do modulo (no `package.json`) para rodar os testes

Antes de editar, confirme:

- se o modulo e o agregado existem e nao ha ambiguidade de destino
- se o VO realmente deve ser um Value Object (sem identidade) e nao uma Entity
- quais campos compoem o VO e qual a normalizacao desejada na criacao

Se qualquer leitura obrigatoria falhar, pare e relate o bloqueio.
