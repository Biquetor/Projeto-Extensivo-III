package com.projeto.comunidade.model;

import com.fasterxml.jackson.annotation.JsonIncludeProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tb_avaliacoes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Avaliacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer nota;

    @Column(nullable = false, length = 2000)
    private String comentario;

    @Column(nullable = false)
    private LocalDateTime data;

    @JsonIncludeProperties({"id", "nome"})
    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @JsonIncludeProperties({"id", "nome"})
    @ManyToOne
    @JoinColumn(name = "espaco_publico_id", nullable = false)
    private EspacoPublico espacoPublico;

    @JsonIncludeProperties({"id"})
    @OneToOne
    @JoinColumn(name = "agendamento_id", nullable = false, unique = true)
    private Agendamento agendamento;
}
