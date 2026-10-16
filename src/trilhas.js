// Catálogo das trilhas: produto → etapas → passos.
// A estrutura é fixa no código; título, texto e vídeo de cada passo são editados pela editora
// (o que ela salva fica em `conteudo` e sobrepõe o padrão daqui).

// Etapa com N passos sem nome ("Parte 1", "Parte 2"…) ou com a lista de nomes dos passos.
// Etapa de um passo só: o passo leva o nome da etapa.
const etapa = (titulo, passos, extra = {}) => ({
  titulo,
  passos: Array.isArray(passos)
    ? passos
    : Array.from({ length: passos }, (_, i) => (passos === 1 ? titulo : `Parte ${i + 1}`)),
  ...extra,
})

const DEFINICAO = {
  HBOOK: {
    nome: 'HBook',
    marca: 'HBook',
    subtitulo: 'Motor de Reservas',
    resumo: 'Aprenda a utilizar o HBook no dia a dia do seu hotel. Ao final do treinamento, seu site vai gerar reservas diretas, sem comissões.',
    cor: '#5d288e',
    descricao: 'Motor de reservas',
    etapas: [
      etapa('Comece por aqui', 1),
      etapa('Confira seu hotel no motor', ['Propriedade', 'Quartos e tarifas', 'Extras', 'Integrações', 'Parte 5']),
      etapa('Ajuste seus preços e disponibilidade', 1, { somenteSem: 'HUNIT' }),
      etapa('Veja seu motor no ar', 1),
      etapa('Crie relacionamento com seu hóspede', ['E-mail automático', 'Recuperação de reservas', 'Pré e pós check-in', 'Aniversário']),
      etapa('Prepare sua primeira venda', ['Ofertas', 'Promoções', 'Pacotes']),
      etapa('Leve o hóspede até o motor', 1),
      etapa('Acompanhe os seus resultados', 1),
    ],
  },
  HUNIT: {
    nome: 'HUnit',
    marca: 'HUnit',
    subtitulo: 'Gestor de Canais',
    resumo: 'Aprenda a utilizar o HUnit no dia a dia do seu hotel para distribuir tarifas e disponibilidade em todos os canais ao mesmo tempo, sem overbooking.',
    cor: '#798d2a',
    descricao: 'Channel manager',
    etapas: [
      etapa('Comece por aqui', 1),
      etapa('Confira seus quartos e tarifas', 2),
      etapa('Atualize seus canais', 2),
      etapa('Leia sua grade', 2),
      etapa('Crie suas ofertas', 1),
      etapa('Encontre suas reservas', 1),
      etapa('Acompanhe os seus resultados', 1),
    ],
  },
  HCORP: {
    nome: 'HCorp',
    marca: 'HCorp',
    subtitulo: 'Gestão de Redes',
    resumo: 'Aprenda a utilizar o HCorp para acompanhar e gerenciar todas as unidades da sua rede em um só lugar.',
    cor: '#8a919c', // provisória: cor ainda não definida
    descricao: 'Trilha em preparação',
    etapas: [],
  },
  HBOT: {
    nome: 'HAI',
    marca: 'HAI',
    subtitulo: 'Atendimento com IA',
    resumo: 'Aprenda a utilizar o HAI no dia a dia do seu hotel para atender e converter hóspedes a qualquer momento, sem sobrecarregar sua equipe.',
    cor: '#1f7ecc',
    descricao: 'Atendente com IA',
    etapas: [
      etapa('Comece por aqui', 1),
      etapa('Monte sua equipe de atendimento', 1),
      etapa('Defina as regras do seu atendimento', 2),
      etapa('Veja as reservas do atendente', 1),
      etapa('Organize seus contatos', 1),
      etapa('Ensine seu atendente', 1, { nota: 'Inclui o teste no Web Chat' }),
      etapa('Assuma uma conversa', 1),
      etapa('Acompanhe os seus resultados', 1),
      etapa('Prepare sua conexão', 5, { nota: 'Inclui Canais → Web' }),
    ],
  },
  HPRICE: {
    nome: 'HPrice',
    marca: 'HPrice',
    subtitulo: 'Inteligência de Preços',
    resumo: 'Aprenda a utilizar o HPrice no dia a dia do seu hotel para definir preços com base no mercado e vender mais, com mais margem.',
    cor: '#ed6c00',
    descricao: 'Inteligência de preços',
    etapas: [
      etapa('Comece por aqui', 1),
      etapa('Acompanhe o mercado', 1),
      etapa('Compare seus preços', 1),
      etapa('Marque suas datas e alertas', 1),
      etapa('Crie suas regras de preço', 5),
      etapa('Planeje seu calendário', 1),
      etapa('Acompanhe os seus resultados', 2),
    ],
  },
}

