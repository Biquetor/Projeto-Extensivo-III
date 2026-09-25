package com.projeto.comunidade.controller;

import com.projeto.comunidade.model.Agendamento;
import com.projeto.comunidade.service.AgendamentoService; // Ou seu repository direto
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/agendamentos")
@CrossOrigin(origins = "*")
public class AgendamentoController {

    private final AgendamentoService agendamentoService;

    public AgendamentoController(AgendamentoService agendamentoService) {
        this.agendamentoService = agendamentoService;
    }

    @GetMapping
    public ResponseEntity<List<Agendamento>> listar() {
        return ResponseEntity.ok(agendamentoService.listarTodos());
    }

    @PostMapping
    public ResponseEntity<Agendamento> criarAgendamento(@RequestBody Agendamento agendamento) {
        Agendamento novoAgendamento = agendamentoService.salvar(agendamento);
        return ResponseEntity.status(HttpStatus.CREATED).body(novoAgendamento);
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletar(@PathVariable Long id) {
        try {
            agendamentoService.deletar(id);
            return ResponseEntity.noContent().build(); // Retorna Status 204 No Content
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build(); // Retorna Status 404 se não achar o ID
        }
    }
}