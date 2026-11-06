package com.projeto.comunidade.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

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

    @Column(length = 2000)
    private String descricao;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    private String bairro;

    private String endereco;

    private Integer capacidade;

    private Double precoHora;

    private Double taxaLimpeza;

    private Boolean reservaImediata;

    @Column(length = 1000)
    private String regras;

    // Espaços removidos saem do catálogo, mas continuam no histórico de reservas.
    private Boolean ativo = true;

    @ElementCollection
    @CollectionTable(name = "tb_espaco_comodidades", joinColumns = @JoinColumn(name = "espaco_id"))
    @Column(name = "comodidade")
    private List<String> comodidades = new ArrayList<>();

    @ElementCollection
    @CollectionTable(name = "tb_espaco_fotos", joinColumns = @JoinColumn(name = "espaco_id"))
    @OrderColumn(name = "posicao")
    @Column(name = "url", length = 1000)
    private List<String> fotos = new ArrayList<>();
}
