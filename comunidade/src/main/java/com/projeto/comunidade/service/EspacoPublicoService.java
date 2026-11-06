package com.projeto.comunidade.service;

import com.projeto.comunidade.model.EspacoPublico;
import com.projeto.comunidade.repository.AgendamentoRepository;
import com.projeto.comunidade.repository.EspacoPublicoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class EspacoPublicoService {

    private final EspacoPublicoRepository espacoPublicoRepository;
    private final AgendamentoRepository agendamentoRepository;

    public EspacoPublicoService(EspacoPublicoRepository espacoPublicoRepository, AgendamentoRepository agendamentoRepository) {
        this.espacoPublicoRepository = espacoPublicoRepository;
        this.agendamentoRepository = agendamentoRepository;
    }

    public List<EspacoPublico> listarTodos() {
        return espacoPublicoRepository.findAll();
    }

    public EspacoPublico buscarPorId(Long id) {
        return espacoPublicoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Espaço público não encontrado!"));
    }

    public EspacoPublico salvar(EspacoPublico espacoPublico) {
        espacoPublico.setId(null);
        espacoPublico.setAtivo(true);
        return espacoPublicoRepository.save(espacoPublico);
    }

    @Transactional
    public EspacoPublico atualizar(Long id, EspacoPublico dados) {
        EspacoPublico espaco = buscarPorId(id);
        espaco.setNome(dados.getNome());
        espaco.setTipo(dados.getTipo());
        espaco.setDescricao(dados.getDescricao());
        espaco.setLatitude(dados.getLatitude());
        espaco.setLongitude(dados.getLongitude());
        espaco.setBairro(dados.getBairro());
        espaco.setEndereco(dados.getEndereco());
        espaco.setCapacidade(dados.getCapacidade());
        espaco.setPrecoHora(dados.getPrecoHora());
        espaco.setTaxaLimpeza(dados.getTaxaLimpeza());
        espaco.setReservaImediata(dados.getReservaImediata());
        espaco.setRegras(dados.getRegras());
        espaco.setComodidades(new ArrayList<>(dados.getComodidades()));
        espaco.setFotos(new ArrayList<>(dados.getFotos()));
        return espacoPublicoRepository.save(espaco);
    }

    public void remover(Long id) {
        EspacoPublico espaco = buscarPorId(id);
        long ativas = agendamentoRepository.contarReservasAtivas(id, LocalDateTime.now());
        if (ativas > 0) {
            throw new RuntimeException(espaco.getNome() + " tem " + ativas + " reserva(s) ativa(s). Cancele-as antes de remover.");
        }
        espaco.setAtivo(false);
        espacoPublicoRepository.save(espaco);
    }
}
