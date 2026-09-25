package com.projeto.comunidade.controller;

import com.projeto.comunidade.model.EspacoPublico;
import com.projeto.comunidade.service.EspacoPublicoService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/espacos-publicos")
@CrossOrigin(origins = "*")
public class EspacoPublicoController {

    private final EspacoPublicoService espacoPublicoService;

    public EspacoPublicoController(EspacoPublicoService espacoPublicoService) {
        this.espacoPublicoService = espacoPublicoService;
    }

    @GetMapping
    public ResponseEntity<List<EspacoPublico>> listar() {
        return ResponseEntity.ok(espacoPublicoService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EspacoPublico> buscarPorId(@PathVariable Long id) {
        return ResponseEntity.ok(espacoPublicoService.buscarPorId(id));
    }

    // REMOVIDO O "/espacos-publicos" DAQUI:
    @PostMapping
    public ResponseEntity<EspacoPublico> criarEspaco(@RequestBody EspacoPublico espaco) {
        EspacoPublico novoEspaco = espacoPublicoService.salvar(espaco);
        return ResponseEntity.status(HttpStatus.CREATED).body(novoEspaco);
    }
}