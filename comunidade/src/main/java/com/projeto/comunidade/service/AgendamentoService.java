package com.projeto.comunidade.service;

import com.projeto.comunidade.model.Agendamento;
import com.projeto.comunidade.repository.AgendamentoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AgendamentoService {

    private final AgendamentoRepository agendamentoRepository;

    public AgendamentoService(AgendamentoRepository agendamentoRepository) {
        this.agendamentoRepository = agendamentoRepository;
    }

    public List<Agendamento> listarTodos() {
        return agendamentoRepository.findAll();
    }

    public Agendamento salvar(Agendamento agendamento) {
        if (agendamento.getDataHoraFim().isBefore(agendamento.getDataHoraInicio())) {
            throw new RuntimeException("A data final não pode ser anterior à data inicial!");
        }

        boolean conflito = agendamentoRepository.existeConflitoDeHorario(
                agendamento.getEspacoPublico().getId(),
                agendamento.getDataHoraInicio(),
                agendamento.getDataHoraFim()
        );

        if (conflito) {
            throw new RuntimeException("Já existe um agendamento para este espaço no horário selecionado!");
        }

        return agendamentoRepository.save(agendamento);
    }
    public void deletar(Long id) {
        if (!agendamentoRepository.existsById(id)) {
            throw new RuntimeException("Agendamento não encontrado com o ID: " + id);
        }
        agendamentoRepository.deleteById(id);
    }
}