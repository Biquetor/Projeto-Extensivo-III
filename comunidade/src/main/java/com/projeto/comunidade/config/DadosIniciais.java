package com.projeto.comunidade.config;

import com.projeto.comunidade.model.Agendamento;
import com.projeto.comunidade.model.Avaliacao;
import com.projeto.comunidade.model.EspacoPublico;
import com.projeto.comunidade.model.Favorito;
import com.projeto.comunidade.model.Usuario;
import com.projeto.comunidade.repository.AgendamentoRepository;
import com.projeto.comunidade.repository.AvaliacaoRepository;
import com.projeto.comunidade.repository.EspacoPublicoRepository;
import com.projeto.comunidade.repository.FavoritoRepository;
import com.projeto.comunidade.repository.UsuarioRepository;
import com.projeto.comunidade.service.AgendamentoService;
import com.projeto.comunidade.service.NotificacaoService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Preenche um banco vazio com dados fictícios de demonstração.
 * Se já existirem usuários ou espaços, nada é alterado.
 */
@Component
public class DadosIniciais implements CommandLineRunner {

    private static final String[] COMENTARIOS = {
            "Lugar lindo e muito bem cuidado, nossos convidados adoraram.",
            "Atendimento atencioso do início ao fim. Reservaria novamente.",
            "Boa estrutura e localização fácil de encontrar.",
            "Superou as expectativas! Tudo estava pronto no horário combinado.",
            "Espaço bom, mas o estacionamento lotou rápido.",
            "Excelente custo-benefício para o nosso evento.",
            "Funcional e organizado, atendeu ao que precisávamos.",
            "Ambiente acolhedor, fez toda a diferença na nossa festa.",
    };
    private static final int[] NOTAS = {5, 5, 4, 5, 4, 5, 4, 5};
    private static final String[] EVENTOS = {
            "Aniversário", "Casamento", "Confraternização", "Palestra ou workshop", "Festa infantil",
    };

    private final UsuarioRepository usuarioRepository;
    private final EspacoPublicoRepository espacoRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final AvaliacaoRepository avaliacaoRepository;
    private final FavoritoRepository favoritoRepository;
    private final AgendamentoService agendamentoService;
    private final NotificacaoService notificacaoService;

    public DadosIniciais(UsuarioRepository usuarioRepository,
                         EspacoPublicoRepository espacoRepository,
                         AgendamentoRepository agendamentoRepository,
                         AvaliacaoRepository avaliacaoRepository,
                         FavoritoRepository favoritoRepository,
                         AgendamentoService agendamentoService,
                         NotificacaoService notificacaoService) {
        this.usuarioRepository = usuarioRepository;
        this.espacoRepository = espacoRepository;
        this.agendamentoRepository = agendamentoRepository;
        this.avaliacaoRepository = avaliacaoRepository;
        this.favoritoRepository = favoritoRepository;
        this.agendamentoService = agendamentoService;
        this.notificacaoService = notificacaoService;
    }

    @Override
    public void run(String... args) {
        if (usuarioRepository.count() > 0 || espacoRepository.count() > 0) {
            return;
        }

        Usuario admin = usuario("Administrador", "admin@comunidade.com", "admin123", "ADMIN");
        Usuario ana = usuario("Ana Beatriz Lima", "usuario@comunidade.com", "usuario123", "USER");
        Usuario carlos = usuario("Carlos Mendes", "carlos@exemplo.com", "123456", "USER");
        Usuario fernanda = usuario("Fernanda Rocha", "fernanda@exemplo.com", "123456", "USER");
        Usuario rafael = usuario("Rafael Duarte", "rafael@exemplo.com", "123456", "USER");
        List<Usuario> clientes = List.of(ana, carlos, fernanda, rafael);

        List<EspacoPublico> espacos = criarEspacos();

        // Histórico dos últimos meses (alimenta os gráficos e as avaliações).
        for (int i = 0; i < 34; i++) {
            EspacoPublico espaco = espacos.get((i * 5) % 8);
            Usuario cliente = clientes.get((i + i / 8) % 4);
            int horaInicio = new int[]{9, 14, 18, 10, 19}[i % 5];
            int duracao = new int[]{4, 5, 4, 6, 3}[i % 5];
            String status = i % 9 == 8 ? Agendamento.CANCELADA : Agendamento.CONFIRMADA;
            Agendamento reserva = reserva(espaco, cliente, -(2 + i * 5), horaInicio, horaInicio + duracao,
                    status, EVENTOS[i % 5], 30 + (i % 6) * 10);

            if (Agendamento.CONFIRMADA.equals(status) && cliente != ana && i % 3 != 2) {
                int indice = (i + (i / 8) * 3) % NOTAS.length;
                avaliacao(reserva, NOTAS[indice], COMENTARIOS[indice]);
            }
        }

        Agendamento reservaPraca = reserva(espacos.get(8), fernanda, -20, 15, 18, Agendamento.CONFIRMADA, "Reunião comunitária", 80);
        avaliacao(reservaPraca, 5, "Ótimo lugar para reunir os vizinhos no fim da tarde.");

        // Próximos eventos e solicitações aguardando aprovação.
        reserva(espacos.get(0), ana, 5, 18, 23, Agendamento.CONFIRMADA, "Aniversário", 80);
        reserva(espacos.get(0), rafael, 5, 9, 13, Agendamento.CONFIRMADA, "Confraternização", 100);
        reserva(espacos.get(3), ana, 12, 9, 12, Agendamento.PENDENTE, "Palestra ou workshop", 60);
        reserva(espacos.get(2), carlos, 3, 10, 18, Agendamento.PENDENTE, "Casamento", 120);
        reserva(espacos.get(4), fernanda, 2, 14, 18, Agendamento.PENDENTE, "Festa infantil", 30);
        reserva(espacos.get(1), carlos, 9, 19, 23, Agendamento.CONFIRMADA, "Confraternização", 90);
        reserva(espacos.get(6), fernanda, 7, 9, 15, Agendamento.CONFIRMADA, "Reunião comunitária", 150);
        reserva(espacos.get(5), rafael, 1, 19, 21, Agendamento.CONFIRMADA, "Evento esportivo", 40);
        reserva(espacos.get(7), ana, 20, 14, 17, Agendamento.CANCELADA, "Reunião comunitária", 40);

        favorito(ana, espacos.get(2));
        favorito(ana, espacos.get(3));

        notificacaoService.notificar(ana, "calendar-check", "Sua reserva no Salão Imperial foi confirmada.");
        notificacaoService.notificar(ana, "star", "Como foi o seu último evento? Avalie o espaço em Minhas Reservas.");
        notificacaoService.notificar(admin, "inbox", "Há novas solicitações de reserva aguardando sua aprovação.");
    }

