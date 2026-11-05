let map;
let markersGroup;
const marcadores = {};

let viewAtual = "explorar";
let modoExplorar = "grade";
let filtros = filtrosPadrao();
let abaReservas = "proximas";
let abaAdmin = "visao";
let espacoDetalheId = null;
let mesCalendario = null;
let diaSelecionado = null;
let espacoEditandoId = null;
let reservaAvaliandoId = null;
let notaAvaliacao = 5;

// --- UTILITÁRIOS ---
function esc(texto) {
  return String(texto ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );
}

function normalizar(texto) {
  return String(texto).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function moeda(valor) {
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function precoCurto(valor) {
  return valor === 0
    ? "Gratuito"
    : Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function hora(h) {
  return `${String(h).padStart(2, "0")}:00`;
}

function formatarData(texto) {
  return new Date(texto).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatarPeriodo(reserva) {
  return `${formatarData(reserva.inicio)}, ${reserva.inicio.slice(11, 16)} às ${reserva.fim.slice(11, 16)}`;
}

function atualizarIcones() {
  if (window.lucide) lucide.createIcons();
}

function mostrarAviso(texto, tipo = "sucesso") {
  const estilos = {
    sucesso: { icone: "check-circle-2", cor: "text-emerald-500" },
    erro: { icone: "alert-circle", cor: "text-rose-500" },
    info: { icone: "info", cor: "text-blue-500" },
  }[tipo];
  const aviso = document.createElement("div");
  aviso.className =
    "toast-entrada pointer-events-auto max-w-sm flex items-start gap-2.5 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl text-sm font-medium text-slate-800 dark:text-slate-100";
  aviso.innerHTML = `<i data-lucide="${estilos.icone}" class="w-5 h-5 shrink-0 ${estilos.cor}"></i><span>${esc(texto)}</span>`;
  document.getElementById("toasts").appendChild(aviso);
  atualizarIcones();
  setTimeout(() => aviso.remove(), 4500);
}

function abrirModal(id) {
  document.getElementById(id).style.display = "flex";
}

function fecharModal(id) {
  document.getElementById(id).style.display = "none";
}

function confirmar(titulo, texto, rotulo) {
  document.getElementById("confirmarTitulo").textContent = titulo;
  document.getElementById("confirmarTexto").textContent = texto;
  const sim = document.getElementById("confirmarSim");
  const nao = document.getElementById("confirmarNao");
  sim.textContent = rotulo;
  abrirModal("modalConfirmar");
  return new Promise((resolver) => {
    const responder = (resposta) => {
      fecharModal("modalConfirmar");
      sim.onclick = null;
      nao.onclick = null;
      resolver(resposta);
    };
    sim.onclick = () => responder(true);
    nao.onclick = () => responder(false);
  });
}

function baixarArquivo(nome, conteudo, tipo) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

function alternarTema() {
  const escuro = document.documentElement.classList.toggle("dark");
  localStorage.setItem("cv_tema", escuro ? "escuro" : "claro");
}

// --- FUNÇÃO AUXILIAR DE VERIFICAÇÃO ADMIN ---
function eAdmin(user) {
  if (!user) return false;
  const permissao = user.role || user.tipoPermissao;
  return permissao && permissao.toUpperCase() === "ADMIN";
}

// --- CONSULTAS AOS DADOS ---
function espacosAtivos() {
  return DB.ler("espacos").filter((e) => e.ativo);
}

function espacoPorId(id) {
  return DB.ler("espacos").find((e) => e.id === id);
}

function usuarioPorId(id) {
  return DB.ler("usuarios").find((u) => u.id === id);
}

function notaDoEspaco(id) {
  const lista = DB.ler("avaliacoes").filter((a) => a.espacoId === id);
  const total = lista.length;
  const media = total ? lista.reduce((soma, a) => soma + a.nota, 0) / total : 0;
  return { media, total, lista };
}

// O status salvo muda com o tempo: reserva confirmada que já passou vira
// concluída, e solicitação nunca respondida expira.
function statusReal(reserva) {
  const passou = new Date(reserva.fim) < new Date();
  if (reserva.status === "CONFIRMADA" && passou) return "CONCLUIDA";
  if (reserva.status === "PENDENTE" && new Date(reserva.inicio) < new Date()) return "EXPIRADA";
  return reserva.status;
}

const STATUS = {
  PENDENTE: { label: "Aguardando aprovação", icone: "clock", cor: "bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400" },
  CONFIRMADA: { label: "Confirmada", icone: "check-circle-2", cor: "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400" },
  CONCLUIDA: { label: "Concluída", icone: "party-popper", cor: "bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400" },
  CANCELADA: { label: "Cancelada", icone: "ban", cor: "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300" },
  RECUSADA: { label: "Recusada", icone: "x-circle", cor: "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400" },
  EXPIRADA: { label: "Expirada", icone: "timer-off", cor: "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300" },
};

function seloStatus(reserva) {
  const s = STATUS[statusReal(reserva)];
  return `<span class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 font-bold rounded-full whitespace-nowrap ${s.cor}"><i data-lucide="${s.icone}" class="w-3 h-3"></i>${s.label}</span>`;
}

function reservaOcupaHorario(reserva) {
  return reserva.status === "PENDENTE" || reserva.status === "CONFIRMADA";
}

function horasOcupadas(espacoId, dia) {
  const ocupadas = new Set();
  DB.ler("reservas")
    .filter((r) => r.espacoId === espacoId && reservaOcupaHorario(r) && r.inicio.startsWith(dia))
    .forEach((r) => {
      const inicio = parseInt(r.inicio.slice(11, 13));
      const fim = parseInt(r.fim.slice(11, 13));
      for (let h = inicio; h < fim; h++) ocupadas.add(h);
    });
  return ocupadas;
}

function diaLotado(espacoId, dia) {
  return horasOcupadas(espacoId, dia).size >= HORA_FECHAMENTO - HORA_ABERTURA;
}

function faixasOcupadas(ocupadas) {
  const faixas = [];
  [...ocupadas].sort((a, b) => a - b).forEach((h) => {
    const ultima = faixas[faixas.length - 1];
    if (ultima && ultima[1] === h) ultima[1] = h + 1;
    else faixas.push([h, h + 1]);
  });
  return faixas.map(([ini, fim]) => `${hora(ini)} às ${hora(fim)}`).join(", ");
}

function notificar(usuarioId, icone, texto) {
  const lista = DB.ler("notificacoes");
  lista.push({
    id: DB.proximoId(lista),
    usuarioId,
    icone,
    texto,
    lida: false,
    data: new Date().toISOString(),
  });
  DB.salvar("notificacoes", lista);
}

function notificarAdmins(icone, texto) {
  DB.ler("usuarios").filter(eAdmin).forEach((u) => notificar(u.id, icone, texto));
}

function atualizarReserva(id, alteracoes) {
  const lista = DB.ler("reservas");
  Object.assign(lista.find((r) => r.id === id), alteracoes);
  DB.salvar("reservas", lista);
}

// --- NAVEGAÇÃO ENTRE TELAS ---
function navegarPara(screenId) {
  const screens = ["screenHome", "screenLogin", "screenRegister", "screenAdminLogin", "appContainer"];

  screens.forEach((s) => {
    const el = document.getElementById(s);
    if (el) {
      if (s === "screenHome") {
        el.style.display = s === screenId ? "block" : "none";
      } else {
        el.style.display = s === screenId ? "flex" : "none";
      }
    }
  });
}

function exigirLogin() {
  if (obterUsuarioLogado()) return true;
  mostrarAviso("Entre na sua conta para continuar.", "info");
  navegarPara("screenLogin");
  return false;
}

function mostrarView(nome) {
  if ((nome === "favoritos" || nome === "reservas") && !exigirLogin()) return;
  if (nome === "admin" && !eAdmin(obterUsuarioLogado())) return;

  viewAtual = nome;
  const ids = { explorar: "viewExplorar", detalhe: "viewDetalhe", favoritos: "viewFavoritos", reservas: "viewReservas", admin: "viewAdmin" };
  Object.entries(ids).forEach(([view, id]) => {
    const el = document.getElementById(id);
    el.style.display = view !== nome ? "none" : view === "explorar" ? "flex" : "block";
  });
  alternarSidebar(false);
  renderizarViewAtual();
}

function renderizarViewAtual() {
  const renderizadores = {
    explorar: renderizarExplorar,
    detalhe: renderizarDetalhe,
    favoritos: renderizarFavoritos,
    reservas: renderizarReservas,
    admin: renderizarAdmin,
  };
  renderizadores[viewAtual]();
  destacarNavegacao();
  renderizarSidebar();
  atualizarContadores();
  atualizarIcones();
}

function destacarNavegacao() {
  const ativo = viewAtual === "explorar" ? (modoExplorar === "mapa" ? "mapa" : "explorar") : viewAtual;
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("ativo", item.dataset.nav === ativo);
  });
}

function alternarSidebar(abrir) {
  document.getElementById("sidebar").classList.toggle("-translate-x-full", !abrir);
  document.getElementById("sidebarFundo").classList.toggle("hidden", !abrir);
}

function entrarNoCatalogo() {
  navegarPara("appContainer");
  irParaExplorar("grade");
}

// --- CONTROLE DE SESSÃO ---
function obterUsuarioLogado() {
  const user = localStorage.getItem("usuarioLogado");
  return user ? JSON.parse(user) : null;
}

function verificarSessao() {
  const user = obterUsuarioLogado();
  if (user && !usuarioPorId(user.id)) {
    localStorage.removeItem("usuarioLogado");
    return verificarSessao();
  }

  atualizarInterfaceUsuario(user);
  renderizarHome();
  if (user) {
    navegarPara("appContainer");
    mostrarView(viewAtual);
  } else {
    // Redireciona para a Home se o usuário não estiver autenticado
    navegarPara("screenHome");
  }
}

function atualizarInterfaceUsuario(user) {
  const admin = eAdmin(user);
  document.getElementById("userDisplayName").textContent = user ? user.nome : "Visitante";
  document.getElementById("userRoleBadge").innerHTML = admin ? `<span class="admin-badge">ADMIN</span>` : "";
  document.getElementById("btnCadastrarEspacoAdmin").style.display = admin ? "inline-flex" : "none";
  document.getElementById("navAdmin").style.display = admin ? "flex" : "none";
  document.getElementById("btnSair").style.display = user ? "block" : "none";
  document.getElementById("btnEntrar").style.display = user ? "none" : "inline-flex";
}

function logoutUsuario() {
  localStorage.removeItem("usuarioLogado");
  location.reload();
}

// --- DOM READY ---
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("cv_tema") === "escuro") document.documentElement.classList.add("dark");

  DB.iniciar();
  prepararFormularios();
  prepararFiltros();
  verificarSessao();
  atualizarIcones();

  document.querySelectorAll(".modal-backdrop").forEach((fundo) => {
    if (fundo.id === "modalConfirmar") return;
    fundo.addEventListener("mousedown", (e) => {
      if (e.target === fundo) fecharModal(fundo.id);
    });
  });
});

