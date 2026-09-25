package com.projeto.comunidade.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tb_espacos_publicos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class EspacoPublico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private String tipo;

    private String descricao;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;
}