    private Usuario usuario(String nome, String email, String senha, String role) {
        Usuario usuario = new Usuario();
        usuario.setNome(nome);
        usuario.setEmail(email);
        usuario.setSenha(senha);
        usuario.setRole(role);
        return usuarioRepository.save(usuario);
    }

    private Agendamento reserva(EspacoPublico espaco, Usuario cliente, int deslocamentoDias, int horaInicio, int horaFim,
                                String status, String tipoEvento, int convidados) {
        LocalDate dia = LocalDate.now().plusDays(deslocamentoDias);
        Agendamento reserva = new Agendamento();
        reserva.setEspacoPublico(espaco);
        reserva.setUsuario(cliente);
        reserva.setDataHoraInicio(dia.atTime(horaInicio, 0));
        reserva.setDataHoraFim(dia.atTime(horaFim, 0));
        reserva.setStatus(status);
        reserva.setTipoEvento(tipoEvento);
        reserva.setConvidados(convidados);
        reserva.setCriadoEm(dia.minusDays(14).atStartOfDay());
        agendamentoService.calcularValores(reserva, espaco);
        return agendamentoRepository.save(reserva);
    }

    private void avaliacao(Agendamento reserva, int nota, String comentario) {
        Avaliacao avaliacao = new Avaliacao();
        avaliacao.setAgendamento(reserva);
        avaliacao.setUsuario(reserva.getUsuario());
        avaliacao.setEspacoPublico(reserva.getEspacoPublico());
        avaliacao.setNota(nota);
        avaliacao.setComentario(comentario);
        avaliacao.setData(reserva.getDataHoraFim());
        avaliacaoRepository.save(avaliacao);
    }

    private void favorito(Usuario usuario, EspacoPublico espaco) {
        Favorito favorito = new Favorito();
        favorito.setUsuario(usuario);
        favorito.setEspacoPublico(espaco);
        favoritoRepository.save(favorito);
    }

