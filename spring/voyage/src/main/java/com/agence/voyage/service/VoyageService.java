package com.agence.voyage.service;

import com.agence.voyage.entity.Voyage;
import com.agence.voyage.repository.VoyageRepository;
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
    public Voyage modifier(Long id, Voyage voyageDetails) {
        Voyage voyage = recupererParId(id);
        voyage.setVilleDepart(voyageDetails.getVilleDepart());
        voyage.setVilleArrivee(voyageDetails.getVilleArrivee());
        voyage.setPrixTotal(voyageDetails.getPrixTotal());
        if (voyageDetails.getStatut() != null) {
            voyage.setStatut(voyageDetails.getStatut());
        }
        // Note: La note moyenne est gérée par le AvisService, on ne la modifie pas manuellement ici
        return voyageRepository.save(voyage);
    }

    // DELETE
    public void supprimer(Long id) {
        voyageRepository.deleteById(id);
    }
}