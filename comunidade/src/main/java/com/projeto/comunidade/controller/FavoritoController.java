package com.projeto.comunidade.controller;

import com.projeto.comunidade.model.Favorito;
import com.projeto.comunidade.repository.EspacoPublicoRepository;
import com.projeto.comunidade.repository.FavoritoRepository;
import com.projeto.comunidade.repository.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favoritos")
@CrossOrigin(origins = "*")
public class FavoritoController {

    private final FavoritoRepository favoritoRepository;
    private final UsuarioRepository usuarioRepository;
    private final EspacoPublicoRepository espacoPublicoRepository;

    public FavoritoController(FavoritoRepository favoritoRepository,
                              UsuarioRepository usuarioRepository,
                              EspacoPublicoRepository espacoPublicoRepository) {
        this.favoritoRepository = favoritoRepository;
        this.usuarioRepository = usuarioRepository;
        this.espacoPublicoRepository = espacoPublicoRepository;
    }

    @GetMapping("/{usuarioId}")
    public ResponseEntity<List<Long>> listar(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(favoritoRepository.findByUsuarioId(usuarioId).stream()
                .map(f -> f.getEspacoPublico().getId())
                .toList());
    }

    @PutMapping("/{usuarioId}/{espacoId}")
    public ResponseEntity<Void> adicionar(@PathVariable Long usuarioId, @PathVariable Long espacoId) {
        if (favoritoRepository.findByUsuarioIdAndEspacoPublicoId(usuarioId, espacoId).isEmpty()) {
            Favorito favorito = new Favorito();
            favorito.setUsuario(usuarioRepository.findById(usuarioId)
                    .orElseThrow(() -> new RuntimeException("Usuário não encontrado!")));
            favorito.setEspacoPublico(espacoPublicoRepository.findById(espacoId)
                    .orElseThrow(() -> new RuntimeException("Espaço não encontrado!")));
            favoritoRepository.save(favorito);
        }
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{usuarioId}/{espacoId}")
    public ResponseEntity<Void> remover(@PathVariable Long usuarioId, @PathVariable Long espacoId) {
        favoritoRepository.findByUsuarioIdAndEspacoPublicoId(usuarioId, espacoId).ifPresent(favoritoRepository::delete);
        return ResponseEntity.noContent().build();
    }
}
