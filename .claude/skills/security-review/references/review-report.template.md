# Relatorio de Security Review — <alvo>

## Resumo executivo
- Escopo revisado: <modulos/pastas/PR>
- Fora de escopo: <o que nao foi revisado>
- Achados: Criticos X · Altos Y · Medios Z · Baixos W
- Recomendacao geral: <bloquear merge / corrigir criticos antes / ok com ressalvas>

## Achados (ordenados por severidade)

### [CRITICA] <titulo do achado>
- **Categoria OWASP:** A01 Broken Access Control / API1 BOLA
- **Local:** `apps/backend/.../arquivo.ts:123`
- **Evidencia:** <trecho/descricao objetiva do problema no codigo>
- **Impacto:** <o que um atacante consegue>
- **Status:** confirmado | a confirmar
- **Remediacao:** <acao concreta> (skill: `backend-authorization`)

### [ALTA] <titulo>
- ...

### [MEDIA] <titulo>
- ...

### [BAIXA] <titulo>
- ...

## Dependencias (se `npm audit` solicitado)
| Pacote | Severidade | Correcao |
|---|---|---|
| <pkg> | high | atualizar para <versao> |

## Notas
- <observacoes, suposicoes e itens a confirmar com o time>
