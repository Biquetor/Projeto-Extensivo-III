package com.projeto.comunidade.repository;

import com.projeto.comunidade.model.Agendamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AgendamentoRepository extends JpaRepository<Agendamento, Long> {

    // Query para verificar choque/sobreposição de horários no mesmo local
    @Query("SELECT COUNT(a) > 0 FROM Agendamento a " +
            "WHERE a.espacoPublico.id = :espacoId " +
            "AND (:inicio < a.dataHoraFim AND :fim > a.dataHoraInicio)")
    boolean existeConflitoDeHorario(@Param("espacoId") Long espacoId,
                                    @Param("inicio") LocalDateTime inicio,
                                    @Param("fim") LocalDateTime fim);

    List<Agendamento> findByEspacoPublicoId(Long espacoId);
}