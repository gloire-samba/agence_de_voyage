package com.agence.voyage.service;

import com.agence.voyage.entity.Avis;
import com.agence.voyage.entity.Voyage;
import com.agence.voyage.repository.AvisRepository;
import com.agence.voyage.repository.VoyageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AvisService {

    private final AvisRepository avisRepository;
    private final VoyageRepository voyageRepository;

    // CREATE
    @Transactional
    public Avis creer(Avis avis) {
        Avis nouvelAvis = avisRepository.save(avis);
        mettreAJourMoyenneVoyage(avis.getVoyage().getId());
        return nouvelAvis;
    }

    // READ
    public List<Avis> recupererTous() {
        return avisRepository.findAll();
    }

    public Avis recupererParId(Long id) {
        return avisRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Avis non trouvé avec l'id : " + id));
    }

    public List<Avis> recupererParVoyage(Long voyageId) {
        return avisRepository.findByVoyageId(voyageId);
    }

    // UPDATE
    @Transactional
    public Avis modifier(Long id, Avis avisDetails) {
        Avis avis = recupererParId(id);
        avis.setNote(avisDetails.getNote());
        avis.setCommentaire(avisDetails.getCommentaire());
        Avis avisModifie = avisRepository.save(avis);
        
        mettreAJourMoyenneVoyage(avis.getVoyage().getId());
        return avisModifie;
    }

    // DELETE
    @Transactional
    public void supprimer(Long id) {
        Avis avis = recupererParId(id);
        Long voyageId = avis.getVoyage().getId();
        avisRepository.deleteById(id);
        
        mettreAJourMoyenneVoyage(voyageId);
    }

    // MÉTHODE PRIVÉE DE RECALCUL
    private void mettreAJourMoyenneVoyage(Long voyageId) {
        Voyage voyage = voyageRepository.findById(voyageId).orElseThrow();
        List<Avis> tousLesAvis = avisRepository.findByVoyageId(voyageId);

        if (tousLesAvis.isEmpty()) {
            voyage.setNoteMoyenne(null);
        } else {
            double moyenne = tousLesAvis.stream()
                    .mapToInt(Avis::getNote)
                    .average()
                    .orElse(0.0);
            voyage.setNoteMoyenne(BigDecimal.valueOf(moyenne).setScale(2, RoundingMode.HALF_UP));
        }
        voyageRepository.save(voyage);
    }
}