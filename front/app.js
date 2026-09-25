const API_BASE_URL = "http://localhost:8080/api";

let map;
let markersGroup;

document.addEventListener("DOMContentLoaded", () => {
  verificarSessaoUsuario();

  // Configuração do Leaflet (Mapa)
  const mapElement = document.getElementById("map");
  if (mapElement) {
    map = L.map("map").setView([-27.81, -50.32], 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);

    markersGroup = L.layerGroup().addTo(map);
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    map.on("click", (e) => {
      abrirModalEspaco(e.latlng.lat, e.latlng.lng);
    });
  }

  // LISTENERS DE FORMULÁRIO

  // 1. Enviar Cadastro de Espaço (POST)
  const espacoForm = document.getElementById("espacoForm");
  if (espacoForm) {
    espacoForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        nome: document.getElementById("novoNome")?.value || "",
        tipo: document.getElementById("novoTipo")?.value || "",
        descricao: document.getElementById("novaDescricao")?.value || "",
        latitude: parseFloat(document.getElementById("novoLat")?.value || 0),
        longitude: parseFloat(document.getElementById("novoLng")?.value || 0),
      };

      try {
        const response = await fetch(`${API_BASE_URL}/espacos-publicos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          alert("Espaço cadastrado com sucesso!");
          fecharModalEspaco();
          carregarEspacos();
        } else {
          const errText = await response.text();
          alert(`Erro do Servidor (${response.status}): ${errText}`);
        }
      } catch (error) {
        console.error("Erro no envio:", error);
        alert("Erro de conexão com o servidor.");
      }
    });
  }

  // 2. Enviar Agendamento (POST)
  const agendamentoForm = document.getElementById("agendamentoForm");
  if (agendamentoForm) {
    agendamentoForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const usuarioLogado = obterUsuarioLogado();
      if (!usuarioLogado) {
        alert("Você precisa estar logado para realizar um agendamento.");
        return;
      }

      const payload = {
        dataHoraInicio: document.getElementById("dataInicio")?.value,
        dataHoraFim: document.getElementById("dataFim")?.value,
        usuario: { id: parseInt(usuarioLogado.id) },
        espacoPublico: {
          id: parseInt(document.getElementById("espacoId")?.value),
        },
      };

      try {
        const response = await fetch(`${API_BASE_URL}/agendamentos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          alert("Agendamento criado com sucesso!");
          fecharModalAgendamento();
          agendamentoForm.reset();
          carregarAgendamentos();
        } else {
          const err = await response.text();
          alert(`Erro no agendamento: ${err}`);
        }
      } catch (error) {
        console.error("Erro de requisição:", error);
      }
    });
  }

  // 3. Enviar Cadastro de Usuário (POST)
  const usuarioForm = document.getElementById("usuarioForm");
  if (usuarioForm) {
    usuarioForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        nome: document.getElementById("novoNomeUsuario")?.value || "",
        email: document.getElementById("novoEmailUsuario")?.value || "",
        senha: document.getElementById("novaSenhaUsuario")?.value || "",
      };

      try {
        const response = await fetch(`${API_BASE_URL}/usuarios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const usuarioCriado = await response.json();
          localStorage.setItem("usuarioLogado", JSON.stringify(usuarioCriado));
          alert(`Usuário registrado! Entrando como: ${usuarioCriado.nome}`);
          location.reload();
        } else {
          const errText = await response.text();
          alert(`Erro do Servidor (${response.status}): ${errText}`);
        }
      } catch (error) {
        console.error("Erro no envio do usuário:", error);
        alert("Erro de conexão com o servidor ao cadastrar usuário.");
      }
    });
  }

  // 4. Autenticação de Login (POST)
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = {
        email: document.getElementById("loginEmail")?.value || "",
        senha: document.getElementById("loginSenha")?.value || "",
      };

      try {
        const response = await fetch(`${API_BASE_URL}/usuarios/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const usuarioLogado = await response.json();
          localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));
          alert(`Bem-vindo(a) de volta, ${usuarioLogado.nome}!`);
          location.reload();
        } else {
          const errText = await response.text();
          alert(`Falha no login: ${errText || "E-mail ou senha inválidos."}`);
        }
      } catch (error) {
        console.error("Erro no login:", error);
        alert("Erro ao tentar conectar ao servidor para realizar o login.");
      }
    });
  }

  // Chamadas Iniciais
  carregarEspacos();
  carregarAgendamentos();
});

