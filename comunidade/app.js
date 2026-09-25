const API_BASE_URL = 'http://localhost:8080/api';

// Inicializar o Mapa apontado para coordenadas centrais
const map = L.map('map').setView([-27.87, -50.22], 13); // Altere para a latitude/longitude da sua região

// Adicionar a camada do OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Função para carregar os Espaços Públicos da API e exibi-los no Mapa e no Select
async function carregarEspacos() {
  try {
    const response = await fetch(`${API_BASE_URL}/espacos-publicos`);
    const espacos = await response.json();

    const select = document.getElementById('espacoId');
    select.innerHTML = '<option value="">Selecione um espaço</option>';

    espacos.forEach(espaco => {
      // 1. Adicionar Marcador no Mapa
      const marker = L.marker([espaco.latitude, espaco.longitude]).addTo(map);
      marker.bindPopup(`<b>${espaco.nome}</b><br>${espaco.tipo}<br>${espaco.descricao || ''}`);

      // 2. Preencher a lista suspensa (Select)
      const option = document.createElement('option');
      option.value = espaco.id;
      option.textContent = `${espaco.nome} (${espaco.tipo})`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Erro ao carregar espaços públicos:', error);
  }
}

// Submeter o Formulário de Agendamento para o Backend Spring Boot
document.getElementById('agendamentoForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const usuarioId = document.getElementById('usuarioId').value;
  const espacoId = document.getElementById('espacoId').value;
  const dataInicio = document.getElementById('dataInicio').value;
  const dataFim = document.getElementById('dataFim').value;

  const payload = {
    dataHoraInicio: dataInicio,
    dataHoraFim: dataFim,
    usuario: { id: parseInt(usuarioId) },
    espacoPublico: { id: parseInt(espacoId) }
  };

  try {
    const response = await fetch(`${API_BASE_URL}/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      alert('Agendamento realizado com sucesso!');
      document.getElementById('agendamentoForm').reset();
    } else {
      const erroMensagem = await response.text();
      alert(`Erro no agendamento: ${erroMensagem}`);
    }
  } catch (error) {
    console.error('Erro ao conectar com a API:', error);
    alert('Erro ao conectar com o servidor.');
  }
});

// Executar ao carregar a página
carregarEspacos();