const API_BASE_URL = "http://localhost:8080/api";

let map;
let markersGroup;

// --- FUNÇÃO AUXILIAR DE VERIFICAÇÃO ADMIN ---
function eAdmin(user) {
  if (!user) return false;
  const permissao = user.role || user.tipoPermissao;
  return permissao && permissao.toUpperCase() === "ADMIN";
}

// --- NAVEGAÇÃO ENTRE TELAS ---
function navegarPara(screenId) {
  const screens = [
    "screenHome",
    "screenLogin",
    "screenRegister",
    "screenAdminLogin",
    "appContainer",
  ];

  screens.forEach((s) => {
    const el = document.getElementById(s);
    if (el) {
      if (s === "appContainer") {
        el.style.display = s === screenId ? "flex" : "none";
      } else if (s === "screenHome") {
        el.style.display = s === screenId ? "block" : "none";
      } else {
        el.style.display = s === screenId ? "flex" : "none";
      }
    }
  });

  if (screenId === "appContainer") {
    setTimeout(() => {
      if (!map) inicializarMapa();
      else map.invalidateSize();
    }, 200);
  }
}

// --- CONTROLE DE SESSÃO ---
function obterUsuarioLogado() {
  const user = localStorage.getItem("usuarioLogado");
  return user ? JSON.parse(user) : null;
}

function verificarSessao() {
  const user = obterUsuarioLogado();
  if (user) {
    document.getElementById("userDisplayName").textContent = user.nome;
    const badge = document.getElementById("userRoleBadge");
    const btnAdminEspaco = document.getElementById("btnCadastrarEspacoAdmin");

    if (eAdmin(user)) {
      if (badge) badge.innerHTML = `<span class="admin-badge">ADMIN</span>`;
      if (btnAdminEspaco) btnAdminEspaco.style.display = "inline-flex";
    } else {
      if (badge) badge.innerHTML = ``;
      if (btnAdminEspaco) btnAdminEspaco.style.display = "none";
    }

    navegarPara("appContainer");
    carregarEspacos();
    carregarAgendamentosSidebar();
  } else {
    // Redireciona para a Home se o usuário não estiver autenticado
    navegarPara("screenHome");
  }
}

function logoutUsuario() {
  localStorage.removeItem("usuarioLogado");
  location.reload();
}

// --- DOM READY ---
document.addEventListener("DOMContentLoaded", () => {
  verificarSessao();

  // Login Comum
  document
    .getElementById("formLogin")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await autenticarUsuario(
        document.getElementById("loginEmail").value,
        document.getElementById("loginSenha").value
      );
    });

  // Login Admin
  document
    .getElementById("formAdminLogin")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await autenticarUsuario(
        document.getElementById("adminEmail").value,
        document.getElementById("adminSenha").value
      );
    });

  // Registro de Usuário (Comum ou Admin)
  document
    .getElementById("formRegister")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const roleSelecionada = document.getElementById("regRole")?.value || "USER";

      const payload = {
        nome: document.getElementById("regNome").value,
        email: document.getElementById("regEmail").value,
        senha: document.getElementById("regSenha").value,
        role: roleSelecionada,
        tipoPermissao: roleSelecionada
      };

      try {
        const res = await fetch(`${API_BASE_URL}/usuarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          alert(
            roleSelecionada === "ADMIN"
              ? "Conta de Administrador criada com sucesso! Faça login."
              : "Conta de Usuário criada com sucesso! Faça login."
          );
          navegarPara("screenLogin");
        } else {
          alert("Erro ao registrar usuário.");
        }
      } catch (err) {
        alert("Erro de conexão com o servidor.");
      }
    });

  // Form Agendamento
  document
    .getElementById("agendamentoForm")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = obterUsuarioLogado();
      if (!user) return;

      const payload = {
        dataHoraInicio: document.getElementById("agendamentoInicio").value,
        dataHoraFim: document.getElementById("agendamentoFim").value,
        usuario: { id: user.id },
        espacoPublico: {
          id: parseInt(document.getElementById("agendamentoEspacoId").value),
        },
      };

      try {
        const res = await fetch(`${API_BASE_URL}/agendamentos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          alert("Agendamento realizado!");
          fecharModalAgendamento();
          carregarAgendamentosSidebar();
        } else {
          const txt = await res.text();
          alert(`Erro: ${txt}`);
        }
      } catch (err) {
        alert("Erro ao conectar com o servidor.");
      }
    });

  // Form Espaço (ADMIN ONLY)
  document
    .getElementById("espacoForm")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = obterUsuarioLogado();
      if (!eAdmin(user)) {
        alert("Apenas administradores podem cadastrar espaços.");
        return;
      }

      const payload = {
        nome: document.getElementById("novoNome").value,
        tipo: document.getElementById("novoTipo").value,
        latitude: parseFloat(document.getElementById("novoLat").value),
        longitude: parseFloat(document.getElementById("novoLng").value),
      };

      try {
        const res = await fetch(`${API_BASE_URL}/espacos-publicos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          alert("Espaço cadastrado pelo Admin!");
          fecharModalEspaco();
          carregarEspacos();
        } else {
          alert("Erro ao cadastrar espaço.");
        }
      } catch (err) {
        alert("Erro de comunicação com o servidor.");
      }
    });
});

// --- AUTENTICAÇÃO ---
async function autenticarUsuario(email, senha) {
  try {
    const res = await fetch(`${API_BASE_URL}/usuarios/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    if (res.ok) {
      const user = await res.json();
      localStorage.setItem("usuarioLogado", JSON.stringify(user));
      verificarSessao();
    } else {
      alert("Credenciais inválidas.");
    }
  } catch (err) {
    alert("Erro de conexão ao autenticar.");
  }
}

