# Guia de DDD Estrategico

## 1. Subdominios
- **Core:** onde esta a vantagem competitiva. Recebe o melhor design e o DDD
  tatico mais rigoroso.
- **Supporting:** necessario ao negocio, porem sem diferencial. Design suficiente.
- **Generic:** problema resolvido (auth, billing, notificacao). Prefira solucao
  pronta/terceiro ou um contexto isolado simples.

> Decisao pratica: invista esforco proporcional ao tipo de subdominio.

## 2. Bounded Context
Fronteira onde um modelo e a linguagem sao consistentes. Regras:
- um termo tem **um** significado dentro do contexto;
- o mesmo termo pode significar outra coisa em outro contexto (ok, explicite);
- a fronteira do contexto tende a virar a fronteira do modulo.

## 3. Linguagem Ubiqua
Glossario por contexto. Esses termos viram nomes de agregados, entidades, VOs e
codigos de erro nas skills taticas. Sem glossario, o modelo vira "ball of mud".

## 4. Context Mapping (relacionamentos)
- **Partnership:** dois contextos evoluem juntos, sucesso/falha compartilhados.
- **Shared Kernel:** um pequeno modelo compartilhado (use com parcimonia).
- **Customer-Supplier:** downstream (cliente) influencia o upstream (fornecedor).
- **Conformist:** downstream aceita o modelo do upstream sem traducao.
- **Anticorruption Layer (ACL):** downstream traduz o modelo do upstream para o
  seu, evitando vazamento. Padrao seguro para integrar com legado/terceiro.
- **Open Host Service (OHS):** upstream expoe um servico/protocolo estavel.
- **Published Language:** contrato publico bem definido (ex.: schema de eventos).
- **Separate Ways:** sem integracao; duplicar e mais barato que integrar.

Sempre marque **upstream/downstream** e o **fluxo de dependencia**.

## 5. Contexto -> Modulo (neste projeto)
- Padrao: 1 bounded context -> 1 `modules/<contexto>` (modular monolito).
- Microservico so com justificativa real (escala/time/deploy independentes).
- Integracao entre modulos que pertencem a contextos distintos: usar ACL para
  traduzir, nao importar o modelo do outro contexto direto.

## Erros comuns
- Tratar o subdominio maior como core sem analisar diferencial.
- Criar contexto sem linguagem ubiqua.
- Vazar entidade de um contexto em outro (sem ACL).
- Fatiar em microservicos cedo demais.
