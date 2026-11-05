// =====================================================================
// CAMADA DE DADOS LOCAL
// Substitui a API Java: tudo fica salvo no localStorage do navegador,
// então o site funciona apenas abrindo o index.html.
// Os espaços, usuários e reservas abaixo são dados fictícios de exemplo.
// =====================================================================

const VERSAO_DADOS = "1";
const CHAVES = [
  "usuarios",
  "espacos",
  "reservas",
  "avaliacoes",
  "favoritos",
  "notificacoes",
];

const TIPOS_ESPACO = {
  SALAO_FESTAS: { label: "Salão de Festas", icone: "party-popper" },
  CHACARA: { label: "Chácara", icone: "tent-tree" },
  AUDITORIO: { label: "Auditório", icone: "presentation" },
  CENTRO_COMUNITARIO: { label: "Centro Comunitário", icone: "building-2" },
  QUADRA: { label: "Quadra Esportiva", icone: "volleyball" },
  PARQUE: { label: "Parque", icone: "tree-pine" },
  PRACA: { label: "Praça", icone: "trees" },
};

const COMODIDADES = {
  estacionamento: { label: "Estacionamento", icone: "car" },
  wifi: { label: "Wi-Fi", icone: "wifi" },
  ar: { label: "Ar-condicionado", icone: "snowflake" },
  cozinha: { label: "Cozinha equipada", icone: "utensils" },
  som: { label: "Sistema de som", icone: "music" },
  projetor: { label: "Projetor", icone: "projector" },
  acessibilidade: { label: "Acessibilidade", icone: "accessibility" },
  churrasqueira: { label: "Churrasqueira", icone: "flame" },
  arLivre: { label: "Área ao ar livre", icone: "trees" },
  banheiros: { label: "Banheiros", icone: "bath" },
  palco: { label: "Palco", icone: "mic" },
  mesas: { label: "Mesas e cadeiras", icone: "armchair" },
};

const TIPOS_EVENTO = [
  "Aniversário",
  "Casamento",
  "Festa infantil",
  "Confraternização",
  "Palestra ou workshop",
  "Evento esportivo",
  "Reunião comunitária",
  "Outro",
];

const TAXA_SERVICO = 0.05;
const HORA_ABERTURA = 7;
const HORA_FECHAMENTO = 23;

function fotoUnsplash(id) {
  return `https://images.unsplash.com/photo-${id}?q=80&w=1000&auto=format&fit=crop`;
}

