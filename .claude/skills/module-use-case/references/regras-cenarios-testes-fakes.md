# module-use-case — Regras por cenário, testes e fakes

> Extraído do corpo da skill (progressive disclosure). O SKILL.md mantém o fluxo
> determinístico e a estrutura obrigatória; aqui vivem as regras detalhadas.

## Regras por tipo de cenario

### `crud`

Para `crud`, siga uma implementacao minima e previsivel, compativel com casos como:

- criar;
- atualizar;
- excluir;
- buscar por id;
- buscar pagina.

Nesses cenarios:

- prefira dependencias simples, normalmente repositorios;
- reutilize tipos e contratos ja existentes do agregado;
- mantenha fluxo direto, sem condicoes extras desnecessarias;
- so adicione validacao extra quando o pedido trouxer essa necessidade explicitamente ou quando o padrao do modulo ja exigir.

### `custom`

Para `custom`:

- monte o caso de uso com base no que o usuario descreveu;
- continue com implementacao inicial simples e pouco opinativa;
- quando houver lacunas, prefira contratos minimos e placeholders uteis em vez de inventar comportamento detalhado;
- trate dependencias externas como contratos injetados pelo construtor.


## Regras dos testes unitarios

O teste do caso de uso e obrigatorio.

Destino preferencial:

- `modules/<modulo>/test/<aggregate>/usecase/<use-case>.usecase.test.ts`

Cobertura minima obrigatoria do teste:

1. caminho feliz;
2. falhas de validacao, quando existirem;
3. dependencias chamadas ou nao chamadas conforme o fluxo;
4. todos os branches e condicionais existentes;
5. retorno esperado, quando houver saida;
6. comportamento quando erro e propagado ou tratado;
7. ausencia de efeitos colaterais quando o fluxo falhar antes do ponto critico.

Regras de qualidade:

- use implementacoes fake reais e concretas, nao mocks de framework como estrategia principal;
- priorize fakes existentes do modulo antes de criar novas;
- se existir fake adequada, reutilize-a e nao duplique;
- se nao existir fake adequada para uma dependencia essencial, crie uma fake simples e reutilizavel em `modules/<modulo>/test/mock/`;
- ao criar nova fake, exporte-a tambem em `modules/<modulo>/test/mock/index.ts`;
- use spies apenas como apoio pontual sobre classes concretas ou prototipos, como no exemplo de `User.prototype.validate`;
- escreva testes reais e uteis, nao superficiais.

## Reuso de fakes

Antes de criar uma fake nova, procure por:

- `modules/<modulo>/test/mock/fake-<aggregate>.repository.ts`
- outros `fake-*.ts` em `modules/<modulo>/test/mock/`
- exports existentes em `modules/<modulo>/test/mock/index.ts`

Se uma fake cobrir a dependencia:

- reutilize a classe existente;
- adapte o teste ao contrato dela;
- evite duplicacao com outro nome.

Se uma fake nao existir e for essencial:

- crie uma classe concreta simples;
- mantenha armazenamento em memoria ou comportamento previsivel;
- evite `jest.fn()` como estrutura principal da fake;
- deixe a fake pronta para ser reutilizada por outros testes do modulo.

