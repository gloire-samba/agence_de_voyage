package com.agence.voyage.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener; // 👉 NOUVEL IMPORT
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.agence.voyage.entity.Reservation;
import com.agence.voyage.entity.Segment;
import com.agence.voyage.entity.Voyage;
import com.agence.voyage.repository.ReservationRepository;
import com.agence.voyage.repository.SegmentRepository;
import com.agence.voyage.repository.VoyageRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class VoyageService {

    private final VoyageRepository voyageRepository;
    private final ReservationRepository reservationRepository; 
    private final ReservationService reservationService; 
    private final SegmentRepository segmentRepository; // 👉 INJECTION ICI

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

            v.getSegments().sort(Comparator.comparing(Segment::getHeureDepart));
            LocalDateTime departReel = v.getSegments().get(0).getHeureDepart();
            LocalDateTime arriveeReelle = v.getSegments().get(v.getSegments().size() - 1).getHeureArrivee();

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

    // 👉 CREATE CORRIGÉ
    @Transactional
    public Voyage creer(Voyage voyage) {
        // 1. On met les segments de côté
        List<Segment> segmentsMembres = voyage.getSegments();
        voyage.setSegments(null); 
        
        // 2. On sauvegarde le voyage seul pour qu'il obtienne un ID en base
        Voyage voyageSauvegarde = voyageRepository.save(voyage);

        // 3. On rattache chaque segment à son papa (le voyage) et on sauvegarde
        if (segmentsMembres != null && !segmentsMembres.isEmpty()) {
            List<Segment> segmentsSauvegardes = new ArrayList<>();
            for (Segment s : segmentsMembres) {
                s.setVoyage(voyageSauvegarde); // Lien de parenté obligatoire pour Hibernate !
                segmentsSauvegardes.add(segmentRepository.save(s));
            }
            voyageSauvegarde.setSegments(segmentsSauvegardes);
        }
        
        return voyageSauvegarde;
    }

    // READ
    public List<Voyage> recupererTous() {
        return voyageRepository.findAll();
    }

    public Voyage recupererParId(Long id) {
        return voyageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Voyage non trouvé avec l'id : " + id));
    }

    // 👉 UPDATE CORRIGÉ
    @Transactional 
    public Voyage modifier(Long id, Voyage voyageDetails) {
        Voyage voyage = recupererParId(id);

        boolean passageEnAnnule = voyageDetails.getStatut() != null 
            && voyageDetails.getStatut().equals("ANNULE") 
            && !voyage.getStatut().equals("ANNULE");

        voyage.setVilleDepart(voyageDetails.getVilleDepart());
        voyage.setVilleArrivee(voyageDetails.getVilleArrivee());
        voyage.setPrixTotal(voyageDetails.getPrixTotal());
        voyage.setNombrePlacesTotal(voyageDetails.getNombrePlacesTotal()); // 👉 Correction : on n'oublie plus la capacité !
        
        if (voyageDetails.getStatut() != null) {
            voyage.setStatut(voyageDetails.getStatut());
        }

        // 👉 GESTION DES NOUVEAUX SEGMENTS 
        if (voyageDetails.getSegments() != null) {
            // On supprime les anciens segments
            if (voyage.getSegments() != null && !voyage.getSegments().isEmpty()) {
                segmentRepository.deleteAll(voyage.getSegments());
                voyage.getSegments().clear();
            }
            
            // On enregistre les nouveaux
            for (Segment s : voyageDetails.getSegments()) {
                // 👉 CORRECTION ICI : On force l'ID à null pour que Hibernate fasse un INSERT et non un UPDATE
                s.setId(null); 
                s.setVoyage(voyage);
                segmentRepository.save(s);
                voyage.getSegments().add(s);
            }
        }

        Voyage voyageSauvegarde = voyageRepository.save(voyage);

        // LA BOUCLE DE REMBOURSEMENT (inchangée)
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

    // DELETE
    public void supprimer(Long id) {
        voyageRepository.deleteById(id);
    }
}