function prepararFormularios() {
  document.getElementById("formLogin").addEventListener("submit", (e) => {
    e.preventDefault();
    autenticarUsuario(document.getElementById("loginEmail").value, document.getElementById("loginSenha").value);
  });

  document.getElementById("formAdminLogin").addEventListener("submit", (e) => {
    e.preventDefault();
    autenticarUsuario(document.getElementById("adminEmail").value, document.getElementById("adminSenha").value, true);
  });

  document.getElementById("formRegister").addEventListener("submit", registrarUsuario);
  document.getElementById("agendamentoForm").addEventListener("submit", enviarReserva);
  document.getElementById("espacoForm").addEventListener("submit", salvarEspaco);
  document.getElementById("avaliacaoForm").addEventListener("submit", enviarAvaliacao);

  document.getElementById("formBuscaHome").addEventListener("submit", (e) => {
    e.preventDefault();
    filtros = filtrosPadrao();
    filtros.texto = document.getElementById("homeBusca").value.trim();
    filtros.data = document.getElementById("homeData").value;
    filtros.convidados = parseInt(document.getElementById("homeConvidados").value) || 0;
    sincronizarFiltros();
    entrarNoCatalogo();
  });

  ["agendamentoEspacoId", "agendamentoData"].forEach((id) => {
    document.getElementById(id).addEventListener("change", atualizarHorarios);
  });
  document.getElementById("agendamentoInicio").addEventListener("change", () => {
    atualizarHorarioFim();
    atualizarResumoReserva();
  });
  document.getElementById("agendamentoFim").addEventListener("change", atualizarResumoReserva);
  document.getElementById("agendamentoConvidados").addEventListener("input", atualizarResumoReserva);

  document.getElementById("agendamentoTipoEvento").innerHTML = TIPOS_EVENTO.map((t) => `<option>${t}</option>`).join("");
  document.getElementById("novoTipo").innerHTML = Object.entries(TIPOS_ESPACO)
    .map(([valor, t]) => `<option value="${valor}">${t.label}</option>`)
    .join("");
  document.getElementById("novasComodidades").innerHTML = Object.entries(COMODIDADES)
    .map(
      ([valor, c]) => `<label class="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
        <input type="checkbox" value="${valor}" class="w-3.5 h-3.5 accent-amber-600" /> ${c.label}</label>`
    )
    .join("");
}

// --- AUTENTICAÇÃO ---
function autenticarUsuario(email, senha, somenteAdmin = false) {
  const usuario = DB.ler("usuarios").find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.senha === senha
  );

  if (!usuario) return mostrarAviso("E-mail ou senha incorretos.", "erro");
  if (somenteAdmin && !eAdmin(usuario)) return mostrarAviso("Esta conta não tem acesso administrativo.", "erro");

  const { senha: _, ...sessao } = usuario;
  localStorage.setItem("usuarioLogado", JSON.stringify(sessao));
  if (somenteAdmin) viewAtual = "admin";
  verificarSessao();
  mostrarAviso(`Bem-vindo(a), ${usuario.nome.split(" ")[0]}!`);
}

function registrarUsuario(e) {
  e.preventDefault();
  const usuarios = DB.ler("usuarios");
  const email = document.getElementById("regEmail").value.trim();
  const role = document.getElementById("regRole").value;

  if (usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return mostrarAviso("Este e-mail já está cadastrado.", "erro");
  }

  usuarios.push({
    id: DB.proximoId(usuarios),
    nome: document.getElementById("regNome").value.trim(),
    email,
    senha: document.getElementById("regSenha").value,
    role,
  });
  DB.salvar("usuarios", usuarios);
  e.target.reset();
  mostrarAviso(role === "ADMIN" ? "Conta de Administrador criada! Faça login." : "Conta criada com sucesso! Faça login.");
  navegarPara("screenLogin");
}

// --- CARTÕES DE ESPAÇO ---
function fotoEspaco(espaco, indice, classes) {
  const foto = espaco.fotos[indice];
  const tipo = TIPOS_ESPACO[espaco.tipo];
  return `<div class="relative overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 ${classes}">
    <div class="absolute inset-0 flex items-center justify-center text-white/70"><i data-lucide="${tipo.icone}" class="w-10 h-10"></i></div>
    ${foto ? `<img src="${esc(foto)}" alt="${esc(espaco.nome)}" loading="lazy" onerror="this.remove()" class="absolute inset-0 w-full h-full object-cover" />` : ""}
  </div>`;
}

function textoNota(nota) {
  return nota.total
    ? `<span class="flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-100"><i data-lucide="star" class="w-3.5 h-3.5 fill-amber-400 text-amber-400"></i>${nota.media.toFixed(1).replace(".", ",")}</span>`
    : `<span class="text-xs font-semibold text-blue-600 dark:text-blue-400">Novo</span>`;
}

function favoritosDoUsuario() {
  const user = obterUsuarioLogado();
  return user ? DB.ler("favoritos")[user.id] || [] : [];
}

function cartaoEspaco(espaco) {
  const nota = notaDoEspaco(espaco.id);
  const favorito = favoritosDoUsuario().includes(espaco.id);
  return `<article onclick="abrirDetalhe(${espaco.id})" class="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all overflow-hidden">
    <div class="relative">
      ${fotoEspaco(espaco, 0, "h-52")}
      <button data-favorito="${espaco.id}" onclick="alternarFavorito(event, ${espaco.id})" class="absolute top-3 right-3 p-2 rounded-full bg-white/90 dark:bg-slate-900/80 shadow transition-all hover:scale-110 ${favorito ? "text-rose-600" : "text-slate-500 dark:text-slate-300"}" title="Favoritar" aria-label="Favoritar ${esc(espaco.nome)}">
        <i data-lucide="heart" class="w-4 h-4 ${favorito ? "fill-current" : ""}"></i>
      </button>
      ${espaco.reservaImediata ? `<span class="absolute top-3 left-3 inline-flex items-center gap-1 text-[11px] px-2.5 py-1 bg-white/90 dark:bg-slate-900/80 text-blue-700 dark:text-blue-300 font-bold rounded-full shadow"><i data-lucide="zap" class="w-3 h-3"></i> Reserva imediata</span>` : ""}
    </div>
    <div class="p-4 space-y-1.5">
      <div class="flex items-start justify-between gap-3">
        <h3 class="font-bold text-slate-900 dark:text-white leading-snug">${esc(espaco.nome)}</h3>
        ${textoNota(nota)}
      </div>
      <p class="text-xs text-slate-500 dark:text-slate-400">${TIPOS_ESPACO[espaco.tipo].label} · ${esc(espaco.bairro)}</p>
      <div class="flex items-center justify-between pt-1.5">
        <span class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><i data-lucide="users" class="w-3.5 h-3.5"></i> até ${espaco.capacidade}</span>
        <span class="text-sm text-slate-900 dark:text-white"><strong>${precoCurto(espaco.precoHora)}</strong>${espaco.precoHora ? '<span class="text-xs text-slate-500 dark:text-slate-400"> /hora</span>' : ""}</span>
      </div>
    </div>
  </article>`;
}

function estadoVazio(icone, titulo, texto) {
  return `<div class="col-span-full text-center py-16 px-6 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
    <div class="w-12 h-12 mx-auto rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4"><i data-lucide="${icone}" class="w-6 h-6"></i></div>
    <h3 class="font-bold text-slate-900 dark:text-white">${titulo}</h3>
    <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">${texto}</p>
  </div>`;
}

function alternarFavorito(evento, id) {
  evento.stopPropagation();
  const user = obterUsuarioLogado();
  if (!user) {
    exigirLogin();
    return;
  }
  const todos = DB.ler("favoritos");
  const lista = todos[user.id] || [];
  const agoraFavorito = !lista.includes(id);
  todos[user.id] = agoraFavorito ? [...lista, id] : lista.filter((f) => f !== id);
  DB.salvar("favoritos", todos);
  mostrarAviso(agoraFavorito ? "Adicionado aos favoritos." : "Removido dos favoritos.", "info");

  if (viewAtual === "favoritos") renderizarFavoritos();
  if (viewAtual === "detalhe") renderizarDetalhe();
  document.querySelectorAll(`[data-favorito="${id}"]`).forEach((botao) => {
    botao.classList.toggle("text-rose-600", agoraFavorito);
    botao.classList.toggle("text-slate-500", !agoraFavorito);
    botao.classList.toggle("dark:text-slate-300", !agoraFavorito);
    botao.querySelector("svg")?.classList.toggle("fill-current", agoraFavorito);
  });
  atualizarIcones();
}

