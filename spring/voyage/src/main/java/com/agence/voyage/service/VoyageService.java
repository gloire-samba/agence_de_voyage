package com.agence.voyage.service;

import com.agence.voyage.entity.Voyage;
import com.agence.voyage.entity.Reservation;
import com.agence.voyage.repository.VoyageRepository;
import com.agence.voyage.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import com.agence.voyage.entity.Segment;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Comparator;

@Service
@RequiredArgsConstructor
public class VoyageService {

    private final VoyageRepository voyageRepository;
    private final ReservationRepository reservationRepository; // 👉 Ajout pour trouver les passagers
    private final ReservationService reservationService; // 👉 Ajout pour déclencher le remboursement

    // 👉 L'ALGORITHME QUI S'EXÉCUTE AU DÉMARRAGE DU SERVEUR
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void mettreAJourStatutsAuDemarrage() {
        List<Voyage> voyages = voyageRepository.findAll();
        LocalDateTime maintenant = LocalDateTime.now();

        for (Voyage v : voyages) {
            // On ne touche pas aux voyages que l'admin a explicitement annulés
            if ("ANNULE".equals(v.getStatut())) continue;

            // S'il n'a pas encore de segments, il est forcément à venir
            if (v.getSegments() == null || v.getSegments().isEmpty()) {
                v.setStatut("A_VENIR");
                continue;
            }

            // On trie les segments chronologiquement pour trouver le vrai début et la vraie fin
            v.getSegments().sort(Comparator.comparing(Segment::getHeureDepart));
            LocalDateTime departReel = v.getSegments().get(0).getHeureDepart();
            LocalDateTime arriveeReelle = v.getSegments().get(v.getSegments().size() - 1).getHeureArrivee();

            // Application de ta règle métier :
            if (maintenant.isBefore(departReel)) {
                v.setStatut("A_VENIR");
            } else if (maintenant.isAfter(arriveeReelle)) {
                v.setStatut("TERMINE");
            } else {
                v.setStatut("EN_COURS");
            }
        }
        
        voyageRepository.saveAll(voyages);
        System.out.println("✅ Mise à jour automatique des statuts des voyages terminée.");
    }

    // CREATE
    public Voyage creer(Voyage voyage) {
        return voyageRepository.save(voyage);
    }

    // READ
    public List<Voyage> recupererTous() {
        return voyageRepository.findAll();
    }

    public Voyage recupererParId(Long id) {
        return voyageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Voyage non trouvé avec l'id : " + id));
    }

    // UPDATE
    @Transactional // 👉 Important d'ajouter Transactional ici car on modifie plusieurs choses
    public Voyage modifier(Long id, Voyage voyageDetails) {
        Voyage voyage = recupererParId(id);

        // 👉 DÉTECTION DE L'ANNULATION PAR L'ADMIN
        boolean passageEnAnnule = voyageDetails.getStatut() != null 
            && voyageDetails.getStatut().equals("ANNULE") 
            && !voyage.getStatut().equals("ANNULE");

        voyage.setVilleDepart(voyageDetails.getVilleDepart());
        voyage.setVilleArrivee(voyageDetails.getVilleArrivee());
        voyage.setPrixTotal(voyageDetails.getPrixTotal());
        
        if (voyageDetails.getStatut() != null) {
            voyage.setStatut(voyageDetails.getStatut());
        }

        Voyage voyageSauvegarde = voyageRepository.save(voyage);

        // 👉 LA BOUCLE MAGIQUE DE REMBOURSEMENT MASSIF
        if (passageEnAnnule) {
            System.out.println("⚠️ Voyage #" + id + " annulé par l'admin. Déclenchement du remboursement de masse...");
            
            // 1. On récupère tous les billets rattachés à ce voyage
            List<Reservation> reservations = reservationRepository.findByVoyageId(id);
            
            for (Reservation res : reservations) {
                // On ignore ceux qui sont déjà annulés
                if (!res.getStatut().equals("ANNULE")) {
                    try {
                        // 2. On utilise notre méthode de réservation qui gère déjà Stripe + Email !
                        reservationService.annuler(res.getId());
                        System.out.println("✅ Client " + res.getUtilisateur().getEmail() + " remboursé.");
                    } catch (Exception e) {
                        System.err.println("❌ Échec remboursement automatique pour réservation #" + res.getId());
                    }
                }
            }
        }

        return voyageSauvegarde;
    }

    // DELETE
    public void supprimer(Long id) {
        voyageRepository.deleteById(id);
    }
}