// Ids estáveis por posição: "hbook-2-3" = hbook, etapa 2, passo 3. O progresso e o conteúdo
// editado ficam gravados nesses ids, então não reordenar etapas depois de entrar em produção.
export const CATALOGO = Object.fromEntries(
  Object.entries(DEFINICAO).map(([codigo, p]) => [
    codigo,
    {
      codigo,
      ...p,
      etapas: p.etapas.map((e, ei) => ({
        ...e,
        id: `${codigo.toLowerCase()}-${ei + 1}`,
        passos: e.passos.map((titulo, pi) => ({ id: `${codigo.toLowerCase()}-${ei + 1}-${pi + 1}`, titulo })),
      })),
    },
  ]),
)

export const nomeProduto = (codigo) => CATALOGO[codigo]?.nome ?? codigo
// Treinamentos ao vivo em grupo: agendas de turma no Calendly da HSystem. O hai não tem turma.
// Todas são webinars no Zoom de 1 hora; `sessoes` = dias da semana e horário de início de cada turma.
export const TREINAMENTOS_GRUPO = [
  { id: 'hbook', produtos: ['HBOOK'], titulo: 'HBook', descricao: 'Motor de reservas', sessoes: [{ dia: 'Terça', hora: '11h00' }, { dia: 'Quinta', hora: '15h00' }], cor: '#5d288e', url: 'https://calendly.com/treinamentoshsystem/treinamento-em-grupo-do-hbook' },
  { id: 'hunit-hcorp', produtos: ['HUNIT', 'HCORP'], titulo: 'HUnit e HCorp', descricao: 'Channel manager e gestão de redes', sessoes: [{ dia: 'Terça', hora: '15h00' }, { dia: 'Quinta', hora: '11h00' }], cor: '#798d2a', url: 'https://calendly.com/treinamentoshsystem/treinamento-em-grupo-do-hunit-e-hcorp' },
  { id: 'hprice', produtos: ['HPRICE'], titulo: 'HPrice', descricao: 'Inteligência de preços', sessoes: [{ dia: 'Quinta', hora: '14h00' }], cor: '#ed6c00', url: 'https://calendly.com/treinamentoshsystem/treinamento-em-grupo-do-hprice' },
]

// Ordem dos cartões de tutoriais (todos os produtos, sem trava).
export const ORDEM_TUTORIAIS = ['HBOOK', 'HUNIT', 'HBOT', 'HPRICE', 'HCORP']

// Arte dos cards de tutoriais (em public/tutoriais). O hcorp ainda não tem: usa um card "Em breve".
export const IMAGEM_TUTORIAL = {
  HBOOK: './tutoriais/hbook.webp',
  HUNIT: './tutoriais/hunit.png',
  HBOT: './tutoriais/hai.webp',
  HPRICE: './tutoriais/hprice.webp',
}

export const corProduto =(codigo) => CATALOGO[codigo]?.cor ?? '#8a919c'
export const treinoDoProduto = (codigo) => TREINAMENTOS_GRUPO.find((t) => t.produtos.includes(codigo)) ?? null
