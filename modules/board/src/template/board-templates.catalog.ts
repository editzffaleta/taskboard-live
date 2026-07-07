import { BoardTemplate } from "./board-template.types";

/**
 * Catalogo estatico dos modelos de quadro (change `025`), espelhando os 6
 * modelos do mockup `Modelos.dc.html`. Sem persistencia propria: `id`
 * estavel em kebab-case, consumido por `create-board-from-template` e pelo
 * endpoint `GET /board-templates`.
 */
export const BOARD_TEMPLATES: BoardTemplate[] = [
  {
    id: "scrum-engenharia",
    name: "Scrum",
    description:
      "Organize o backlog, o sprint atual e o progresso da equipe de engenharia.",
    category: "Engenharia",
    color: "blue",
    lists: [
      {
        title: "Backlog",
        cards: [
          { title: "Mapear historias do proximo trimestre" },
          { title: "Refinar criterios de aceite do epico de pagamentos" },
          { title: "Investigar debito tecnico do modulo de autenticacao" },
        ],
      },
      {
        title: "Sprint",
        cards: [
          { title: "Implementar endpoint de checkout" },
          { title: "Escrever testes de integracao do carrinho" },
        ],
      },
      {
        title: "Em progresso",
        cards: [
          { title: "Corrigir bug de concorrencia no worker de fila" },
          { title: "Revisar PR do modulo de notificacoes" },
        ],
      },
      {
        title: "Concluido",
        cards: [
          { title: "Configurar pipeline de CI para o novo servico" },
        ],
      },
    ],
  },
  {
    id: "roadmap-produto",
    name: "Roadmap",
    description:
      "Planeje o que sera feito agora, a seguir e depois no roadmap de produto.",
    category: "Produto",
    color: "purple",
    lists: [
      {
        title: "Agora",
        cards: [
          { title: "Lancar busca global de cartoes" },
          { title: "Melhorar onboarding de novos usuarios" },
        ],
      },
      {
        title: "Proximo",
        cards: [
          { title: "Adicionar filtros avancados no quadro" },
          { title: "Suporte a anexos em cartoes" },
        ],
      },
      {
        title: "Depois",
        cards: [{ title: "Explorar integracao com calendario" }],
      },
    ],
  },
  {
    id: "crm-vendas",
    name: "CRM",
    description:
      "Acompanhe leads, contatos e propostas ate o fechamento da venda.",
    category: "Vendas",
    color: "green",
    lists: [
      {
        title: "Leads",
        cards: [
          { title: "Empresa Acme Ltda — indicacao de parceiro" },
          { title: "Startup Beta — formulario do site" },
        ],
      },
      {
        title: "Contato",
        cards: [{ title: "Ligacao de qualificacao com Joao Pereira" }],
      },
      {
        title: "Proposta",
        cards: [{ title: "Enviar proposta comercial para Cliente Delta" }],
      },
      {
        title: "Fechado",
        cards: [{ title: "Contrato assinado com Cliente Gama" }],
      },
    ],
  },
  {
    id: "editorial-marketing",
    name: "Editorial",
    description:
      "Planeje a producao de conteudo da ideia a publicacao.",
    category: "Marketing",
    color: "amber",
    lists: [
      {
        title: "Ideias",
        cards: [
          { title: "Guia de boas praticas de kanban remoto" },
          { title: "Case de cliente sobre times distribuidos" },
        ],
      },
      {
        title: "Escrevendo",
        cards: [{ title: "Rascunho do artigo sobre colaboracao em tempo real" }],
      },
      {
        title: "Revisao",
        cards: [{ title: "Revisar texto do lancamento da funcionalidade X" }],
      },
      {
        title: "Publicado",
        cards: [{ title: "Post sobre a nova galeria de modelos" }],
      },
    ],
  },
  {
    id: "pessoal",
    name: "Pessoal",
    description: "Organize suas tarefas do dia a dia em um quadro simples.",
    category: "Pessoal",
    color: "cyan",
    lists: [
      {
        title: "A fazer",
        cards: [
          { title: "Renovar assinatura do curso de ingles" },
          { title: "Agendar consulta medica" },
        ],
      },
      {
        title: "Fazendo",
        cards: [{ title: "Organizar as fotos da viagem" }],
      },
      {
        title: "Feito",
        cards: [{ title: "Pagar as contas do mes" }],
      },
    ],
  },
  {
    id: "bugs-engenharia",
    name: "Bugs",
    description:
      "Rastreie bugs reportados ate a verificacao final da correcao.",
    category: "Engenharia",
    color: "red",
    lists: [
      {
        title: "Reportado",
        cards: [
          { title: "Erro 500 ao mover cartao entre quadros diferentes" },
          { title: "Layout quebrado no modo escuro em telas pequenas" },
        ],
      },
      {
        title: "Triagem",
        cards: [{ title: "Investigar duplicidade de notificacoes" }],
      },
      {
        title: "Corrigindo",
        cards: [{ title: "Corrigir race condition no drag-and-drop" }],
      },
      {
        title: "Verificado",
        cards: [{ title: "Confirmar correcao do timeout no login" }],
      },
    ],
  },
];