function renderizarHome() {
  const destaques = espacosAtivos()
    .sort((a, b) => notaDoEspaco(b.id).media - notaDoEspaco(a.id).media)
    .slice(0, 3);
  document.getElementById("homeDestaques").innerHTML = destaques.map(cartaoEspaco).join("");
  atualizarIcones();
}

// --- EXPLORAR: BUSCA E FILTROS ---
function filtrosPadrao() {
  return { texto: "", tipo: "", data: "", convidados: 0, precoMax: null, comodidades: [], imediata: false, ordem: "avaliacao" };
}

function prepararFiltros() {
  const hoje = dataIso(new Date());
  document.getElementById("filtroData").min = hoje;
  document.getElementById("homeData").min = hoje;
  document.getElementById("agendamentoData").min = hoje;

  document.getElementById("filtroComodidades").innerHTML = Object.entries(COMODIDADES)
    .map(
      ([valor, c]) => `<label class="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
        <input type="checkbox" value="${valor}" class="w-4 h-4 accent-blue-600" /> ${c.label}</label>`
    )
    .join("");

  sincronizarFiltros();

  const aoAlterar = (id, evento, ler) => {
    document.getElementById(id).addEventListener(evento, (e) => {
      ler(e.target);
      renderizarExplorar();
      atualizarIcones();
    });
  };
  aoAlterar("filtroTexto", "input", (el) => (filtros.texto = el.value.trim()));
  aoAlterar("filtroData", "change", (el) => (filtros.data = el.value));
  aoAlterar("filtroConvidados", "input", (el) => (filtros.convidados = parseInt(el.value) || 0));
  aoAlterar("filtroOrdem", "change", (el) => (filtros.ordem = el.value));
  aoAlterar("filtroImediata", "change", (el) => (filtros.imediata = el.checked));
  aoAlterar("filtroPreco", "input", (el) => {
    filtros.precoMax = parseInt(el.value) >= parseInt(el.max) ? null : parseInt(el.value);
  });
  aoAlterar("filtroComodidades", "change", (el) => {
    filtros.comodidades = el.checked
      ? [...filtros.comodidades, el.value]
      : filtros.comodidades.filter((c) => c !== el.value);
  });
}

function precoMaximoCatalogo() {
  const maior = Math.max(0, ...espacosAtivos().map((e) => e.precoHora));
  return Math.ceil(maior / 10) * 10;
}

function sincronizarFiltros() {
  const maximo = precoMaximoCatalogo();
  document.getElementById("filtroTexto").value = filtros.texto;
  document.getElementById("filtroData").value = filtros.data;
  document.getElementById("filtroConvidados").value = filtros.convidados || "";
  document.getElementById("filtroOrdem").value = filtros.ordem;
  document.getElementById("filtroImediata").checked = filtros.imediata;
  const preco = document.getElementById("filtroPreco");
  preco.max = maximo;
  preco.value = filtros.precoMax ?? maximo;
  document.querySelectorAll("#filtroComodidades input").forEach((caixa) => {
    caixa.checked = filtros.comodidades.includes(caixa.value);
  });
}

function limparFiltros() {
  filtros = filtrosPadrao();
  sincronizarFiltros();
  renderizarExplorar();
  atualizarIcones();
}

function alternarPainelFiltros() {
  const painel = document.getElementById("painelFiltros");
  painel.classList.toggle("hidden");
  painel.classList.toggle("grid");
}

function selecionarTipo(tipo) {
  filtros.tipo = filtros.tipo === tipo ? "" : tipo;
  renderizarExplorar();
  atualizarIcones();
}

function espacosFiltrados() {
  const busca = normalizar(filtros.texto);
  const lista = espacosAtivos().filter((e) => {
    const texto = normalizar(`${e.nome} ${e.bairro} ${TIPOS_ESPACO[e.tipo].label}`);
    return (
      (!busca || texto.includes(busca)) &&
      (!filtros.tipo || e.tipo === filtros.tipo) &&
      (!filtros.convidados || e.capacidade >= filtros.convidados) &&
      (filtros.precoMax === null || e.precoHora <= filtros.precoMax) &&
      (!filtros.imediata || e.reservaImediata) &&
      filtros.comodidades.every((c) => e.comodidades.includes(c)) &&
      (!filtros.data || !diaLotado(e.id, filtros.data))
    );
  });

  const comparadores = {
    avaliacao: (a, b) => notaDoEspaco(b.id).media - notaDoEspaco(a.id).media,
    precoAsc: (a, b) => a.precoHora - b.precoHora,
    precoDesc: (a, b) => b.precoHora - a.precoHora,
    capacidade: (a, b) => b.capacidade - a.capacidade,
  };
  return lista.sort(comparadores[filtros.ordem]);
}

function irParaExplorar(modo) {
  sincronizarFiltros();
  modoExplorar = modo;
  mostrarView("explorar");
}

function alternarModoExplorar(modo) {
  modoExplorar = modo;
  renderizarExplorar();
  destacarNavegacao();
  atualizarIcones();
}

function renderizarExplorar() {
  const lista = espacosFiltrados();
  const chips = [["", "Todos", "sparkles"], ...Object.entries(TIPOS_ESPACO).map(([valor, t]) => [valor, t.label, t.icone])];
  document.getElementById("filtroChips").innerHTML = chips
    .map(([valor, label, icone]) => {
      const ativo = filtros.tipo === valor;
      return `<button onclick="selecionarTipo('${valor}')" class="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold transition-all ${
        ativo
          ? "bg-blue-600 border-blue-600 text-white"
          : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
      }"><i data-lucide="${icone}" class="w-3.5 h-3.5"></i>${label}</button>`;
    })
    .join("");

  const precoValor = document.getElementById("filtroPrecoValor");
  precoValor.textContent = filtros.precoMax === null ? "sem limite" : precoCurto(filtros.precoMax);

  const avancados = (filtros.precoMax !== null ? 1 : 0) + filtros.comodidades.length + (filtros.imediata ? 1 : 0);
  const contador = document.getElementById("filtrosContador");
  contador.textContent = avancados;
  contador.classList.toggle("hidden", !avancados);
  contador.classList.toggle("inline-flex", !!avancados);

  document.getElementById("resultadoContador").textContent =
    lista.length === 1 ? "1 espaço encontrado" : `${lista.length} espaços encontrados`;
  document.getElementById("gradeEspacos").innerHTML = lista.length
    ? lista.map(cartaoEspaco).join("")
    : estadoVazio("search-x", "Nenhum espaço encontrado", "Tente remover alguns filtros ou escolher outra data.");

  const emMapa = modoExplorar === "mapa";
  document.getElementById("painelGrade").style.display = emMapa ? "none" : "block";
  document.getElementById("painelMapa").style.display = emMapa ? "block" : "none";
  [["modoGrade", !emMapa], ["modoMapa", emMapa]].forEach(([id, ativo]) => {
    const botao = document.getElementById(id);
    botao.className = `modo-btn px-2.5 py-1 rounded-md transition-all ${
      ativo ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-sm" : "text-slate-500 dark:text-slate-400"
    }`;
  });

  if (emMapa) {
    inicializarMapa();
    if (map) map.invalidateSize();
  }
  renderizarMarcadores(lista);
}

// --- MAPA ---
function inicializarMapa() {
  if (map || !window.L) return;

  map = L.map("map").setView([-27.81, -50.32], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png", {
    attribution:
      '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
  }).addTo(map);

  markersGroup = L.layerGroup().addTo(map);

  map.on("click", (e) => {
    if (eAdmin(obterUsuarioLogado())) abrirModalNovoEspaco(e.latlng);
  });
}

function renderizarMarcadores(lista) {
  if (!markersGroup) return;
  markersGroup.clearLayers();
  Object.keys(marcadores).forEach((id) => delete marcadores[id]);

  lista.forEach((e) => {
    const marcador = L.marker([e.latitude, e.longitude], {
      icon: L.divIcon({
        className: "pin-wrapper",
        html: `<div class="pin-preco">${precoCurto(e.precoHora)}</div>`,
        iconSize: [0, 0],
      }),
    });
    marcador.bindPopup(
      `<div style="width:200px">
        <img src="${esc(e.fotos[0] || "")}" alt="" onerror="this.remove()" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px" />
        <b style="font-size:14px">${esc(e.nome)}</b><br>
        <span style="color:#64748b">${TIPOS_ESPACO[e.tipo].label} · até ${e.capacidade} pessoas</span><br>
        <button onclick="abrirDetalhe(${e.id})" class="btn-primary" style="margin-top:8px;padding:7px 12px;font-size:12px">Ver detalhes</button>
      </div>`
    );
    markersGroup.addLayer(marcador);
    marcadores[e.id] = marcador;
  });
}

function verNoMapa(id) {
  filtros = filtrosPadrao();
  irParaExplorar("mapa");
  const espaco = espacoPorId(id);
  if (map && marcadores[id]) {
    map.setView([espaco.latitude, espaco.longitude], 16);
    marcadores[id].openPopup();
  }
}

// --- DETALHES DO ESPAÇO ---
function abrirDetalhe(id) {
  navegarPara("appContainer");
  espacoDetalheId = id;
  const hoje = new Date();
  mesCalendario = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  diaSelecionado = null;
  mostrarView("detalhe");
  document.getElementById("viewDetalhe").scrollTop = 0;
}

