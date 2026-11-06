package com.projeto.comunidade.service;

import com.projeto.comunidade.model.Agendamento;
import com.projeto.comunidade.model.EspacoPublico;
import com.projeto.comunidade.model.Usuario;
import com.projeto.comunidade.repository.AgendamentoRepository;
import com.projeto.comunidade.repository.EspacoPublicoRepository;
import com.projeto.comunidade.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AgendamentoService {

    private static final double TAXA_SERVICO = 0.05;
    private static final int HORA_ABERTURA = 7;
    private static final int HORA_FECHAMENTO = 23;

    private final AgendamentoRepository agendamentoRepository;
    private final UsuarioRepository usuarioRepository;
    private final EspacoPublicoRepository espacoPublicoRepository;
    private final NotificacaoService notificacaoService;

    public AgendamentoService(AgendamentoRepository agendamentoRepository,
                              UsuarioRepository usuarioRepository,
                              EspacoPublicoRepository espacoPublicoRepository,
                              NotificacaoService notificacaoService) {
        this.agendamentoRepository = agendamentoRepository;
        this.usuarioRepository = usuarioRepository;
        this.espacoPublicoRepository = espacoPublicoRepository;
        this.notificacaoService = notificacaoService;
    }

    public List<Agendamento> listarTodos() {
        return agendamentoRepository.findAll();
    }

    public Agendamento salvar(Agendamento agendamento) {
        Usuario usuario = usuarioRepository.findById(agendamento.getUsuario().getId())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado!"));
        EspacoPublico espaco = espacoPublicoRepository.findById(agendamento.getEspacoPublico().getId())
                .orElseThrow(() -> new RuntimeException("Espaço não encontrado!"));

        validar(agendamento, espaco);

        boolean conflito = agendamentoRepository.existeConflitoDeHorario(
                espaco.getId(),
                agendamento.getDataHoraInicio(),
                agendamento.getDataHoraFim()
        );

        if (conflito) {
            throw new RuntimeException("Já existe um agendamento para este espaço no horário selecionado!");
        }

        agendamento.setId(null);
        agendamento.setUsuario(usuario);
        agendamento.setEspacoPublico(espaco);
        agendamento.setStatus(Boolean.TRUE.equals(espaco.getReservaImediata()) ? Agendamento.CONFIRMADA : Agendamento.PENDENTE);
        agendamento.setCriadoEm(LocalDateTime.now());
        calcularValores(agendamento, espaco);

        Agendamento salvo = agendamentoRepository.save(agendamento);
        String codigo = codigo(salvo);

        if (Agendamento.CONFIRMADA.equals(salvo.getStatus())) {
            notificacaoService.notificar(usuario, "calendar-check", "Sua reserva no " + espaco.getNome() + " está confirmada.");
            notificacaoService.notificarAdmins("calendar-check", usuario.getNome() + " reservou o " + espaco.getNome() + " (" + codigo + ").");
        } else {
            notificacaoService.notificarAdmins("inbox", usuario.getNome() + " solicitou o " + espaco.getNome() + " (" + codigo + ").");
        }
        return salvo;
    }

    private void validar(Agendamento agendamento, EspacoPublico espaco) {
        LocalDateTime inicio = agendamento.getDataHoraInicio();
        LocalDateTime fim = agendamento.getDataHoraFim();

        if (Boolean.FALSE.equals(espaco.getAtivo())) {
            throw new RuntimeException("Este espaço não está mais disponível.");
        }
        if (!fim.isAfter(inicio)) {
            throw new RuntimeException("O término precisa ser depois do início!");
        }
        if (inicio.isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Não é possível reservar um horário que já passou.");
        }
        boolean horaInteira = inicio.getMinute() == 0 && fim.getMinute() == 0;
        boolean dentroDoExpediente = inicio.toLocalDate().equals(fim.toLocalDate())
                && inicio.getHour() >= HORA_ABERTURA && fim.getHour() <= HORA_FECHAMENTO;
        if (!horaInteira || !dentroDoExpediente) {
            throw new RuntimeException("As reservas são feitas em horas inteiras, no mesmo dia, das 07:00 às 23:00.");
        }
        Integer convidados = agendamento.getConvidados();
        if (convidados != null && espaco.getCapacidade() != null && convidados > espaco.getCapacidade()) {
            throw new RuntimeException("Este espaço comporta até " + espaco.getCapacidade() + " convidados.");
        }
    }

    public void calcularValores(Agendamento agendamento, EspacoPublico espaco) {
        double precoHora = espaco.getPrecoHora() == null ? 0 : espaco.getPrecoHora();
        double horas = agendamento.getDataHoraFim().getHour() - agendamento.getDataHoraInicio().getHour();
        double subtotal = precoHora * horas;
        double limpeza = precoHora > 0 && espaco.getTaxaLimpeza() != null ? espaco.getTaxaLimpeza() : 0;
        double servico = Math.round(subtotal * TAXA_SERVICO * 100) / 100.0;

        agendamento.setSubtotal(subtotal);
        agendamento.setTaxaLimpeza(limpeza);
        agendamento.setTaxaServico(servico);
        agendamento.setValorTotal(subtotal + limpeza + servico);
    }

    public Agendamento atualizarStatus(Long id, String novoStatus, Long usuarioId) {
        Agendamento agendamento = agendamentoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Agendamento não encontrado com o ID: " + id));
        Usuario autor = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado!"));

        boolean admin = "ADMIN".equals(autor.getRole());
        boolean dono = agendamento.getUsuario().getId().equals(autor.getId());
        String atual = agendamento.getStatus() == null ? Agendamento.CONFIRMADA : agendamento.getStatus();
        String espaco = agendamento.getEspacoPublico().getNome();
        String codigo = codigo(agendamento);

        switch (novoStatus) {
            case Agendamento.CONFIRMADA, Agendamento.RECUSADA -> {
                if (!admin) {
                    throw new RuntimeException("Apenas administradores podem responder a solicitações.");
                }
                if (!Agendamento.PENDENTE.equals(atual)) {
                    throw new RuntimeException("Esta solicitação já foi respondida.");
                }
                if (Agendamento.CONFIRMADA.equals(novoStatus)) {
                    notificacaoService.notificar(agendamento.getUsuario(), "calendar-check", "Sua reserva " + codigo + " no " + espaco + " foi aprovada!");
                } else {
                    notificacaoService.notificar(agendamento.getUsuario(), "x-circle", "Sua solicitação " + codigo + " no " + espaco + " foi recusada.");
                }
            }
            case Agendamento.CANCELADA -> {
                if (!admin && !dono) {
                    throw new RuntimeException("Você não pode cancelar a reserva de outra pessoa.");
                }
                if (!Agendamento.PENDENTE.equals(atual) && !Agendamento.CONFIRMADA.equals(atual)) {
                    throw new RuntimeException("Esta reserva não pode mais ser cancelada.");
                }
                if (dono) {
                    notificacaoService.notificarAdmins("ban", autor.getNome() + " cancelou a reserva " + codigo + " do " + espaco + ".");
                } else {
                    notificacaoService.notificar(agendamento.getUsuario(), "ban", "Sua reserva " + codigo + " no " + espaco + " foi cancelada pelo administrador.");
                }
            }
            default -> throw new RuntimeException("Status inválido: " + novoStatus);
        }

        agendamento.setStatus(novoStatus);
        return agendamentoRepository.save(agendamento);
    }

    private String codigo(Agendamento agendamento) {
        return "CV-" + (1000 + agendamento.getId());
    }

    public void deletar(Long id) {
        if (!agendamentoRepository.existsById(id)) {
            throw new RuntimeException("Agendamento não encontrado com o ID: " + id);
        }
        agendamentoRepository.deleteById(id);
    }
}
