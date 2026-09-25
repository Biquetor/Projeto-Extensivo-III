package com.projeto.comunidade.repository;

import com.projeto.comunidade.model.Evento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventoRepository extends JpaRepository<Evento, Long> {
    List<Evento> findByEspacoPublicoId(Long espacoPublicoId);
}