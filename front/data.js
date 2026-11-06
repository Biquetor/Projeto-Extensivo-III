// =====================================================================
// CAMADA DE DADOS
// Conversa com a API Java e guarda uma cópia em memória para as telas.
// =====================================================================

const API_BASE_URL = "http://localhost:8080/api";

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

function dataIso(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function dataHora(dia, hora) {
  return `${dia}T${String(hora).padStart(2, "0")}:00`;
}

// Prévia do valor no formulário; o valor oficial é calculado pelo backend.
function calcularValores(espaco, horas) {
  const subtotal = espaco.precoHora * horas;
  const limpeza = espaco.precoHora > 0 ? espaco.taxaLimpeza : 0;
  const servico = Math.round(subtotal * TAXA_SERVICO * 100) / 100;
  return { subtotal, limpeza, servico, total: subtotal + limpeza + servico };
}

async function chamarApi(caminho, metodo = "GET", corpo) {
  let resposta;
  try {
    resposta = await fetch(`${API_BASE_URL}${caminho}`, {
      method: metodo,
      headers: corpo ? { "Content-Type": "application/json" } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
  } catch (erro) {
    throw new Error("Não foi possível conectar ao servidor. Verifique se o backend está rodando.");
  }

  const texto = await resposta.text();
  if (!resposta.ok) {
    throw new Error(resposta.status < 500 && texto ? texto : "Erro no servidor. Tente novamente.");
  }
  return texto ? JSON.parse(texto) : null;
}

// Registros criados antes destas funcionalidades não têm os campos novos.
function normalizarEspaco(e) {
  return {
    ...e,
    tipo: TIPOS_ESPACO[e.tipo] ? e.tipo : "CENTRO_COMUNITARIO",
    ativo: e.ativo !== false,
    bairro: e.bairro || "",
    endereco: e.endereco || "",
    descricao: e.descricao || "",
    regras: e.regras || "",
    capacidade: e.capacidade || 0,
    precoHora: e.precoHora || 0,
    taxaLimpeza: e.taxaLimpeza || 0,
    reservaImediata: !!e.reservaImediata,
    fotos: e.fotos || [],
    comodidades: (e.comodidades || []).filter((c) => COMODIDADES[c]),
  };
}

function normalizarReserva(a) {
  return {
    id: a.id,
    codigo: `CV-${1000 + a.id}`,
    espacoId: a.espacoPublico.id,
    usuarioId: a.usuario.id,
    inicio: a.dataHoraInicio.slice(0, 16),
    fim: a.dataHoraFim.slice(0, 16),
    convidados: a.convidados || 0,
    tipoEvento: a.tipoEvento || "Outro",
    observacoes: a.observacoes || "",
    valores: {
      subtotal: a.subtotal || 0,
      limpeza: a.taxaLimpeza || 0,
      servico: a.taxaServico || 0,
      total: a.valorTotal || 0,
    },
    status: a.status || "CONFIRMADA",
    criadoEm: a.criadoEm,
  };
}

function normalizarAvaliacao(a) {
  return {
    id: a.id,
    espacoId: a.espacoPublico.id,
    usuarioId: a.usuario.id,
    reservaId: a.agendamento.id,
    nota: a.nota,
    comentario: a.comentario,
    data: a.data,
  };
}

const DB = {
  cache: { usuarios: [], espacos: [], reservas: [], avaliacoes: [], favoritos: {}, notificacoes: [] },

  ler(chave) {
    return this.cache[chave];
  },

  // Busca tudo no servidor. Devolve true se algo mudou desde a última vez.
  async sincronizar() {
    const sessao = localStorage.getItem("usuarioLogado");
    const usuarioId = sessao ? JSON.parse(sessao).id : null;

    const [usuarios, espacos, reservas, avaliacoes, favoritos, notificacoes] = await Promise.all([
      chamarApi("/usuarios"),
      chamarApi("/espacos-publicos"),
      chamarApi("/agendamentos"),
      chamarApi("/avaliacoes"),
      usuarioId ? chamarApi(`/favoritos/${usuarioId}`) : [],
      usuarioId ? chamarApi(`/notificacoes/${usuarioId}`) : [],
    ]);

    const novo = {
      usuarios,
      espacos: espacos.map(normalizarEspaco),
      reservas: reservas.map(normalizarReserva),
      avaliacoes: avaliacoes.map(normalizarAvaliacao),
      favoritos: usuarioId ? { [usuarioId]: favoritos } : {},
      notificacoes: notificacoes.map((n) => ({ ...n, usuarioId })),
    };
    const mudou = JSON.stringify(novo) !== JSON.stringify(this.cache);
    this.cache = novo;
    return mudou;
  },
};
