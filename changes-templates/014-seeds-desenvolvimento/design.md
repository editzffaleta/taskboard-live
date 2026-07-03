<!-- TEMPLATE — design dos seeds de desenvolvimento. Placeholders: {{produto}}, {{namespace}}. -->

## Context

O seed do Super Admin (`006a`) resolve o bootstrap de acesso, mas nao ha massa para navegar o
produto como cada papel. Este seed cria o cenario demo minimo e serve de base para o e2e (`015`).

Referencias compartilhadas: [Como executar](../../shared/como-executar.md) e
[Regras de nomenclatura](../../shared/regras-de-nomenclatura.md).

## Goals / Non-Goals

**Goals:**
- Ambiente navegavel em um comando: organizacao + um usuario por papel + estrutura/permissao demo.
- Idempotencia real (upsert por chave natural) e guard contra producao.
- Senhas de dev conhecidas e hasheadas pelo mesmo provider do produto.

**Non-Goals:**
- Massa volumosa/aleatoria (faker) para teste de carga — change propria se necessaria.
- Seed de dominios do produto (cursos, cofre etc.) — pertence as changes de dominio.
- Fixtures por teste (o e2e usa este seed como base e cria o que for especifico).

## Decisions

- **Upsert por chave natural** (e-mail do usuario, nome da organizacao/estrutura, chave do grupo):
  rodar N vezes converge para o mesmo estado. Alternativa (delete+insert) descartada: destrutiva
  e perigosa perto de dados reais.
- **Guard duplo**: `NODE_ENV === 'production'` exige `SEED_DEMO=true` explicita; sem ela, aborta
  com instrucao. Demo em producao e decisao consciente, nunca acidente.
- **Condicionais por presenca**: o seed detecta o que existe no schema (ex.: models de estrutura,
  permission group) e semeia apenas o aplicavel — mesmo padrao condicional das extensoes.
- **Senha via `crypto.provider`**: o hash e identico ao do registro real; login funciona de
  primeira. Credenciais demo documentadas no README do projeto gerado.
- **Skills**: backend-prisma-sync-module (referencia do schema), config-prisma (registro do seed).

## Risks / Trade-offs

- [Seed demo rodar em producao] → Guard duplo + mensagem de abort explicita; credencial demo
  nunca listada em docs de producao.
- [Divergencia seed × regras de dominio] → O seed escreve o formato final (hash, defaults) e os
  testes logam com as credenciais para provar compatibilidade.
- [Changes ausentes quebrarem o seed] → Deteccao por presenca de model/coluna antes de cada bloco.
- [Skill nao cobrir o caso inteiro] → Aplicar ate onde fizer sentido e registrar o desvio na evidencia.
