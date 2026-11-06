package com.projeto.comunidade.controller;

import com.projeto.comunidade.model.Notificacao;
import com.projeto.comunidade.service.NotificacaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notificacoes")
@CrossOrigin(origins = "*")
public class NotificacaoController {

    private final NotificacaoService notificacaoService;

    public NotificacaoController(NotificacaoService notificacaoService) {
        this.notificacaoService = notificacaoService;
    }

    @GetMapping("/{usuarioId}")
    public ResponseEntity<List<Notificacao>> listar(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(notificacaoService.listarPorUsuario(usuarioId));
    }

    @PutMapping("/{usuarioId}/lidas")
    public ResponseEntity<Void> marcarComoLidas(@PathVariable Long usuarioId) {
        notificacaoService.marcarComoLidas(usuarioId);
        return ResponseEntity.noContent().build();
    }
}