    private List<EspacoPublico> criarEspacos() {
        List<EspacoPublico> espacos = new ArrayList<>();
        espacos.add(espaco("Salão Imperial", "SALAO_FESTAS", "Centro", "Rua das Palmeiras, 120", -27.8142, -50.3264, 250, 320, 280, false,
                "Salão clássico com lustres, pista de dança e copa de apoio. Ideal para casamentos, formaturas e grandes celebrações no coração da cidade.",
                "Som permitido até as 23h. Decoração sem uso de pregos ou fitas nas paredes.",
                List.of("estacionamento", "wifi", "ar", "cozinha", "som", "acessibilidade", "banheiros", "palco", "mesas"),
                "1519167758481-83f550bb49b3", "1519225421980-715cb0215aed", "1555244162-803834f70033"));
        espacos.add(espaco("Galpão das Luzes", "SALAO_FESTAS", "Universitário", "Av. dos Tropeiros, 845", -27.7985, -50.3338, 150, 240, 180, true,
                "Galpão rústico com estrutura de madeira, varais de luz e piso amplo. Um clima acolhedor para festas e confraternizações.",
                "Proibido fogos de artifício. Limpeza básica inclusa.",
                List.of("estacionamento", "wifi", "som", "banheiros", "mesas", "cozinha"),
                "1510076857177-7470076d4098", "1527529482837-4698179dc6ce", "1464366400600-7168b8af9bc3"));
        espacos.add(espaco("Chácara Recanto Verde", "CHACARA", "Guarujá", "Estrada do Recanto, km 3", -27.8345, -50.2925, 200, 280, 350, false,
                "Jardins, gazebo e amplo gramado para cerimônias ao ar livre, com estrutura de apoio para buffet e área coberta em caso de chuva.",
                "Música ao vivo mediante aviso prévio. Animais de estimação sob consulta.",
                List.of("estacionamento", "arLivre", "churrasqueira", "cozinha", "banheiros", "mesas", "som"),
                "1469371670807-013ccf25f16a", "1523438885200-e635ba2c371e", "1519225421980-715cb0215aed"));
        espacos.add(espaco("Auditório Prisma", "AUDITORIO", "Coral", "Rua Marechal Deodoro, 410", -27.8068, -50.3122, 180, 200, 90, true,
                "Auditório climatizado com projeção, som profissional e poltronas confortáveis. Perfeito para palestras, workshops e formaturas.",
                "Não é permitido consumo de alimentos na plateia.",
                List.of("wifi", "ar", "som", "projetor", "acessibilidade", "banheiros", "palco"),
                "1587825140708-dfaf72ae4b04", "1540575467063-178a50c2df87", "1475721027785-f74eccf877e2"));
        espacos.add(espaco("Espaço Balão Mágico", "SALAO_FESTAS", "Copacabana", "Rua dos Girassóis, 77", -27.8215, -50.3098, 70, 130, 80, true,
                "Salão colorido e seguro, pensado para festas infantis, com cozinha de apoio e mesas prontas para receber a família.",
                "Crianças devem estar acompanhadas por um responsável.",
                List.of("wifi", "ar", "cozinha", "som", "banheiros", "mesas"),
                "1530103862676-de8c9debad1d", "1464366400600-7168b8af9bc3"));
        espacos.add(espaco("Ginásio Bairro Coral", "QUADRA", "Coral", "Rua do Esporte, 15", -27.8021, -50.3046, 120, 70, 0, true,
                "Quadra poliesportiva coberta para treinos, campeonatos e eventos esportivos da comunidade.",
                "Uso obrigatório de calçado apropriado.",
                List.of("banheiros", "estacionamento", "acessibilidade"),
                "1546519638-68e109498ffc"));
        espacos.add(espaco("Parque das Araucárias", "PARQUE", "Santa Helena", "Av. das Araucárias, s/n", -27.7905, -50.3102, 300, 60, 50, false,
                "Área verde com alamedas e clareiras para piqueniques, feiras e eventos abertos ao público.",
                "Recolha todo o lixo ao final do evento. Som apenas em volume moderado.",
                List.of("arLivre", "banheiros", "estacionamento", "acessibilidade"),
                "1519331379826-f10be5486c6f", "1441974231531-c6227db76b6e"));
        espacos.add(espaco("Centro Comunitário Santa Helena", "CENTRO_COMUNITARIO", "Santa Helena", "Rua da Comunidade, 200", -27.8262, -50.3411, 100, 45, 40, false,
                "Espaço multiuso da associação de moradores para reuniões, cursos e celebrações do bairro.",
                "Devolver as chaves à associação ao final do uso.",
                List.of("wifi", "cozinha", "banheiros", "mesas", "projetor"),
                "1517457373958-b7bdd4587205", "1464366400600-7168b8af9bc3"));
        espacos.add(espaco("Praça do Coreto", "PRACA", "Centro", "Praça do Coreto, s/n", -27.8112, -50.3198, 400, 0, 0, false,
                "Praça pública com coreto para apresentações culturais e encontros comunitários. Uso gratuito mediante aprovação.",
                "Eventos precisam ser abertos ao público.",
                List.of("arLivre", "acessibilidade"),
                "1441974231531-c6227db76b6e"));
        return espacos;
    }

    private EspacoPublico espaco(String nome, String tipo, String bairro, String endereco, double latitude, double longitude,
                                 int capacidade, double precoHora, double taxaLimpeza, boolean reservaImediata,
                                 String descricao, String regras, List<String> comodidades, String... fotos) {
        EspacoPublico espaco = new EspacoPublico();
        espaco.setNome(nome);
        espaco.setTipo(tipo);
        espaco.setBairro(bairro);
        espaco.setEndereco(endereco);
        espaco.setLatitude(latitude);
        espaco.setLongitude(longitude);
        espaco.setCapacidade(capacidade);
        espaco.setPrecoHora(precoHora);
        espaco.setTaxaLimpeza(taxaLimpeza);
        espaco.setReservaImediata(reservaImediata);
        espaco.setDescricao(descricao);
        espaco.setRegras(regras);
        espaco.setAtivo(true);
        espaco.setComodidades(new ArrayList<>(comodidades));
        List<String> urls = new ArrayList<>();
        for (String foto : fotos) {
            urls.add("https://images.unsplash.com/photo-" + foto + "?q=80&w=1000&auto=format&fit=crop");
        }
        espaco.setFotos(urls);
        return espacoRepository.save(espaco);
    }
}
