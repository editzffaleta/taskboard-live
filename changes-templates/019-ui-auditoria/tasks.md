<!-- TEMPLATE — tasks da tela de auditoria (D30). Checkboxes vazios; marque com evidencia. Cada
task tem **Aceite**. Placeholders: {{produto}}, {{namespace}}. -->

> **Antes de comecar:** leia `openspec/shared/como-executar.md` e `regras-de-nomenclatura.md`.
> **Pre-requisitos:** `016` (GET /audit), `006b` (gating), `002` (shell). **Nao faca:** endpoints
> ou filtros novos no backend; exportacao; retencao; tempo real. **Principio:** a tela e cliente
> puro do `GET /audit` — a API e a autoridade.

## 1. Front-end

- [ ] 1.1 Criar a pagina **D30 — Auditoria** na area administrativa: tabela paginada (data, ator, acao, alvo) consumindo `GET /audit`, com estados de carregamento/vazio/erro do design system.
  - **Aceite:** paginacao funcional; estados cobertos; dados reais da API.
- [ ] 1.2 Filtros espelhando a API: acao (select do catalogo), ator, alvo e periodo; filtros refletidos na query e limpaveis.
  - **Aceite:** cada filtro altera a consulta; combinacoes funcionam; limpar restaura.
- [ ] 1.3 Detalhe expandivel por linha: metadata formatada (chave→valor) e `requestId` quando presente.
  - **Aceite:** expansao por linha; JSON legivel; requestId exibido quando existir.
- [ ] 1.4 Rotulos i18n das acoes (`audit.actions.<chave>`, pt/en) com fallback no literal; demais chaves da tela (titulos, filtros, estados).
  - **Aceite:** acoes do catalogo com rotulo; chave desconhecida exibe o literal sem quebrar.
- [ ] 1.5 Gating (`006b`): item de menu e rota apenas para `admin_org`/`super_admin`.
  - **Aceite:** papel sem permissao nao ve o menu e a rota redireciona; autorizado acessa.

## 2. Verificacao

- [ ] 2.1 Rodar `npx tsc --noEmit` (frontend), os testes e validar manualmente com a trilha populada (acoes da `016` via seed/uso): filtros, detalhe, paginacao e gating por papel.
  - **Aceite:** `tsc` limpo; testes verdes; validacao registrada por papel.
