package com.projeto.comunidade.service;

import com.projeto.comunidade.model.Agendamento;
import com.projeto.comunidade.model.Avaliacao;
import com.projeto.comunidade.repository.AgendamentoRepository;
import com.projeto.comunidade.repository.AvaliacaoRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AvaliacaoService {

    private final AvaliacaoRepository avaliacaoRepository;
    private final AgendamentoRepository agendamentoRepository;
    private final NotificacaoService notificacaoService;

    public AvaliacaoService(AvaliacaoRepository avaliacaoRepository,
                            AgendamentoRepository agendamentoRepository,
                            NotificacaoService notificacaoService) {
        this.avaliacaoRepository = avaliacaoRepository;
        this.agendamentoRepository = agendamentoRepository;
        this.notificacaoService = notificacaoService;
    }

    public List<Avaliacao> listarTodas() {
        return avaliacaoRepository.findAll();
    }

    public Avaliacao salvar(Avaliacao avaliacao) {
        Agendamento agendamento = agendamentoRepository.findById(avaliacao.getAgendamento().getId())
                .orElseThrow(() -> new RuntimeException("Reserva não encontrada!"));

        if (!agendamento.getUsuario().getId().equals(avaliacao.getUsuario().getId())) {
            throw new RuntimeException("Apenas quem fez a reserva pode avaliar.");
        }
        if (!Agendamento.CONFIRMADA.equals(agendamento.getStatus()) || agendamento.getDataHoraFim().isAfter(LocalDateTime.now())) {
            throw new RuntimeException("Só é possível avaliar depois que o evento acontecer.");
        }
        if (avaliacaoRepository.existsByAgendamentoId(agendamento.getId())) {
            throw new RuntimeException("Esta reserva já foi avaliada.");
        }
        if (avaliacao.getNota() == null || avaliacao.getNota() < 1 || avaliacao.getNota() > 5) {
            throw new RuntimeException("A nota precisa ser de 1 a 5.");
        }

        avaliacao.setId(null);
        avaliacao.setAgendamento(agendamento);
        avaliacao.setUsuario(agendamento.getUsuario());
        avaliacao.setEspacoPublico(agendamento.getEspacoPublico());
        avaliacao.setData(LocalDateTime.now());
        Avaliacao salva = avaliacaoRepository.save(avaliacao);

        notificacaoService.notificarAdmins("star", agendamento.getUsuario().getNome() + " avaliou o "
                + agendamento.getEspacoPublico().getNome() + " com nota " + salva.getNota() + ".");
        return salva;
    }
}
