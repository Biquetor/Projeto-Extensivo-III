package com.projeto.comunidade.service;

import com.projeto.comunidade.model.Evento;
import com.projeto.comunidade.repository.EventoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EventoService {

    private final EventoRepository eventoRepository;

    public EventoService(EventoRepository eventoRepository) {
        this.eventoRepository = eventoRepository;
    }

    public List<Evento> listarTodos() {
        return eventoRepository.findAll();
    }

    public List<Evento> listarPorEspaco(Long espacoId) {
        return eventoRepository.findByEspacoPublicoId(espacoId);
    }

    public Evento salvar(Evento evento) {
        return eventoRepository.save(evento);
    }
}