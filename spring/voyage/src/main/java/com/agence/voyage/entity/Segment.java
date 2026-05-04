package com.agence.voyage.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "SEGMENT")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Segment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FetchType.LAZY est une bonne pratique pour ne pas surcharger la mémoire
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voyage_id", nullable = false)
    @JsonIgnore // 👈 Ajoute ceci
    private Voyage voyage;

    @Column(nullable = false)
    private Integer ordre;

    @Column(name = "ville_depart", nullable = false, length = 100)
    private String villeDepart;

    @Column(name = "ville_arrivee", nullable = false, length = 100)
    private String villeArrivee;

    @Column(name = "heure_depart", nullable = false)
    private LocalDateTime heureDepart;

    @Column(name = "heure_arrivee", nullable = false)
    private LocalDateTime heureArrivee;
}