function renderizarDetalhe() {
  const e = espacoPorId(espacoDetalheId);
  const nota = notaDoEspaco(e.id);
  const favorito = favoritosDoUsuario().includes(e.id);
  const miniaturas = [1, 2].filter((i) => e.fotos[i]);

  const estrelas = (n) =>
    [1, 2, 3, 4, 5]
      .map((i) => `<i data-lucide="star" class="w-3.5 h-3.5 ${i <= n ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}"></i>`)
      .join("");

  const avaliacoes = nota.lista
    .slice()
    .sort((a, b) => b.data.localeCompare(a.data))
    .map((a) => {
      const autor = usuarioPorId(a.usuarioId)?.nome || "Usuário";
      return `<div class="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <div class="flex items-center justify-between gap-3 mb-1.5">
          <strong class="text-sm text-slate-900 dark:text-white">${esc(autor)}</strong>
          <span class="text-xs text-slate-500 dark:text-slate-400">${new Date(a.data).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}</span>
        </div>
        <div class="flex gap-0.5 mb-2" role="img" aria-label="Nota ${a.nota} de 5">${estrelas(a.nota)}</div>
        <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">${esc(a.comentario)}</p>
      </div>`;
    })
    .join("");

  document.getElementById("viewDetalhe").innerHTML = `
    <div class="max-w-6xl mx-auto p-5 lg:p-8">
      <div class="flex items-center justify-between gap-3 mb-4">
        <button onclick="irParaExplorar(modoExplorar)" class="flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors">
          <i data-lucide="arrow-left" class="w-4 h-4"></i> Voltar
        </button>
        <div class="flex gap-2">
          <button onclick="verNoMapa(${e.id})" class="px-3 py-1.5 flex items-center gap-1.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
            <i data-lucide="map" class="w-4 h-4"></i> Ver no mapa
          </button>
          <button onclick="alternarFavorito(event, ${e.id})" class="px-3 py-1.5 flex items-center gap-1.5 text-sm font-semibold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all ${favorito ? "text-rose-600" : "text-slate-700 dark:text-slate-200"}">
            <i data-lucide="heart" class="w-4 h-4 ${favorito ? "fill-current" : ""}"></i> ${favorito ? "Salvo" : "Salvar"}
          </button>
        </div>
      </div>

      <h2 class="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">${esc(e.nome)}</h2>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 mb-5 text-sm text-slate-500 dark:text-slate-400">
        ${textoNota(nota)}
        ${nota.total ? `<span>${nota.total} ${nota.total === 1 ? "avaliação" : "avaliações"}</span>` : ""}
        <span class="flex items-center gap-1"><i data-lucide="map-pin" class="w-3.5 h-3.5"></i>${esc(e.endereco)}, ${esc(e.bairro)}</span>
      </div>

      <div class="grid grid-cols-1 ${miniaturas.length ? "md:grid-cols-3" : ""} gap-2 rounded-3xl overflow-hidden mb-8">
        ${fotoEspaco(e, 0, `h-64 md:h-96 ${miniaturas.length ? "md:col-span-2" : ""}`)}
        ${miniaturas.length ? `<div class="hidden md:grid gap-2 h-96">${miniaturas.map((i) => fotoEspaco(e, i, "h-full")).join("")}</div>` : ""}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 lg:gap-10 items-start">
        <div class="space-y-8 min-w-0">
          <div class="flex flex-wrap gap-2">
            <span class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300"><i data-lucide="${TIPOS_ESPACO[e.tipo].icone}" class="w-3.5 h-3.5"></i>${TIPOS_ESPACO[e.tipo].label}</span>
            <span class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200"><i data-lucide="users" class="w-3.5 h-3.5"></i>Até ${e.capacidade} convidados</span>
            ${e.reservaImediata ? `<span class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"><i data-lucide="zap" class="w-3.5 h-3.5"></i>Reserva imediata</span>` : ""}
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Sobre o espaço</h3>
            <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">${esc(e.descricao)}</p>
          </div>
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-3">O que este lugar oferece</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              ${e.comodidades
                .map((c) => `<div class="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-200"><i data-lucide="${COMODIDADES[c].icone}" class="w-4 h-4 text-blue-600 dark:text-blue-400"></i>${COMODIDADES[c].label}</div>`)
                .join("")}
            </div>
          </div>
          ${e.regras ? `<div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-2">Regras do espaço</h3>
            <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">${esc(e.regras)}</p>
          </div>` : ""}
          <div>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-3">Avaliações</h3>
            <div class="space-y-3">${avaliacoes || '<p class="text-sm text-slate-500 dark:text-slate-400">Este espaço ainda não recebeu avaliações.</p>'}</div>
          </div>
        </div>

        <aside class="order-first lg:order-none lg:sticky lg:top-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg p-5">
          <div class="flex items-baseline gap-1 mb-4">
            <span class="text-2xl font-extrabold text-slate-900 dark:text-white">${precoCurto(e.precoHora)}</span>
            ${e.precoHora ? '<span class="text-sm text-slate-500 dark:text-slate-400">/hora</span>' : ""}
          </div>
          <div id="detalheCalendario"></div>
          <button onclick="abrirModalAgendamento(${e.id}, diaSelecionado)" class="w-full mt-4 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2 text-sm">
            <i data-lucide="calendar-plus" class="w-4 h-4"></i> ${e.reservaImediata ? "Reservar agora" : "Solicitar reserva"}
          </button>
          <p class="text-xs text-center text-slate-500 dark:text-slate-400 mt-2">${e.reservaImediata ? "Confirmação na hora, sem aprovação" : "O administrador aprova a sua solicitação"}</p>
        </aside>
      </div>
    </div>`;
  renderizarCalendario();
}

function renderizarCalendario() {
  const e = espacoPorId(espacoDetalheId);
  const hojeIso = dataIso(new Date());
  const ano = mesCalendario.getFullYear();
  const mes = mesCalendario.getMonth();
  const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
  const totalDias = new Date(ano, mes + 1, 0).getDate();
  const noMesAtual = dataIso(mesCalendario) <= hojeIso.slice(0, 8) + "01";

  let celulas = "";
  for (let i = 0; i < primeiroDiaSemana; i++) celulas += "<span></span>";
  for (let d = 1; d <= totalDias; d++) {
    const dia = dataIso(new Date(ano, mes, d));
    const passado = dia < hojeIso;
    const ocupadas = passado ? 0 : horasOcupadas(e.id, dia).size;
    const lotado = ocupadas >= HORA_FECHAMENTO - HORA_ABERTURA;
    const selecionado = dia === diaSelecionado;
    let classes = "text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-slate-800";
    if (passado) classes = "text-slate-300 dark:text-slate-600 cursor-not-allowed";
    else if (lotado) classes = "text-slate-400 dark:text-slate-500 line-through cursor-not-allowed";
    else if (selecionado) classes = "bg-blue-600 text-white";
    celulas += `<button type="button" ${passado || lotado ? "disabled" : ""} onclick="selecionarDia('${dia}')" aria-label="${d}${ocupadas ? ", parcialmente reservado" : ""}" class="relative h-9 rounded-lg text-xs font-semibold transition-all ${classes}">
      ${d}${ocupadas && !lotado ? `<span class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${selecionado ? "bg-white" : "bg-amber-500"}"></span>` : ""}
    </button>`;
  }

  let infoDia = "Selecione uma data para ver os horários.";
  if (diaSelecionado) {
    const ocupadas = horasOcupadas(e.id, diaSelecionado);
    infoDia = ocupadas.size ? `Já reservado: ${faixasOcupadas(ocupadas)}` : "Dia totalmente livre, das 07:00 às 23:00.";
  }

  document.getElementById("detalheCalendario").innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <button type="button" onclick="mudarMes(-1)" ${noMesAtual ? "disabled" : ""} class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30" aria-label="Mês anterior"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
      <strong class="text-sm first-letter:uppercase text-slate-900 dark:text-white">${mesCalendario.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</strong>
      <button type="button" onclick="mudarMes(1)" class="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Próximo mês"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
    </div>
    <div class="grid grid-cols-7 gap-0.5 text-center">
      ${["D", "S", "T", "Q", "Q", "S", "S"].map((l) => `<span class="text-[10px] font-bold text-slate-400 py-1">${l}</span>`).join("")}
      ${celulas}
    </div>
    <p class="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Dia com horários já reservados</p>
    <p class="text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 rounded-lg px-3 py-2 mt-3">${infoDia}</p>`;
  atualizarIcones();
}

function selecionarDia(dia) {
  diaSelecionado = dia;
  renderizarCalendario();
}

function mudarMes(delta) {
  mesCalendario = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + delta, 1);
  renderizarCalendario();
}

// --- RESERVA ---
function abrirModalAgendamento(espacoId = null, dia = null) {
  if (!exigirLogin()) return;

  const select = document.getElementById("agendamentoEspacoId");
  select.innerHTML =
    '<option value="">Selecione um local</option>' +
    espacosAtivos()
      .map((e) => `<option value="${e.id}">${esc(e.nome)} (${TIPOS_ESPACO[e.tipo].label})</option>`)
      .join("");
  select.value = espacoId || "";
  document.getElementById("agendamentoData").value = dia || filtros.data || "";
  if (filtros.convidados) document.getElementById("agendamentoConvidados").value = filtros.convidados;
  document.getElementById("agendamentoObservacoes").value = "";
  atualizarHorarios();
  abrirModal("modalAgendamento");
}