// --- MAPA ---
function inicializarMapa() {
  if (map) {
    map.remove();
  }

  map = L.map("map").setView([-27.81, -50.32], 13);

  L.tileLayer("https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png", {
    attribution:
      '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
  }).addTo(map);

  markersGroup = L.layerGroup().addTo(map);

  map.on("click", (e) => {
    const user = obterUsuarioLogado();

    if (eAdmin(user)) {
      const inputLat = document.getElementById("novoLat");
      const inputLng = document.getElementById("novoLng");
      const modal = document.getElementById("modalCriarEspaco");

      if (inputLat && inputLng && modal) {
        inputLat.value = e.latlng.lat.toFixed(6);
        inputLng.value = e.latlng.lng.toFixed(6);
        modal.style.display = "flex";
      } else {
        console.error(
          "Campos da modal de cadastro de espaço não foram encontrados no HTML."
        );
      }
    } else {
      alert(
        "Apenas usuários administradores podem registrar novos espaços no mapa."
      );
    }
  });
}

// --- CONSULTAS API ---
async function carregarEspacos() {
  try {
    const res = await fetch(`${API_BASE_URL}/espacos-publicos`);
    if (!res.ok) return;

    const espacos = await res.json();
    const select = document.getElementById("agendamentoEspacoId");
    if (select)
      select.innerHTML = '<option value="">Selecione um local</option>';
    if (markersGroup) markersGroup.clearLayers();

    espacos.forEach((e) => {
      if (select) {
        select.innerHTML += `<option value="${e.id}">${e.nome} (${e.tipo})</option>`;
      }
      if (e.latitude && e.longitude && markersGroup) {
        const marker = L.marker([e.latitude, e.longitude]);
        marker.bindPopup(
          `<b>${e.nome}</b><br>${e.tipo}<br><button onclick="abrirModalAgendamento(${e.id})" style="margin-top:6px; cursor:pointer;">Agendar</button>`
        );
        markersGroup.addLayer(marker);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

async function carregarAgendamentosSidebar() {
  const container = document.getElementById("sidebarListaAgendamentos");
  if (!container) return;

  const user = obterUsuarioLogado();

  try {
    const res = await fetch(`${API_BASE_URL}/agendamentos`);
    if (!res.ok) return;

    const agendamentos = await res.json();
    container.innerHTML = "";

    if (!agendamentos || agendamentos.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 13px;">Nenhum agendamento ativo.</p>`;
      return;
    }

    agendamentos.forEach((a) => {
      const inicio = new Date(a.dataHoraInicio).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
      const ehDonoOuAdmin = user && (a.usuario?.id === user.id || eAdmin(user));

      const card = document.createElement("div");
      card.className = "agendamento-card";
      card.innerHTML = `
        <header>
          <span>${a.espacoPublico?.nome || "Espaço"}</span>
          <small>#${a.id}</small>
        </header>
        <div><strong>Por:</strong> ${a.usuario?.nome || "Usuário"}</div>
        <div><strong>Início:</strong> ${inicio}</div>
        ${
          ehDonoOuAdmin
            ? `<button class="btn-danger" style="margin-top: 8px; width:100%;" onclick="cancelarAgendamento(${a.id})">Cancelar</button>`
            : ""
        }
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error(err);
  }
}

async function cancelarAgendamento(id) {
  if (!confirm("Deseja cancelar esta reserva?")) return;
  try {
    const res = await fetch(`${API_BASE_URL}/agendamentos/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      carregarAgendamentosSidebar();
    } else {
      alert("Erro ao cancelar.");
    }
  } catch (err) {
    alert("Erro ao conectar.");
  }
}

// --- MODAIS ---
function abrirModalAgendamento(espacoId = null) {
  document.getElementById("modalAgendamento").style.display = "flex";
  if (espacoId) document.getElementById("agendamentoEspacoId").value = espacoId;
}

function fecharModalAgendamento() {
  document.getElementById("modalAgendamento").style.display = "none";
}

function abrirModalEspacoManual() {
  alert(
    "Clique em qualquer ponto do mapa para definir a posição do novo espaço!"
  );
}

function fecharModalEspaco() {
  document.getElementById("modalCriarEspaco").style.display = "none";
}