function dataIso(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function dataHora(dia, hora) {
  return `${dia}T${String(hora).padStart(2, "0")}:00`;
}

function calcularValores(espaco, horas) {
  const subtotal = espaco.precoHora * horas;
  const limpeza = espaco.precoHora > 0 ? espaco.taxaLimpeza : 0;
  const servico = Math.round(subtotal * TAXA_SERVICO * 100) / 100;
  return { subtotal, limpeza, servico, total: subtotal + limpeza + servico };
}

function criarDadosIniciais() {
  const usuarios = [
    { id: 1, nome: "Administrador", email: "admin@comunidade.com", senha: "admin123", role: "ADMIN" },
    { id: 2, nome: "Ana Beatriz Lima", email: "usuario@comunidade.com", senha: "usuario123", role: "USER" },
    { id: 3, nome: "Carlos Mendes", email: "carlos@exemplo.com", senha: "123456", role: "USER" },
    { id: 4, nome: "Fernanda Rocha", email: "fernanda@exemplo.com", senha: "123456", role: "USER" },
    { id: 5, nome: "Rafael Duarte", email: "rafael@exemplo.com", senha: "123456", role: "USER" },
  ];

  const espacos = [
    {
      id: 1, nome: "Salão Imperial", tipo: "SALAO_FESTAS", bairro: "Centro",
      endereco: "Rua das Palmeiras, 120", latitude: -27.8142, longitude: -50.3264,
      capacidade: 250, precoHora: 320, taxaLimpeza: 280, reservaImediata: false,
      descricao: "Salão clássico com lustres, pista de dança e copa de apoio. Ideal para casamentos, formaturas e grandes celebrações no coração da cidade.",
      regras: "Som permitido até as 23h. Decoração sem uso de pregos ou fitas nas paredes.",
      comodidades: ["estacionamento", "wifi", "ar", "cozinha", "som", "acessibilidade", "banheiros", "palco", "mesas"],
      fotos: ["1519167758481-83f550bb49b3", "1519225421980-715cb0215aed", "1555244162-803834f70033"].map(fotoUnsplash),
    },
    {
      id: 2, nome: "Galpão das Luzes", tipo: "SALAO_FESTAS", bairro: "Universitário",
      endereco: "Av. dos Tropeiros, 845", latitude: -27.7985, longitude: -50.3338,
      capacidade: 150, precoHora: 240, taxaLimpeza: 180, reservaImediata: true,
      descricao: "Galpão rústico com estrutura de madeira, varais de luz e piso amplo. Um clima acolhedor para festas e confraternizações.",
      regras: "Proibido fogos de artifício. Limpeza básica inclusa.",
      comodidades: ["estacionamento", "wifi", "som", "banheiros", "mesas", "cozinha"],
      fotos: ["1510076857177-7470076d4098", "1527529482837-4698179dc6ce", "1464366400600-7168b8af9bc3"].map(fotoUnsplash),
    },
    {
      id: 3, nome: "Chácara Recanto Verde", tipo: "CHACARA", bairro: "Guarujá",
      endereco: "Estrada do Recanto, km 3", latitude: -27.8345, longitude: -50.2925,
      capacidade: 200, precoHora: 280, taxaLimpeza: 350, reservaImediata: false,
      descricao: "Jardins, gazebo e amplo gramado para cerimônias ao ar livre, com estrutura de apoio para buffet e área coberta em caso de chuva.",
      regras: "Música ao vivo mediante aviso prévio. Animais de estimação sob consulta.",
      comodidades: ["estacionamento", "arLivre", "churrasqueira", "cozinha", "banheiros", "mesas", "som"],
      fotos: ["1469371670807-013ccf25f16a", "1523438885200-e635ba2c371e", "1519225421980-715cb0215aed"].map(fotoUnsplash),
    },
    {
      id: 4, nome: "Auditório Prisma", tipo: "AUDITORIO", bairro: "Coral",
      endereco: "Rua Marechal Deodoro, 410", latitude: -27.8068, longitude: -50.3122,
      capacidade: 180, precoHora: 200, taxaLimpeza: 90, reservaImediata: true,
      descricao: "Auditório climatizado com projeção, som profissional e poltronas confortáveis. Perfeito para palestras, workshops e formaturas.",
      regras: "Não é permitido consumo de alimentos na plateia.",
      comodidades: ["wifi", "ar", "som", "projetor", "acessibilidade", "banheiros", "palco"],
      fotos: ["1587825140708-dfaf72ae4b04", "1540575467063-178a50c2df87", "1475721027785-f74eccf877e2"].map(fotoUnsplash),
    },
    {
      id: 5, nome: "Espaço Balão Mágico", tipo: "SALAO_FESTAS", bairro: "Copacabana",
      endereco: "Rua dos Girassóis, 77", latitude: -27.8215, longitude: -50.3098,
      capacidade: 70, precoHora: 130, taxaLimpeza: 80, reservaImediata: true,
      descricao: "Salão colorido e seguro, pensado para festas infantis, com cozinha de apoio e mesas prontas para receber a família.",
      regras: "Crianças devem estar acompanhadas por um responsável.",
      comodidades: ["wifi", "ar", "cozinha", "som", "banheiros", "mesas"],
      fotos: ["1530103862676-de8c9debad1d", "1464366400600-7168b8af9bc3"].map(fotoUnsplash),
    },
    {
      id: 6, nome: "Ginásio Bairro Coral", tipo: "QUADRA", bairro: "Coral",
      endereco: "Rua do Esporte, 15", latitude: -27.8021, longitude: -50.3046,
      capacidade: 120, precoHora: 70, taxaLimpeza: 0, reservaImediata: true,
      descricao: "Quadra poliesportiva coberta para treinos, campeonatos e eventos esportivos da comunidade.",
      regras: "Uso obrigatório de calçado apropriado.",
      comodidades: ["banheiros", "estacionamento", "acessibilidade"],
      fotos: ["1546519638-68e109498ffc"].map(fotoUnsplash),
    },
    {
      id: 7, nome: "Parque das Araucárias", tipo: "PARQUE", bairro: "Santa Helena",
      endereco: "Av. das Araucárias, s/n", latitude: -27.7905, longitude: -50.3102,
      capacidade: 300, precoHora: 60, taxaLimpeza: 50, reservaImediata: false,
      descricao: "Área verde com alamedas e clareiras para piqueniques, feiras e eventos abertos ao público.",
      regras: "Recolha todo o lixo ao final do evento. Som apenas em volume moderado.",
      comodidades: ["arLivre", "banheiros", "estacionamento", "acessibilidade"],
      fotos: ["1519331379826-f10be5486c6f", "1441974231531-c6227db76b6e"].map(fotoUnsplash),
    },
    {
      id: 8, nome: "Centro Comunitário Santa Helena", tipo: "CENTRO_COMUNITARIO", bairro: "Santa Helena",
      endereco: "Rua da Comunidade, 200", latitude: -27.8262, longitude: -50.3411,
      capacidade: 100, precoHora: 45, taxaLimpeza: 40, reservaImediata: false,
      descricao: "Espaço multiuso da associação de moradores para reuniões, cursos e celebrações do bairro.",
      regras: "Devolver as chaves à associação ao final do uso.",
      comodidades: ["wifi", "cozinha", "banheiros", "mesas", "projetor"],
      fotos: ["1517457373958-b7bdd4587205", "1464366400600-7168b8af9bc3"].map(fotoUnsplash),
    },
    {
      id: 9, nome: "Praça do Coreto", tipo: "PRACA", bairro: "Centro",
      endereco: "Praça do Coreto, s/n", latitude: -27.8112, longitude: -50.3198,
      capacidade: 400, precoHora: 0, taxaLimpeza: 0, reservaImediata: false,
      descricao: "Praça pública com coreto para apresentações culturais e encontros comunitários. Uso gratuito mediante aprovação.",
      regras: "Eventos precisam ser abertos ao público.",
      comodidades: ["arLivre", "acessibilidade"],
      fotos: ["1441974231531-c6227db76b6e"].map(fotoUnsplash),
    },
  ].map((e) => ({ ...e, ativo: true }));

  const reservas = [];
  const avaliacoes = [];
  const agora = new Date();
  const eventos = ["Aniversário", "Casamento", "Confraternização", "Palestra ou workshop", "Festa infantil"];
  const comentarios = [
    "Lugar lindo e muito bem cuidado, nossos convidados adoraram.",
    "Atendimento atencioso do início ao fim. Reservaria novamente.",
    "Boa estrutura e localização fácil de encontrar.",
    "Superou as expectativas! Tudo estava pronto no horário combinado.",
    "Espaço bom, mas o estacionamento lotou rápido.",
    "Excelente custo-benefício para o nosso evento.",
    "Funcional e organizado, atendeu ao que precisávamos.",
    "Ambiente acolhedor, fez toda a diferença na nossa festa.",
  ];
  const notas = [5, 5, 4, 5, 4, 5, 4, 5];

  function adicionarReserva(espacoId, usuarioId, deslocamentoDias, horaInicio, horaFim, status, tipoEvento, convidados) {
    const dia = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + deslocamentoDias);
    const espaco = espacos.find((e) => e.id === espacoId);
    const id = reservas.length + 1;
    const criadoEm = new Date(dia.getTime() - 14 * 86400000);
    reservas.push({
      id,
      codigo: `CV-${1000 + id}`,
      espacoId,
      usuarioId,
      inicio: dataHora(dataIso(dia), horaInicio),
      fim: dataHora(dataIso(dia), horaFim),
      convidados,
      tipoEvento,
      observacoes: "",
      valores: calcularValores(espaco, horaFim - horaInicio),
      status,
      criadoEm: criadoEm.toISOString(),
    });
    return reservas[reservas.length - 1];
  }

  // Histórico dos últimos meses (alimenta os gráficos e as avaliações).
  for (let i = 0; i < 34; i++) {
    const espacoId = 1 + ((i * 5) % 8);
    const usuarioId = 2 + ((i + Math.floor(i / 8)) % 4);
    const horaInicio = [9, 14, 18, 10, 19][i % 5];
    const duracao = [4, 5, 4, 6, 3][i % 5];
    const status = i % 9 === 8 ? "CANCELADA" : "CONFIRMADA";
    const reserva = adicionarReserva(espacoId, usuarioId, -(2 + i * 5), horaInicio, horaInicio + duracao, status, eventos[i % 5], 30 + (i % 6) * 10);

    if (status === "CONFIRMADA" && usuarioId !== 2 && i % 3 !== 2) {
      avaliacoes.push({
        id: avaliacoes.length + 1,
        espacoId,
        usuarioId,
        reservaId: reserva.id,
        nota: notas[(i + Math.floor(i / 8) * 3) % notas.length],
        comentario: comentarios[(i + Math.floor(i / 8) * 3) % comentarios.length],
        data: reserva.fim,
      });
    }
  }

  const reservaPraca = adicionarReserva(9, 4, -20, 15, 18, "CONFIRMADA", "Reunião comunitária", 80);
  avaliacoes.push({
    id: avaliacoes.length + 1, espacoId: 9, usuarioId: 4, reservaId: reservaPraca.id,
    nota: 5, comentario: "Ótimo lugar para reunir os vizinhos no fim da tarde.", data: reservaPraca.fim,
  });

  // Próximos eventos e solicitações aguardando aprovação.
  adicionarReserva(1, 2, 5, 18, 23, "CONFIRMADA", "Aniversário", 80);
  adicionarReserva(1, 5, 5, 9, 13, "CONFIRMADA", "Confraternização", 100);
  adicionarReserva(4, 2, 12, 9, 12, "PENDENTE", "Palestra ou workshop", 60);
  adicionarReserva(3, 3, 3, 10, 18, "PENDENTE", "Casamento", 120);
  adicionarReserva(5, 4, 2, 14, 18, "PENDENTE", "Festa infantil", 30);
  adicionarReserva(2, 3, 9, 19, 23, "CONFIRMADA", "Confraternização", 90);
  adicionarReserva(7, 4, 7, 9, 15, "CONFIRMADA", "Reunião comunitária", 150);
  adicionarReserva(6, 5, 1, 19, 21, "CONFIRMADA", "Evento esportivo", 40);
  adicionarReserva(8, 2, 20, 14, 17, "CANCELADA", "Reunião comunitária", 40);

  const notificacoes = [
    { id: 1, usuarioId: 2, icone: "calendar-check", texto: "Sua reserva no Salão Imperial foi confirmada.", lida: false, data: agora.toISOString() },
    { id: 2, usuarioId: 2, icone: "star", texto: "Como foi o seu último evento? Avalie o espaço em Minhas Reservas.", lida: false, data: agora.toISOString() },
    { id: 3, usuarioId: 1, icone: "inbox", texto: "Há novas solicitações de reserva aguardando sua aprovação.", lida: false, data: agora.toISOString() },
  ];

  return {
    usuarios,
    espacos,
    reservas,
    avaliacoes,
    favoritos: { 2: [3, 4] },
    notificacoes,
  };
}

const DB = {
  iniciar() {
    if (localStorage.getItem("cv_versao") !== VERSAO_DADOS) this.restaurar();
  },
  restaurar() {
    const dados = criarDadosIniciais();
    CHAVES.forEach((chave) => this.salvar(chave, dados[chave]));
    localStorage.setItem("cv_versao", VERSAO_DADOS);
  },
  ler(chave) {
    return JSON.parse(localStorage.getItem(`cv_${chave}`));
  },
  salvar(chave, valor) {
    localStorage.setItem(`cv_${chave}`, JSON.stringify(valor));
  },
  proximoId(lista) {
    return lista.reduce((maior, item) => Math.max(maior, item.id), 0) + 1;
  },
};
