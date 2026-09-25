package com.projeto.comunidade.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tb_eventos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Evento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String titulo;

    private String descricao;

    @Column(nullable = false)
    private LocalDateTime dataHora;

    @ManyToOne
    @JoinColumn(name = "espaco_publico_id", nullable = false)
    private EspacoPublico espacoPublico;

    @ManyToOne
    @JoinColumn(name = "organizador_id", nullable = false)
    private Usuario organizador;
}