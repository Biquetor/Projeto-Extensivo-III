package com.projeto.comunidade.service;

import com.projeto.comunidade.model.Usuario;
import com.projeto.comunidade.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository usuarioRepository;


    public Usuario salvar(Usuario usuario) {
        if (usuarioRepository.existsByEmail(usuario.getEmail())) {
            throw new RuntimeException("E-mail já cadastrado!");
        }
        return usuarioRepository.save(usuario);
    }


    public List<Usuario> listarTodos() {
        return usuarioRepository.findAll();
    }


    public Optional<Usuario> buscarPorId(Long id) {
        return usuarioRepository.findById(id);
    }


    public void deletar(Long id) {
        if (!usuarioRepository.existsById(id)) {
            throw new RuntimeException("Usuário não encontrado!");
        }
        usuarioRepository.deleteById(id);
    }

    public Usuario autenticar(String email, String senha) {
        return usuarioRepository.findByEmail(email)
                .filter(u -> u.getSenha().equals(senha)) // Para projetos de produção, utilize BCrypt/Spring Security
                .orElseThrow(() -> new RuntimeException("E-mail ou senha inválidos."));
    }
}