function atualizarHorarios() {
  const espacoId = parseInt(document.getElementById("agendamentoEspacoId").value);
  const dia = document.getElementById("agendamentoData").value;
  const inicio = document.getElementById("agendamentoInicio");
  const aviso = document.getElementById("agendamentoOcupados");

  if (!espacoId || !dia) {
    inicio.innerHTML = '<option value="">--:--</option>';
    document.getElementById("agendamentoFim").innerHTML = '<option value="">--:--</option>';
    aviso.classList.add("hidden");
    atualizarResumoReserva();
    return;
  }

  const ocupadas = horasOcupadas(espacoId, dia);
  const agora = new Date();
  const horaMinima = dia === dataIso(agora) ? agora.getHours() + 1 : HORA_ABERTURA;
  const anterior = parseInt(inicio.value);
  let opcoes = "";
  let primeiraLivre = null;
  let anteriorValida = false;
  for (let h = HORA_ABERTURA; h < HORA_FECHAMENTO; h++) {
    const indisponivel = ocupadas.has(h) || h < horaMinima;
    if (!indisponivel) {
      if (primeiraLivre === null) primeiraLivre = h;
      if (h === anterior) anteriorValida = true;
    }
    opcoes += `<option value="${h}" ${indisponivel ? "disabled" : ""}>${hora(h)}</option>`;
  }
  inicio.innerHTML = primeiraLivre === null ? '<option value="">Sem horários</option>' : opcoes;
  if (primeiraLivre !== null) inicio.value = anteriorValida ? anterior : primeiraLivre;

  aviso.classList.toggle("hidden", !ocupadas.size);
  aviso.textContent = ocupadas.size ? `Já reservado neste dia: ${faixasOcupadas(ocupadas)}` : "";

  atualizarHorarioFim();
  atualizarResumoReserva();
}

function atualizarHorarioFim() {
  const espacoId = parseInt(document.getElementById("agendamentoEspacoId").value);
  const dia = document.getElementById("agendamentoData").value;
  const inicio = parseInt(document.getElementById("agendamentoInicio").value);
  const fim = document.getElementById("agendamentoFim");

  if (isNaN(inicio)) {
    fim.innerHTML = '<option value="">--:--</option>';
    return;
  }

  // O término vai até o fechamento ou até a próxima reserva do dia.
  const ocupadas = horasOcupadas(espacoId, dia);
  const anterior = parseInt(fim.value);
  const horas = [];
  for (let h = inicio + 1; h <= HORA_FECHAMENTO; h++) {
    horas.push(h);
    if (ocupadas.has(h)) break;
  }
  fim.innerHTML = horas.map((h) => `<option value="${h}">${hora(h)}</option>`).join("");
  fim.value = horas.includes(anterior) ? anterior : horas[Math.min(3, horas.length - 1)];
}

function atualizarResumoReserva() {
  const resumo = document.getElementById("agendamentoResumo");
  const enviar = document.getElementById("agendamentoEnviar");
  const espaco = espacoPorId(parseInt(document.getElementById("agendamentoEspacoId").value));
  const inicio = parseInt(document.getElementById("agendamentoInicio").value);
  const fim = parseInt(document.getElementById("agendamentoFim").value);

  if (!espaco || isNaN(inicio) || isNaN(fim)) {
    resumo.innerHTML = '<p class="text-slate-500 dark:text-slate-400">Escolha o espaço, a data e o horário para ver o valor.</p>';
    enviar.textContent = "Confirmar Reserva";
    return;
  }

  const horas = fim - inicio;
  const v = calcularValores(espaco, horas);
  const convidados = parseInt(document.getElementById("agendamentoConvidados").value) || 0;
  const linha = (rotulo, valor) =>
    `<div class="flex justify-between text-slate-600 dark:text-slate-300"><span>${rotulo}</span><span>${moeda(valor)}</span></div>`;

  resumo.innerHTML = `
    ${linha(`${moeda(espaco.precoHora)} × ${horas}h`, v.subtotal)}
    ${v.limpeza ? linha("Taxa de limpeza", v.limpeza) : ""}
    ${v.servico ? linha("Taxa de serviço (5%)", v.servico) : ""}
    <div class="flex justify-between font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-700 pt-1.5"><span>Total</span><span>${v.total ? moeda(v.total) : "Gratuito"}</span></div>
    ${convidados > espaco.capacidade ? `<p class="text-xs font-semibold text-rose-600 dark:text-rose-400 pt-1">Este espaço comporta até ${espaco.capacidade} convidados.</p>` : ""}`;
  enviar.textContent = espaco.reservaImediata ? "Confirmar Reserva" : "Solicitar Reserva";
}

function enviarReserva(e) {
  e.preventDefault();
  const user = obterUsuarioLogado();
  if (!user) return;

  const espaco = espacoPorId(parseInt(document.getElementById("agendamentoEspacoId").value));
  const dia = document.getElementById("agendamentoData").value;
  const inicio = parseInt(document.getElementById("agendamentoInicio").value);
  const fim = parseInt(document.getElementById("agendamentoFim").value);
  const convidados = parseInt(document.getElementById("agendamentoConvidados").value);

  if (!espaco || isNaN(inicio) || isNaN(fim)) return mostrarAviso("Não há horários disponíveis nesta data.", "erro");
  if (convidados > espaco.capacidade) return mostrarAviso(`Este espaço comporta até ${espaco.capacidade} convidados.`, "erro");
  const ocupadas = horasOcupadas(espaco.id, dia);
  for (let h = inicio; h < fim; h++) {
    if (ocupadas.has(h)) return mostrarAviso("Este horário acabou de ser reservado. Escolha outro.", "erro");
  }

  const lista = DB.ler("reservas");
  const id = DB.proximoId(lista);
  const status = espaco.reservaImediata ? "CONFIRMADA" : "PENDENTE";
  const reserva = {
    id,
    codigo: `CV-${1000 + id}`,
    espacoId: espaco.id,
    usuarioId: user.id,
    inicio: dataHora(dia, inicio),
    fim: dataHora(dia, fim),
    convidados,
    tipoEvento: document.getElementById("agendamentoTipoEvento").value,
    observacoes: document.getElementById("agendamentoObservacoes").value.trim(),
    valores: calcularValores(espaco, fim - inicio),
    status,
    criadoEm: new Date().toISOString(),
  };
  lista.push(reserva);
  DB.salvar("reservas", lista);

  if (status === "CONFIRMADA") {
    notificar(user.id, "calendar-check", `Sua reserva no ${espaco.nome} está confirmada.`);
    notificarAdmins("calendar-check", `${user.nome} reservou o ${espaco.nome} (${reserva.codigo}).`);
  } else {
    notificarAdmins("inbox", `${user.nome} solicitou o ${espaco.nome} (${reserva.codigo}).`);
  }

  fecharModal("modalAgendamento");
  renderizarViewAtual();
  abrirComprovante(id, status === "CONFIRMADA" ? "Reserva confirmada!" : "Solicitação enviada! Você será avisado quando o administrador responder.");
}

function abrirComprovante(id, mensagem = "") {
  const r = DB.ler("reservas").find((x) => x.id === id);
  const e = espacoPorId(r.espacoId);
  const linha = (rotulo, valor) =>
    `<div class="flex justify-between gap-4 py-1.5"><span class="text-slate-500 dark:text-slate-400">${rotulo}</span><span class="font-medium text-right text-slate-900 dark:text-white">${valor}</span></div>`;

  document.getElementById("comprovanteConteudo").innerHTML = `
    ${mensagem ? `<div class="sem-impressao flex items-start gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg px-3 py-2.5 mb-4"><i data-lucide="check-circle-2" class="w-4 h-4 mt-0.5 shrink-0"></i>${esc(mensagem)}</div>` : ""}
    <div class="flex items-start justify-between gap-3 mb-3">
      <div>
        <p class="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Comprovante de reserva</p>
        <h3 class="text-lg font-bold text-slate-900 dark:text-white">${esc(e.nome)}</h3>
      </div>
      ${seloStatus(r)}
    </div>
    <div class="text-sm divide-y divide-slate-200 dark:divide-slate-800">
      ${linha("Código", r.codigo)}
      ${linha("Quando", formatarPeriodo(r))}
      ${linha("Endereço", `${esc(e.endereco)}, ${esc(e.bairro)}`)}
      ${linha("Evento", esc(r.tipoEvento))}
      ${linha("Convidados", r.convidados)}
      ${r.observacoes ? linha("Observações", esc(r.observacoes)) : ""}
      ${linha("Total", r.valores.total ? moeda(r.valores.total) : "Gratuito")}
    </div>
    <div class="sem-impressao flex flex-wrap gap-2 mt-5">
      <button onclick="window.print()" class="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"><i data-lucide="printer" class="w-4 h-4"></i> Imprimir</button>
      <button onclick="baixarCalendario(${r.id})" class="flex-1 py-2 px-3 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"><i data-lucide="calendar-plus" class="w-4 h-4"></i> Agenda</button>
      <button onclick="fecharModal('modalComprovante')" class="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all">Fechar</button>
    </div>`;
  abrirModal("modalComprovante");
  atualizarIcones();
}

