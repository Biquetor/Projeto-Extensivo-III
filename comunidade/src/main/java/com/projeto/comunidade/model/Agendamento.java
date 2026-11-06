package com.projeto.comunidade.model;

import com.fasterxml.jackson.annotation.JsonIncludeProperties;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "tb_agendamentos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Agendamento {

    public static final String PENDENTE = "PENDENTE";
    public static final String CONFIRMADA = "CONFIRMADA";
    public static final String RECUSADA = "RECUSADA";
    public static final String CANCELADA = "CANCELADA";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime dataHoraInicio;

    @Column(nullable = false)
    private LocalDateTime dataHoraFim;

    @JsonIncludeProperties({"id", "nome"})
    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @JsonIncludeProperties({"id", "nome"})
    @ManyToOne
    @JoinColumn(name = "espaco_publico_id", nullable = false)
    private EspacoPublico espacoPublico;

    private Integer convidados;

    private String tipoEvento;

    @Column(length = 1000)
    private String observacoes;

    private String status;

    private Double subtotal;

    private Double taxaLimpeza;

    private Double taxaServico;

    private Double valorTotal;

    private LocalDateTime criadoEm;
}
