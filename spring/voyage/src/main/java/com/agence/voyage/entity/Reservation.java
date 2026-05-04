package com.agence.voyage.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Reservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    @ManyToOne
    @JoinColumn(name = "voyage_id")
    private Voyage voyage;

    private BigDecimal prixPaye;
    
    // Sera rempli au moment de la confirmation (envoi du mail)
    private LocalDateTime dateConfirmation; 
    
    private String statut; // "CONFIRME", "EN_ATTENTE", "ANNULE"
}