function baixarCalendario(id) {
  const r = DB.ler("reservas").find((x) => x.id === id);
  const e = espacoPorId(r.espacoId);
  const formatar = (texto) => `${texto.replace(/[-:]/g, "")}00`;
  const limpar = (texto) => texto.replace(/([,;\\])/g, "\\$1");
  const conteudo = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Comunidade Viva//PT-BR",
    "BEGIN:VEVENT",
    `UID:${r.codigo}@comunidadeviva`,
    `DTSTAMP:${formatar(dataHora(dataIso(new Date()), 0))}`,
    `DTSTART:${formatar(r.inicio)}`,
    `DTEND:${formatar(r.fim)}`,
    `SUMMARY:${limpar(`${r.tipoEvento} - ${e.nome}`)}`,
    `LOCATION:${limpar(`${e.endereco}, ${e.bairro}`)}`,
    `DESCRIPTION:Reserva ${r.codigo}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  baixarArquivo(`reserva-${r.codigo}.ics`, conteudo, "text/calendar");
}

async function cancelarAgendamento(id) {
  const user = obterUsuarioLogado();
  const r = DB.ler("reservas").find((x) => x.id === id);
  const espaco = espacoPorId(r.espacoId);
  const ok = await confirmar("Cancelar esta reserva?", `${espaco.nome} — ${formatarPeriodo(r)}. O horário ficará livre para outras pessoas.`, "Cancelar reserva");
  if (!ok) return;

  atualizarReserva(id, { status: "CANCELADA" });
  if (r.usuarioId === user.id) {
    notificarAdmins("ban", `${user.nome} cancelou a reserva ${r.codigo} do ${espaco.nome}.`);
  } else {
    notificar(r.usuarioId, "ban", `Sua reserva ${r.codigo} no ${espaco.nome} foi cancelada pelo administrador.`);
  }
  mostrarAviso("Reserva cancelada.", "info");
  renderizarViewAtual();
}

// --- FAVORITOS ---
function renderizarFavoritos() {
  const ids = favoritosDoUsuario();
  const lista = espacosAtivos().filter((e) => ids.includes(e.id));
  document.getElementById("gradeFavoritos").innerHTML = lista.length
    ? lista.map(cartaoEspaco).join("")
    : estadoVazio("heart", "Nenhum favorito ainda", "Toque no coração de um espaço para salvá-lo aqui.");
  atualizarIcones();
}

// --- MINHAS RESERVAS ---
const ABAS_RESERVAS = {
  proximas: { label: "Próximas", status: ["PENDENTE", "CONFIRMADA"] },
  anteriores: { label: "Anteriores", status: ["CONCLUIDA", "EXPIRADA"] },
  canceladas: { label: "Canceladas", status: ["CANCELADA", "RECUSADA"] },
};

function selecionarAbaReservas(aba) {
  abaReservas = aba;
  renderizarReservas();
  atualizarIcones();
}

function botaoAba(rotulo, ativo, acao, contagem) {
  return `<button onclick="${acao}" class="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
    ativo
      ? "bg-blue-600 text-white shadow-sm"
      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
  }">${rotulo}${contagem !== undefined ? ` <span class="${ativo ? "text-blue-100" : "text-slate-400"}">${contagem}</span>` : ""}</button>`;
}

