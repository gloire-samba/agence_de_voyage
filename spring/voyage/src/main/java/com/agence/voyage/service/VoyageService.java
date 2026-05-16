package com.agence.voyage.service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.agence.voyage.entity.Reservation;
import com.agence.voyage.entity.Segment;
import com.agence.voyage.entity.Voyage;
import com.agence.voyage.repository.ReservationRepository;
import com.agence.voyage.repository.VoyageRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VoyageService {

    private final VoyageRepository voyageRepository;
    private final ReservationRepository reservationRepository; 
    private final ReservationService reservationService; 
    
    // 👉 PLUS BESOIN de SegmentRepository ! Hibernate s'occupe de tout.

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void mettreAJourStatutsAuDemarrage() {
        List<Voyage> voyages = voyageRepository.findAll();
        LocalDateTime maintenant = LocalDateTime.now();

        for (Voyage v : voyages) {
            if ("ANNULE".equals(v.getStatut())) continue;

            if (v.getSegments() == null || v.getSegments().isEmpty()) {
                v.setStatut("A_VENIR");
                continue;
            }

            // Calcul sécurisé sans modifier la liste gérée par Hibernate
            LocalDateTime departReel = v.getSegments().stream()
                    .min(Comparator.comparing(Segment::getHeureDepart))
                    .get().getHeureDepart();
                    
            LocalDateTime arriveeReelle = v.getSegments().stream()
                    .max(Comparator.comparing(Segment::getHeureArrivee))
                    .get().getHeureArrivee();

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

    @Transactional
    public Voyage creer(Voyage voyage) {
        // 👉 LA MÉTHODE PARFAITE : On se contente de lier les enfants au parent
        if (voyage.getSegments() != null) {
            for (Segment s : voyage.getSegments()) {
                s.setVoyage(voyage); // Lien de parenté obligatoire
            }
        }
        // Hibernate détecte CascadeType.ALL et sauvegarde automatiquement les segments !
        return voyageRepository.save(voyage);
    }

    public List<Voyage> recupererTous() {
        return voyageRepository.findAll();
    }

    public Voyage recupererParId(Long id) {
        return voyageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Voyage non trouvé avec l'id : " + id));
    }

    @Transactional 
    public Voyage modifier(Long id, Voyage voyageDetails) {
        Voyage voyage = recupererParId(id);

        boolean passageEnAnnule = voyageDetails.getStatut() != null 
            && voyageDetails.getStatut().equals("ANNULE") 
            && !voyage.getStatut().equals("ANNULE");

        // 1. Mise à jour basique
        if (voyageDetails.getVilleDepart() != null) voyage.setVilleDepart(voyageDetails.getVilleDepart());
        if (voyageDetails.getVilleArrivee() != null) voyage.setVilleArrivee(voyageDetails.getVilleArrivee());
        if (voyageDetails.getPrixTotal() != null) voyage.setPrixTotal(voyageDetails.getPrixTotal());
        if (voyageDetails.getNombrePlacesTotal() != null) voyage.setNombrePlacesTotal(voyageDetails.getNombrePlacesTotal());
        if (voyageDetails.getStatut() != null) voyage.setStatut(voyageDetails.getStatut());

        // 2. GESTION "MAGIQUE" DES SEGMENTS
        if (voyageDetails.getSegments() != null) {
            List<Segment> actuels = voyage.getSegments();
            List<Segment> entrants = voyageDetails.getSegments();

            // Étape A : Supprimer de la liste les segments en trop 
            // (La commande orphanRemoval=true dira à la BDD de faire les requêtes DELETE automatiquement)
            while (actuels.size() > entrants.size()) {
                actuels.remove(actuels.size() - 1);
            }

            // Étape B : Mettre à jour les existants ou ajouter les nouveaux
            for (int i = 0; i < entrants.size(); i++) {
                Segment entrant = entrants.get(i);
                if (i < actuels.size()) {
                    // Mettre à jour (Hibernate fera des requêtes UPDATE)
                    Segment actuel = actuels.get(i);
                    actuel.setOrdre(entrant.getOrdre());
                    actuel.setVilleDepart(entrant.getVilleDepart());
                    actuel.setVilleArrivee(entrant.getVilleArrivee());
                    actuel.setHeureDepart(entrant.getHeureDepart());
                    actuel.setHeureArrivee(entrant.getHeureArrivee());
                } else {
                    // Ajouter (Hibernate fera des requêtes INSERT)
                    entrant.setId(null); // On force l'état "nouveau"
                    entrant.setVoyage(voyage);
                    actuels.add(entrant);
                }
            }
        }

        // Un seul save() qui propage tout en BDD !
        Voyage voyageSauvegarde = voyageRepository.save(voyage);

        // 3. LA BOUCLE DE REMBOURSEMENT
        if (passageEnAnnule) {
            System.out.println("⚠️ Voyage #" + id + " annulé par l'admin. Déclenchement du remboursement de masse...");
            List<Reservation> reservations = reservationRepository.findByVoyageId(id);
            for (Reservation res : reservations) {
                if (!res.getStatut().equals("ANNULE")) {
                    try {
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

    public void supprimer(Long id) {
        voyageRepository.deleteById(id);
    }
}