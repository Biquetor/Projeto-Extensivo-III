package com.projeto.comunidade.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tb_favoritos", uniqueConstraints = @UniqueConstraint(columnNames = {"usuario_id", "espaco_publico_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Favorito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne
    @JoinColumn(name = "espaco_publico_id", nullable = false)
    private EspacoPublico espacoPublico;
}
