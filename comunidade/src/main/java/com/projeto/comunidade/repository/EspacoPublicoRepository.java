package com.projeto.comunidade.repository;

import com.projeto.comunidade.model.EspacoPublico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EspacoPublicoRepository extends JpaRepository<EspacoPublico, Long> {
}