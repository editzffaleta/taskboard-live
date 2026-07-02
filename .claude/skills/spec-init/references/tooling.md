# Tooling — garantir os scripts do gate

O gate (`scripts/ci/gate.sh`) roda `lint`, `typecheck`/`check-types`, `test` e
`build` — mas só os que existirem no `package.json` da raiz. Para o gate ter
dente, esses scripts precisam resolver no monorepo.

## Contexto
O `config-project-fullstack` já scaffolda o monorepo (Next + NestJS, npm). Então
aqui o trabalho **não** é criar projeto do zero — é só garantir que a raiz exponha
os quatro passos do gate, via Turbo.

## Checagem rápida
Veja os scripts da raiz:
```bash
node -e "console.log(Object.keys(require('./package.json').scripts||{}))"
```

## O que cada passo espera
- **lint** — `create-turbo`/Next já trazem `lint` (geralmente `turbo run lint`).
- **typecheck** — o `create-turbo` usa o nome `check-types`. O gate aceita os dois
  (`typecheck` ou `check-types`), então não precisa renomear.
- **build** — `turbo run build` (Next + Nest).
- **test** — costuma faltar na raiz. O Nest já vem com testes; exponha um script
  de teste na raiz para o Turbo agregar, por exemplo:
  ```jsonc
  // package.json (raiz)
  "scripts": { "test": "turbo run test" }
  ```
  e garanta que cada app tenha seu próprio `test` no `package.json`.

## Não esquecer
- Commitar o `package-lock.json` (o CI usa `npm ci` e o cache do npm dependem dele).
- Se for usar os git hooks, adicionar o script:
  `"prepare": "git config core.hooksPath .githooks"`.
