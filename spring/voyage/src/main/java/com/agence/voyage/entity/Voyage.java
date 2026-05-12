package com.agence.voyage.entity;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

@Entity
@Table(name = "VOYAGE")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Voyage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ville_depart", nullable = false, length = 100)
    private String villeDepart;

    @Column(name = "ville_arrivee", nullable = false, length = 100)
    private String villeArrivee;

    @Column(name = "prix_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal prixTotal;

    @Column(name = "note_moyenne", precision = 3, scale = 2)
    private BigDecimal noteMoyenne;


    // 👉 NOUVEAU : Le statut du voyage
    @Column(name = "statut", length = 20)
    @Builder.Default
    private String statut = "A_VENIR"; // "A_VENIR", "EN_COURS", "TERMINE"

    // 👉 NOUVEAU
    private Integer nombrePlacesTotal;


    // Relation bidirectionnelle : un voyage contient plusieurs segments
    @OneToMany(mappedBy = "voyage", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Segment> segments = new ArrayList<>();

    // Relation bidirectionnelle : un voyage possède plusieurs avis
    @OneToMany(mappedBy = "voyage", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Avis> avis = new ArrayList<>();

    @OneToMany(mappedBy = "voyage")
    @JsonIgnore
    private List<Reservation> reservations = new ArrayList<>();

    // 👉 NOUVEAU : Angular recevra automatiquement "placesRestantes"
    @JsonProperty("placesRestantes")
    public int getPlacesRestantes() {
        if (reservations == null || reservations.isEmpty()) return nombrePlacesTotal;
        int occupees = reservations.stream()
                .filter(r -> !"ANNULE".equals(r.getStatut()))
                .mapToInt(r -> r.getBillets() != null ? r.getBillets().size() : 0)
                .sum();
        return nombrePlacesTotal - occupees;
    }
}