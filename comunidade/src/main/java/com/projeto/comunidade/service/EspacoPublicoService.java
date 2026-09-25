package com.projeto.comunidade.service;

import com.projeto.comunidade.model.EspacoPublico;
import com.projeto.comunidade.repository.EspacoPublicoRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EspacoPublicoService {

    private final EspacoPublicoRepository espacoPublicoRepository;

    public EspacoPublicoService(EspacoPublicoRepository espacoPublicoRepository) {
        this.espacoPublicoRepository = espacoPublicoRepository;
    }

    public List<EspacoPublico> listarTodos() {
        return espacoPublicoRepository.findAll();
    }

    public EspacoPublico buscarPorId(Long id) {
        return espacoPublicoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Espaço público não encontrado!"));
    }

    public EspacoPublico salvar(EspacoPublico espacoPublico) {
        return espacoPublicoRepository.save(espacoPublico);
    }
}