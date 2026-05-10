package com.agence.voyage.entity;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "RESERVATION")
@Data
@NoArgsConstructor
@AllArgsConstructor
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

    // 👉 NOUVEAU : On stocke le reçu de Stripe pour les futurs remboursements !
    private String stripePaymentId;

    // 👉 NOUVEAU : Une réservation contient plusieurs billets/sièges
    @OneToMany(mappedBy = "reservation", cascade = CascadeType.ALL)
    private List<Billet> billets;
}