function renderizarReservas() {
  const user = obterUsuarioLogado();
  const minhas = DB.ler("reservas").filter((r) => r.usuarioId === user.id);
  const avaliadas = new Set(DB.ler("avaliacoes").map((a) => a.reservaId));

  document.getElementById("abasReservas").innerHTML = Object.entries(ABAS_RESERVAS)
    .map(([chave, aba]) =>
      botaoAba(aba.label, abaReservas === chave, `selecionarAbaReservas('${chave}')`, minhas.filter((r) => aba.status.includes(statusReal(r))).length)
    )
    .join("");

  const lista = minhas
    .filter((r) => ABAS_RESERVAS[abaReservas].status.includes(statusReal(r)))
    .sort((a, b) => (abaReservas === "proximas" ? a.inicio.localeCompare(b.inicio) : b.inicio.localeCompare(a.inicio)));

  const botaoSec = "px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5";

  document.getElementById("listaReservas").innerHTML = lista.length
    ? lista
        .map((r) => {
          const e = espacoPorId(r.espacoId);
          const status = statusReal(r);
          const podeAvaliar = status === "CONCLUIDA" && !avaliadas.has(r.id);
          return `<article class="flex flex-col sm:flex-row bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            ${fotoEspaco(e, 0, "h-36 sm:h-auto sm:w-48 shrink-0")}
            <div class="flex-1 min-w-0 p-4">
              <div class="flex flex-wrap items-start justify-between gap-2 mb-1">
                <h3 class="font-bold text-slate-900 dark:text-white">${esc(e.nome)}</h3>
                ${seloStatus(r)}
              </div>
              <p class="text-sm text-slate-600 dark:text-slate-300 first-letter:uppercase">${formatarPeriodo(r)}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${esc(r.tipoEvento)} · ${r.convidados} convidados · ${r.valores.total ? moeda(r.valores.total) : "Gratuito"} · ${r.codigo}</p>
              <div class="flex flex-wrap gap-2 mt-3">
                <button onclick="abrirComprovante(${r.id})" class="${botaoSec}"><i data-lucide="receipt" class="w-3.5 h-3.5"></i> Comprovante</button>
                ${abaReservas === "proximas" ? `<button onclick="cancelarAgendamento(${r.id})" class="btn-danger">Cancelar</button>` : ""}
                ${podeAvaliar ? `<button onclick="abrirAvaliacao(${r.id})" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"><i data-lucide="star" class="w-3.5 h-3.5"></i> Avaliar</button>` : ""}
                ${abaReservas !== "proximas" && e.ativo ? `<button onclick="abrirDetalhe(${e.id})" class="${botaoSec}"><i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Reservar de novo</button>` : ""}
              </div>
            </div>
          </article>`;
        })
        .join("")
    : `<div class="grid">${estadoVazio("calendar-x", "Nada por aqui", "Quando você tiver reservas nesta categoria, elas aparecerão aqui.")}</div>`;
  atualizarIcones();
}

// --- AVALIAÇÕES ---
function abrirAvaliacao(reservaId) {
  const r = DB.ler("reservas").find((x) => x.id === reservaId);
  reservaAvaliandoId = reservaId;
  notaAvaliacao = 5;
  document.getElementById("avaliacaoEspacoNome").textContent = espacoPorId(r.espacoId).nome;
  document.getElementById("avaliacaoComentario").value = "";
  renderizarEstrelas();
  abrirModal("modalAvaliacao");
}

function renderizarEstrelas() {
  document.getElementById("avaliacaoEstrelas").innerHTML = [1, 2, 3, 4, 5]
    .map(
      (n) => `<button type="button" onclick="definirNota(${n})" role="radio" aria-checked="${n === notaAvaliacao}" aria-label="${n} de 5" class="p-1 transition-all hover:scale-110">
        <i data-lucide="star" class="w-7 h-7 ${n <= notaAvaliacao ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600"}"></i>
      </button>`
    )
    .join("");
  atualizarIcones();
}

function definirNota(nota) {
  notaAvaliacao = nota;
  renderizarEstrelas();
}

function enviarAvaliacao(e) {
  e.preventDefault();
  const user = obterUsuarioLogado();
  const reserva = DB.ler("reservas").find((r) => r.id === reservaAvaliandoId);
  const espaco = espacoPorId(reserva.espacoId);
  const lista = DB.ler("avaliacoes");
  lista.push({
    id: DB.proximoId(lista),
    espacoId: reserva.espacoId,
    usuarioId: user.id,
    reservaId: reserva.id,
    nota: notaAvaliacao,
    comentario: document.getElementById("avaliacaoComentario").value.trim(),
    data: new Date().toISOString(),
  });
  DB.salvar("avaliacoes", lista);
  notificarAdmins("star", `${user.nome} avaliou o ${espaco.nome} com nota ${notaAvaliacao}.`);
  fecharModal("modalAvaliacao");
  mostrarAviso("Obrigado pela sua avaliação!");
  renderizarViewAtual();
  renderizarHome();
}

// --- SIDEBAR E NOTIFICAÇÕES ---
function renderizarSidebar() {
  const container = document.getElementById("sidebarListaAgendamentos");
  const user = obterUsuarioLogado();
  const admin = eAdmin(user);

  if (!user) {
    container.innerHTML = `<p class="text-xs text-slate-400 italic">Entre na sua conta para acompanhar os seus agendamentos.</p>`;
    return;
  }

  const lista = DB.ler("reservas")
    .filter((r) => ["PENDENTE", "CONFIRMADA"].includes(statusReal(r)) && (admin || r.usuarioId === user.id))
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .slice(0, 5);

  container.innerHTML = lista.length
    ? lista
        .map((r) => {
          const espaco = espacoPorId(r.espacoId);
          const autor = usuarioPorId(r.usuarioId)?.nome || "Usuário";
          return `<div class="agendamento-card" onclick="mostrarView('${admin ? "admin" : "reservas"}')">
            <div class="flex items-center justify-between gap-2 mb-1">
              <strong class="truncate">${esc(espaco.nome)}</strong>
              <small class="text-slate-400 shrink-0">${r.codigo}</small>
            </div>
            ${admin ? `<div class="text-slate-500 dark:text-slate-400"><strong>Por:</strong> ${esc(autor)}</div>` : ""}
            <div class="text-slate-500 dark:text-slate-400 mb-2"><strong>Início:</strong> ${new Date(r.inicio).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</div>
            ${seloStatus(r)}
          </div>`;
        })
        .join("")
    : `<p class="text-xs text-slate-400 italic">Nenhum agendamento ativo.</p>`;
}

function atualizarContadores() {
  const user = obterUsuarioLogado();
  const naoLidas = user ? DB.ler("notificacoes").filter((n) => n.usuarioId === user.id && !n.lida).length : 0;
  document.querySelectorAll(".contador-notificacoes").forEach((el) => {
    el.textContent = naoLidas;
    el.classList.toggle("hidden", !naoLidas);
    el.classList.toggle("inline-flex", !!naoLidas);
  });

  const pendentes = solicitacoesPendentes().length;
  const selo = document.getElementById("navAdminPendentes");
  selo.textContent = pendentes;
  selo.classList.toggle("hidden", !pendentes);
  selo.classList.toggle("inline-flex", !!pendentes);
}

function abrirNotificacoes() {
  if (!exigirLogin()) return;
  const user = obterUsuarioLogado();
  const todas = DB.ler("notificacoes");
  const minhas = todas
    .filter((n) => n.usuarioId === user.id)
    .sort((a, b) => b.data.localeCompare(a.data) || b.id - a.id);

  document.getElementById("listaNotificacoes").innerHTML = minhas.length
    ? minhas
        .map(
          (n) => `<div class="flex items-start gap-3 p-3 rounded-xl ${n.lida ? "" : "bg-blue-50 dark:bg-blue-950/40"}">
            <div class="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400"><i data-lucide="${esc(n.icone)}" class="w-4 h-4"></i></div>
            <div class="min-w-0">
              <p class="text-sm text-slate-800 dark:text-slate-100">${esc(n.texto)}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">${new Date(n.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</p>
            </div>
          </div>`
        )
        .join("")
    : '<p class="text-sm text-slate-500 dark:text-slate-400 py-6 text-center">Você não tem notificações.</p>';

  todas.forEach((n) => {
    if (n.usuarioId === user.id) n.lida = true;
  });
  DB.salvar("notificacoes", todas);
  atualizarContadores();
  abrirModal("modalNotificacoes");
  atualizarIcones();
}

// --- PAINEL ADMINISTRATIVO ---
function solicitacoesPendentes() {
  return DB.ler("reservas")
    .filter((r) => statusReal(r) === "PENDENTE")
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
}

function selecionarAbaAdmin(aba) {
  abaAdmin = aba;
  renderizarAdmin();
  atualizarIcones();
}

function renderizarAdmin() {
  const abas = [
    ["visao", "Visão Geral"],
    ["solicitacoes", "Solicitações", solicitacoesPendentes().length],
    ["reservas", "Reservas Ativas"],
    ["espacos", "Espaços", espacosAtivos().length],
  ];
  document.getElementById("abasAdmin").innerHTML = abas
    .map(([chave, rotulo, contagem]) => botaoAba(rotulo, abaAdmin === chave, `selecionarAbaAdmin('${chave}')`, contagem))
    .join("");

  const conteudo = { visao: adminVisaoGeral, solicitacoes: adminSolicitacoes, reservas: adminReservasAtivas, espacos: adminEspacos };
  document.getElementById("conteudoAdmin").innerHTML = conteudo[abaAdmin]();
  atualizarIcones();
}

function cartaoIndicador(icone, cor, rotulo, valor, detalhe) {
  return `<div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
    <div class="w-10 h-10 rounded-xl ${cor} flex items-center justify-center mb-3"><i data-lucide="${icone}" class="w-5 h-5"></i></div>
    <p class="text-xs font-semibold text-slate-500 dark:text-slate-400">${rotulo}</p>
    <p class="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">${valor}</p>
    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${detalhe}</p>
  </div>`;
}

function escalaArredondada(maximo) {
  if (maximo <= 0) return 100;
  const base = 10 ** Math.floor(Math.log10(maximo));
  return [1, 2, 5, 10].map((m) => m * base).find((v) => v >= maximo);
}

function adminVisaoGeral() {
  const validas = DB.ler("reservas").filter((r) => ["CONFIRMADA", "CONCLUIDA"].includes(statusReal(r)));
  const hoje = new Date();

  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const chave = dataIso(d).slice(0, 7);
    const doMes = validas.filter((r) => r.inicio.startsWith(chave));
    meses.push({
      rotulo: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      nome: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
      receita: doMes.reduce((soma, r) => soma + r.valores.total, 0),
      reservas: doMes.length,
    });
  }
  const atual = meses[5];
  const anterior = meses[4];
  const variacao = anterior.receita ? Math.round(((atual.receita - anterior.receita) / anterior.receita) * 100) : null;
  const avaliacoes = DB.ler("avaliacoes");
  const mediaGeral = avaliacoes.length ? avaliacoes.reduce((s, a) => s + a.nota, 0) / avaliacoes.length : 0;
  const pendentes = solicitacoesPendentes().length;

  const indicadores = [
    cartaoIndicador("wallet", "bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400", "Receita no mês", moeda(atual.receita),
      variacao === null ? "Sem receita no mês anterior" : `${variacao >= 0 ? "+" : ""}${variacao}% em relação ao mês anterior`),
    cartaoIndicador("calendar-check", "bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400", "Reservas no mês", atual.reservas, `${anterior.reservas} no mês anterior`),
    cartaoIndicador("inbox", "bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400", "Solicitações pendentes", pendentes, pendentes ? "Aguardando a sua resposta" : "Tudo em dia"),
    cartaoIndicador("star", "bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400", "Avaliação média", mediaGeral.toFixed(1).replace(".", ","), `${avaliacoes.length} avaliações recebidas`),
  ].join("");

  const escala = escalaArredondada(Math.max(...meses.map((m) => m.receita)));
  const barras = meses
    .map((m) => {
      const altura = (m.receita / escala) * 100;
      const dica = `${m.nome}: ${moeda(m.receita)} em ${m.reservas} ${m.reservas === 1 ? "reserva" : "reservas"}`;
      return `<div tabindex="0" aria-label="${dica}" class="group relative flex-1 h-full flex flex-col justify-end items-center rounded focus:outline-none hover:bg-slate-100/70 dark:hover:bg-slate-800/50">
        <div class="pointer-events-none absolute z-10 hidden group-hover:block group-focus:block w-max max-w-[170px] px-2.5 py-1.5 rounded-lg bg-slate-900 dark:bg-slate-700 text-white text-[11px] font-medium shadow-lg" style="bottom: calc(${altura}% + 6px)">${dica}</div>
        <div class="w-full max-w-[32px] rounded-t bg-blue-600 dark:bg-blue-500" style="height: ${altura}%"></div>
      </div>`;
    })
    .join("");

  const graficoReceita = `<div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
    <h3 class="font-bold text-slate-900 dark:text-white">Receita por mês</h3>
    <p class="text-xs text-slate-500 dark:text-slate-400 mb-5">Reservas confirmadas nos últimos 6 meses</p>
    <div class="flex gap-3">
      <div class="flex flex-col justify-between text-right text-[10px] text-slate-400 h-48 w-14 shrink-0 -my-1">
        <span>${precoCurto(escala)}</span><span>${precoCurto(escala / 2)}</span><span>R$ 0</span>
      </div>
      <div class="flex-1 min-w-0">
        <div class="relative h-48 border-b border-slate-300 dark:border-slate-600">
          <div class="absolute inset-x-0 top-0 border-t border-slate-100 dark:border-slate-800"></div>
          <div class="absolute inset-x-0 top-1/2 border-t border-slate-100 dark:border-slate-800"></div>
          <div class="absolute inset-0 flex items-end gap-2 sm:gap-4">${barras}</div>
        </div>
        <div class="flex gap-2 sm:gap-4 mt-2">${meses.map((m) => `<span class="flex-1 text-center text-[11px] text-slate-500 dark:text-slate-400 capitalize">${m.rotulo}</span>`).join("")}</div>
      </div>
    </div>
    <details class="mt-4 text-xs text-slate-500 dark:text-slate-400">
      <summary class="cursor-pointer font-semibold">Ver como tabela</summary>
      <table class="w-full mt-2">
        <thead><tr class="text-left"><th class="py-1 font-semibold">Mês</th><th class="font-semibold text-right">Reservas</th><th class="font-semibold text-right">Receita</th></tr></thead>
        <tbody>${meses.map((m) => `<tr class="border-t border-slate-100 dark:border-slate-800"><td class="py-1 capitalize">${m.nome}</td><td class="text-right">${m.reservas}</td><td class="text-right">${moeda(m.receita)}</td></tr>`).join("")}</tbody>
      </table>
    </details>
  </div>`;

  const ranking = espacosAtivos()
    .map((e) => ({ nome: e.nome, total: validas.filter((r) => r.espacoId === e.id).length }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);
  const maiorRanking = Math.max(1, ...ranking.map((r) => r.total));

  const graficoEspacos = `<div class="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
    <h3 class="font-bold text-slate-900 dark:text-white">Espaços mais reservados</h3>
    <p class="text-xs text-slate-500 dark:text-slate-400 mb-5">Total de reservas confirmadas</p>
    <div class="space-y-3.5">
      ${ranking
        .map(
          (r) => `<div title="${esc(r.nome)}: ${r.total} reservas">
            <div class="flex justify-between gap-3 text-xs mb-1"><span class="truncate font-medium text-slate-700 dark:text-slate-200">${esc(r.nome)}</span><span class="font-semibold text-slate-900 dark:text-white">${r.total}</span></div>
            <div class="h-2 rounded-r bg-blue-600 dark:bg-blue-500" style="width: ${Math.max((r.total / maiorRanking) * 100, 1)}%"></div>
          </div>`
        )
        .join("")}
    </div>
  </div>`;

  return `<div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">${indicadores}</div>
    <div class="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-5">${graficoReceita}${graficoEspacos}</div>`;
}

function linhaReservaAdmin(r, acoes) {
  const e = espacoPorId(r.espacoId);
  const autor = usuarioPorId(r.usuarioId);
  return `<article class="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
    <div class="flex-1 min-w-[240px]">
      <div class="flex flex-wrap items-center gap-2 mb-1">
        <h3 class="font-bold text-slate-900 dark:text-white">${esc(e.nome)}</h3>
        ${seloStatus(r)}
      </div>
      <p class="text-sm text-slate-600 dark:text-slate-300 first-letter:uppercase">${formatarPeriodo(r)}</p>
      <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${esc(autor?.nome || "Usuário")} · ${esc(r.tipoEvento)} · ${r.convidados} convidados · ${r.valores.total ? moeda(r.valores.total) : "Gratuito"} · ${r.codigo}</p>
      ${r.observacoes ? `<p class="text-xs italic text-slate-500 dark:text-slate-400 mt-1">"${esc(r.observacoes)}"</p>` : ""}
    </div>
    <div class="flex gap-2">${acoes}</div>
  </article>`;
}

function adminSolicitacoes() {
  const lista = solicitacoesPendentes();
  if (!lista.length) return `<div class="grid">${estadoVazio("inbox", "Nenhuma solicitação pendente", "Novos pedidos de reserva aparecerão aqui.")}</div>`;
  return `<div class="space-y-3 max-w-4xl">${lista
    .map((r) =>
      linhaReservaAdmin(
        r,
        `<button onclick="recusarReserva(${r.id})" class="px-3.5 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm font-semibold transition-all">Recusar</button>
         <button onclick="aprovarReserva(${r.id})" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all flex items-center gap-1.5"><i data-lucide="check" class="w-4 h-4"></i> Aprovar</button>`
      )
    )
    .join("")}</div>`;
}

function adminReservasAtivas() {
  const lista = DB.ler("reservas")
    .filter((r) => statusReal(r) === "CONFIRMADA")
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  if (!lista.length) return `<div class="grid">${estadoVazio("calendar-x", "Nenhuma reserva ativa", "As reservas confirmadas aparecerão aqui.")}</div>`;
  return `<div class="space-y-3 max-w-4xl">${lista
    .map((r) => linhaReservaAdmin(r, `<button onclick="cancelarAgendamento(${r.id})" class="btn-danger">Cancelar</button>`))
    .join("")}</div>`;
}

function adminEspacos() {
  const reservas = DB.ler("reservas");
  return `<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">${espacosAtivos()
    .map((e) => {
      const nota = notaDoEspaco(e.id);
      const total = reservas.filter((r) => r.espacoId === e.id && ["CONFIRMADA", "CONCLUIDA"].includes(statusReal(r))).length;
      return `<article class="flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        ${fotoEspaco(e, 0, "w-28 sm:w-36 shrink-0")}
        <div class="flex-1 min-w-0 p-4">
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-bold text-slate-900 dark:text-white leading-snug">${esc(e.nome)}</h3>
            ${textoNota(nota)}
          </div>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${TIPOS_ESPACO[e.tipo].label} · ${esc(e.bairro)}</p>
          <p class="text-xs text-slate-500 dark:text-slate-400">${e.capacidade} pessoas · ${precoCurto(e.precoHora)}${e.precoHora ? "/h" : ""} · ${total} reservas</p>
          <div class="flex gap-2 mt-3">
            <button onclick="abrirDetalhe(${e.id})" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold transition-all">Ver</button>
            <button onclick="abrirModalEditarEspaco(${e.id})" class="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"><i data-lucide="pencil" class="w-3 h-3"></i> Editar</button>
            <button onclick="removerEspaco(${e.id})" class="btn-danger">Remover</button>
          </div>
        </div>
      </article>`;
    })
    .join("")}</div>`;
}

function aprovarReserva(id) {
  const r = DB.ler("reservas").find((x) => x.id === id);
  const espaco = espacoPorId(r.espacoId);
  atualizarReserva(id, { status: "CONFIRMADA" });
  notificar(r.usuarioId, "calendar-check", `Sua reserva ${r.codigo} no ${espaco.nome} foi aprovada!`);
  mostrarAviso("Reserva aprovada. O usuário foi notificado.");
  renderizarViewAtual();
}

async function recusarReserva(id) {
  const r = DB.ler("reservas").find((x) => x.id === id);
  const espaco = espacoPorId(r.espacoId);
  const ok = await confirmar("Recusar esta solicitação?", `${espaco.nome} — ${formatarPeriodo(r)}. O usuário será notificado.`, "Recusar");
  if (!ok) return;
  atualizarReserva(id, { status: "RECUSADA" });
  notificar(r.usuarioId, "x-circle", `Sua solicitação ${r.codigo} no ${espaco.nome} foi recusada.`);
  mostrarAviso("Solicitação recusada.", "info");
  renderizarViewAtual();
}

function exportarReservasCsv() {
  const campo = (valor) => `"${String(valor).replace(/"/g, '""')}"`;
  const linhas = DB.ler("reservas").map((r) =>
    [
      r.codigo,
      espacoPorId(r.espacoId).nome,
      usuarioPorId(r.usuarioId)?.nome || "Usuário",
      r.inicio.replace("T", " "),
      r.fim.replace("T", " "),
      r.tipoEvento,
      r.convidados,
      r.valores.total.toFixed(2).replace(".", ","),
      STATUS[statusReal(r)].label,
    ]
      .map(campo)
      .join(";")
  );
  const cabecalho = ["Código", "Espaço", "Cliente", "Início", "Fim", "Evento", "Convidados", "Total (R$)", "Status"].map(campo).join(";");
  baixarArquivo("reservas-comunidade-viva.csv", `﻿${[cabecalho, ...linhas].join("\r\n")}`, "text/csv;charset=utf-8");
}

