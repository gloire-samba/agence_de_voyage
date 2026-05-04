package com.agence.voyage.entity;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "AVIS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Avis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voyage_id", nullable = false)
    @JsonIgnore // 👈 Ajoute ceci
    private Voyage voyage;

    // Lien vers l'entité Utilisateur que tu m'as fournie plus tôt
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id", nullable = false)
    @JsonIgnore // 👈 Ajoute ceci
    private Utilisateur utilisateur;

    @Column(nullable = false)
    private Integer note;

    @Column(columnDefinition = "TEXT")
    private String commentaire;

    // 👉 NOUVEAU : Champ pour stocker la date et l'heure
    @Column(name = "date_creation", updatable = false)
    private LocalDateTime dateCreation;

    // 👉 NOUVEAU : Méthode magique de JPA. Elle s'exécute toute seule avant le premier INSERT.
    @PrePersist
    protected void onCreate() {
        this.dateCreation = LocalDateTime.now();
    }
}