// --- GESTÃO DE SESSÃO / LOCALSTORAGE ---
function obterUsuarioLogado() {
  const usuarioSalvo = localStorage.getItem("usuarioLogado");
  return usuarioSalvo ? JSON.parse(usuarioSalvo) : null;
}

function verificarSessaoUsuario() {
  const usuario = obterUsuarioLogado();
  const infoDiv = document.getElementById("usuarioLogadoInfo");
  const nomeSpan = document.getElementById("nomeUsuarioLogado");
  const btnEntrar = document.getElementById("btnEntrarHeader");

  if (usuario) {
    if (infoDiv && nomeSpan) {
      nomeSpan.textContent = `${usuario.nome} (ID: ${usuario.id})`;
      infoDiv.style.display = "flex";
    }
    if (btnEntrar) btnEntrar.style.display = "none";
  } else {
    if (infoDiv) infoDiv.style.display = "none";
    if (btnEntrar) btnEntrar.style.display = "inline-flex";
  }
}

function logoutUsuario() {
  localStorage.removeItem("usuarioLogado");
  location.reload();
}

// --- FUNÇÕES DE CONTROLE DE MODAIS ---
function abrirModalAgendamento(espacoId = null) {
  const usuario = obterUsuarioLogado();

  if (!usuario) {
    alert(
      "Você precisa cadastrar ou entrar com um usuário antes de agendar um espaço.",
    );
    abrirModalLogin();
    return;
  }

  const inputNomeExibicao = document.getElementById("nomeUsuarioExibicao");
  const inputUsuarioId = document.getElementById("usuarioId");

  if (inputNomeExibicao)
    inputNomeExibicao.value = `${usuario.nome} (ID: ${usuario.id})`;
  if (inputUsuarioId) inputUsuarioId.value = usuario.id;

  const modal = document.getElementById("modalAgendamento");
  if (modal) modal.style.display = "flex";

  if (espacoId) {
    const inputEspaco = document.getElementById("espacoId");
    if (inputEspaco) inputEspaco.value = espacoId;
  }
}

function fecharModalAgendamento() {
  const modal = document.getElementById("modalAgendamento");
  if (modal) modal.style.display = "none";
}

function abrirModalEspaco(lat, lng) {
  const inputLat = document.getElementById("novoLat");
  const inputLng = document.getElementById("novoLng");
  const modal = document.getElementById("modalCriarEspaco");

  if (inputLat) inputLat.value = lat.toFixed(6);
  if (inputLng) inputLng.value = lng.toFixed(6);
  if (modal) modal.style.display = "flex";
}

function fecharModalEspaco() {
  const modal = document.getElementById("modalCriarEspaco");
  const form = document.getElementById("espacoForm");
  if (modal) modal.style.display = "none";
  if (form) form.reset();
}

function abrirModalUsuario() {
  const modal = document.getElementById("modalCriarUsuario");
  if (modal) modal.style.display = "flex";
}

function fecharModalUsuario() {
  const modal = document.getElementById("modalCriarUsuario");
  const form = document.getElementById("usuarioForm");
  if (modal) modal.style.display = "none";
  if (form) form.reset();
}

function abrirModalLogin() {
  const modal = document.getElementById("modalLogin");
  if (modal) modal.style.display = "flex";
}

function fecharModalLogin() {
  const modal = document.getElementById("modalLogin");
  const form = document.getElementById("loginForm");
  if (modal) modal.style.display = "none";
  if (form) form.reset();
}

