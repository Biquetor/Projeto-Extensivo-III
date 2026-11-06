package com.projeto.comunidade.service;

import com.projeto.comunidade.model.Notificacao;
import com.projeto.comunidade.model.Usuario;
import com.projeto.comunidade.repository.NotificacaoRepository;
import com.projeto.comunidade.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificacaoService {

    private final NotificacaoRepository notificacaoRepository;
    private final UsuarioRepository usuarioRepository;

    public NotificacaoService(NotificacaoRepository notificacaoRepository, UsuarioRepository usuarioRepository) {
        this.notificacaoRepository = notificacaoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    public List<Notificacao> listarPorUsuario(Long usuarioId) {
        return notificacaoRepository.findByUsuarioIdOrderByDataDescIdDesc(usuarioId);
    }

    public void notificar(Usuario usuario, String icone, String texto) {
        Notificacao notificacao = new Notificacao();
        notificacao.setUsuario(usuario);
        notificacao.setIcone(icone);
        notificacao.setTexto(texto);
        notificacao.setLida(false);
        notificacao.setData(LocalDateTime.now());
        notificacaoRepository.save(notificacao);
    }

    public void notificarAdmins(String icone, String texto) {
        usuarioRepository.findByRole("ADMIN").forEach(admin -> notificar(admin, icone, texto));
    }

    public void marcarComoLidas(Long usuarioId) {
        List<Notificacao> notificacoes = listarPorUsuario(usuarioId);
        notificacoes.forEach(n -> n.setLida(true));
        notificacaoRepository.saveAll(notificacoes);
    }
}