async function restaurarDadosDemo() {
  const ok = await confirmar("Restaurar os dados de exemplo?", "Espaços, reservas e contas criadas neste navegador serão substituídos pelos dados iniciais.", "Restaurar");
  if (!ok) return;
  DB.restaurar();
  location.reload();
}

// --- CADASTRO E EDIÇÃO DE ESPAÇOS (ADMIN) ---
function abrirModalEspacoManual() {
  if (!eAdmin(obterUsuarioLogado())) return;
  irParaExplorar("mapa");
  mostrarAviso("Clique em qualquer ponto do mapa para definir a posição do novo espaço.", "info");
}

function abrirModalNovoEspaco(latlng) {
  espacoEditandoId = null;
  document.getElementById("espacoForm").reset();
  document.getElementById("tituloModalEspaco").textContent = "Novo Espaço (Admin)";
  document.getElementById("novoLat").value = latlng.lat.toFixed(6);
  document.getElementById("novoLng").value = latlng.lng.toFixed(6);
  abrirModal("modalCriarEspaco");
}

function abrirModalEditarEspaco(id) {
  const e = espacoPorId(id);
  espacoEditandoId = id;
  document.getElementById("tituloModalEspaco").textContent = "Editar Espaço";
  document.getElementById("novoNome").value = e.nome;
  document.getElementById("novoTipo").value = e.tipo;
  document.getElementById("novoBairro").value = e.bairro;
  document.getElementById("novoEndereco").value = e.endereco;
  document.getElementById("novoCapacidade").value = e.capacidade;
  document.getElementById("novoPreco").value = e.precoHora;
  document.getElementById("novaTaxa").value = e.taxaLimpeza;
  document.getElementById("novaDescricao").value = e.descricao;
  document.getElementById("novasRegras").value = e.regras;
  document.getElementById("novaFoto").value = e.fotos[0] || "";
  document.getElementById("novaImediata").checked = e.reservaImediata;
  document.getElementById("novoLat").value = e.latitude;
  document.getElementById("novoLng").value = e.longitude;
  document.querySelectorAll("#novasComodidades input").forEach((caixa) => {
    caixa.checked = e.comodidades.includes(caixa.value);
  });
  abrirModal("modalCriarEspaco");
}

function salvarEspaco(evento) {
  evento.preventDefault();
  if (!eAdmin(obterUsuarioLogado())) return mostrarAviso("Apenas administradores podem cadastrar espaços.", "erro");

  const lista = DB.ler("espacos");
  const existente = lista.find((e) => e.id === espacoEditandoId);
  const foto = document.getElementById("novaFoto").value.trim();
  const fotosAntigas = existente ? existente.fotos : [];
  const dados = {
    nome: document.getElementById("novoNome").value.trim(),
    tipo: document.getElementById("novoTipo").value,
    bairro: document.getElementById("novoBairro").value.trim(),
    endereco: document.getElementById("novoEndereco").value.trim(),
    capacidade: parseInt(document.getElementById("novoCapacidade").value),
    precoHora: parseFloat(document.getElementById("novoPreco").value),
    taxaLimpeza: parseFloat(document.getElementById("novaTaxa").value),
    descricao: document.getElementById("novaDescricao").value.trim(),
    regras: document.getElementById("novasRegras").value.trim(),
    reservaImediata: document.getElementById("novaImediata").checked,
    latitude: parseFloat(document.getElementById("novoLat").value),
    longitude: parseFloat(document.getElementById("novoLng").value),
    comodidades: [...document.querySelectorAll("#novasComodidades input:checked")].map((c) => c.value),
    fotos: foto ? [foto, ...fotosAntigas.filter((f) => f !== foto)] : fotosAntigas.slice(1),
  };

  if (existente) Object.assign(existente, dados);
  else lista.push({ id: DB.proximoId(lista), ativo: true, ...dados });
  DB.salvar("espacos", lista);

  fecharModal("modalCriarEspaco");
  mostrarAviso(existente ? "Espaço atualizado." : "Espaço cadastrado com sucesso!");
  sincronizarFiltros();
  renderizarViewAtual();
  renderizarHome();
}

async function removerEspaco(id) {
  const espaco = espacoPorId(id);
  const ativas = DB.ler("reservas").filter((r) => r.espacoId === id && ["PENDENTE", "CONFIRMADA"].includes(statusReal(r)));
  if (ativas.length) {
    return mostrarAviso(`${espaco.nome} tem ${ativas.length} reserva(s) ativa(s). Cancele-as antes de remover.`, "erro");
  }
  const ok = await confirmar("Remover este espaço?", `${espaco.nome} deixará de aparecer no catálogo. O histórico de reservas é mantido.`, "Remover");
  if (!ok) return;

  const lista = DB.ler("espacos");
  lista.find((e) => e.id === id).ativo = false;
  DB.salvar("espacos", lista);
  mostrarAviso("Espaço removido do catálogo.", "info");
  renderizarViewAtual();
  renderizarHome();
}
