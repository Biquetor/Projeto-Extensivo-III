package com.projeto.comunidade.controller;

import com.projeto.comunidade.model.Evento;
import com.projeto.comunidade.service.EventoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/eventos")
@CrossOrigin(origins = "*")
public class EventoController {

    private final EventoService eventoService;

    public EventoController(EventoService eventoService) {
        this.eventoService = eventoService;
    }

    @GetMapping
    public ResponseEntity<List<Evento>> listar() {
        return ResponseEntity.ok(eventoService.listarTodos());
    }

    @GetMapping("/espaco/{espacoId}")
    public ResponseEntity<List<Evento>> listarPorEspaco(@PathVariable Long espacoId) {
        return ResponseEntity.ok(eventoService.listarPorEspaco(espacoId));
    }

    @PostMapping
    public ResponseEntity<Evento> criar(@RequestBody Evento evento) {
        Evento novoEvento = eventoService.salvar(evento);
        return ResponseEntity.status(HttpStatus.CREATED).body(novoEvento);
    }
}