// --- CONSULTA API DE ESPAÇOS (GET) ---
async function carregarEspacos() {
  const listaEspacos = document.getElementById("listaEspacos");
  const select = document.getElementById("espacoId");

  try {
    const response = await fetch(`${API_BASE_URL}/espacos-publicos`);
    if (!response.ok) throw new Error(`HTTP: ${response.status}`);

    const espacos = await response.json();

    if (select)
      select.innerHTML = '<option value="">Selecione um local</option>';
    if (listaEspacos) listaEspacos.innerHTML = "";
    if (markersGroup) markersGroup.clearLayers();

    if (!espacos || espacos.length === 0) {
      if (listaEspacos) {
        listaEspacos.innerHTML = `<p style="color: #64748b; font-size: 14px;">Nenhum espaço cadastrado.</p>`;
      }
      return;
    }

    espacos.forEach((espaco) => {
      if (espaco.latitude && espaco.longitude && markersGroup) {
        const marker = L.marker([espaco.latitude, espaco.longitude]);

        const popupContent = `
          <div style="text-align: center;">
            <b style="font-size: 14px;">${espaco.nome}</b><br>
            <span style="font-size: 12px; color: #64748b;">${espaco.tipo}</span><br>
            <p style="margin: 6px 0; font-size: 12px;">${espaco.descricao || ""}</p>
            <button onclick="abrirModalAgendamento(${espaco.id})" 
                    style="background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600;">
              Agendar Aqui
            </button>
          </div>
        `;

        marker.bindPopup(popupContent);
        markersGroup.addLayer(marker);

        if (listaEspacos) {
          const cardItem = document.createElement("div");
          cardItem.style.padding = "10px";
          cardItem.style.marginBottom = "8px";
          cardItem.style.border = "1px solid #e2e8f0";
          cardItem.style.borderRadius = "8px";
          cardItem.style.cursor = "pointer";
          cardItem.innerHTML = `
            <strong style="display:block; font-size:14px; color: #2563eb;">${espaco.nome}</strong>
            <span style="font-size:12px; color:#64748b;">${espaco.tipo}</span>
          `;
          cardItem.onclick = () => {
            map.setView([espaco.latitude, espaco.longitude], 15);
            marker.openPopup();
          };
          listaEspacos.appendChild(cardItem);
        }
      }

      if (select) {
        const option = document.createElement("option");
        option.value = espaco.id;
        option.textContent = `${espaco.nome} (${espaco.tipo})`;
        select.appendChild(option);
      }
    });
  } catch (error) {
    console.error("Erro ao carregar espaços:", error);
  }
}

// --- CONSULTA E DELEÇÃO DE AGENDAMENTOS ---
async function carregarAgendamentos() {
  const tabela = document.getElementById("tabelaAgendamentos");
  if (!tabela) return;

  const usuarioLogado = obterUsuarioLogado();

  try {
    const response = await fetch(`${API_BASE_URL}/agendamentos`);
    if (!response.ok) throw new Error("Erro na requisição");

    const agendamentos = await response.json();
    tabela.innerHTML = "";

    if (!agendamentos || agendamentos.length === 0) {
      tabela.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #64748b;">Nenhum agendamento encontrado.</td></tr>`;
      return;
    }

    agendamentos.forEach((a) => {
      const inicio = new Date(a.dataHoraInicio).toLocaleString("pt-BR");
      const fim = new Date(a.dataHoraFim).toLocaleString("pt-BR");

      const idDonoAgendamento = a.usuario ? a.usuario.id : null;
      const ehDono = usuarioLogado && idDonoAgendamento === usuarioLogado.id;

      const botaoDeletar = ehDono
        ? `<button class="btn-danger" onclick="deletarAgendamento(${a.id})"><i class="fa-solid fa-trash"></i> Cancelar</button>`
        : `<span style="color: #94a3b8; font-size: 12px;">-</span>`;

      const linha = `
        <tr>
          <td>#${a.id}</td>
          <td><strong>${a.usuario ? a.usuario.nome || "ID: " + a.usuario.id : "Usuário " + (a.usuario?.id || "N/A")}</strong></td>
          <td><span class="badge">${a.espacoPublico ? a.espacoPublico.nome : "Local ID: " + (a.espacoPublico?.id || "N/A")}</span></td>
          <td>${inicio}</td>
          <td>${fim}</td>
          <td>${botaoDeletar}</td>
        </tr>
      `;
      tabela.innerHTML += linha;
    });
  } catch (error) {
    console.error("Erro ao carregar agendamentos:", error);
  }
}

async function deletarAgendamento(idAgendamento) {
  if (!confirm("Tem certeza que deseja cancelar este agendamento?")) return;

  try {
    const response = await fetch(
      `${API_BASE_URL}/agendamentos/${idAgendamento}`,
      {
        method: "DELETE",
      },
    );

    if (response.ok || response.status === 204) {
      alert("Agendamento cancelado com sucesso!");
      carregarAgendamentos();
    } else {
      alert(`Erro ao cancelar agendamento (${response.status})`);
    }
  } catch (error) {
    console.error("Erro ao deletar:", error);
    alert("Erro de conexão com o servidor ao excluir.");
  }
}