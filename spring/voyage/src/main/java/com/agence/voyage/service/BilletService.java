package com.agence.voyage.service;

import com.agence.voyage.entity.Billet;
import com.agence.voyage.repository.BilletRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BilletService {

    private final BilletRepository billetRepository;

    public List<Billet> recupererTous() {
        return billetRepository.findAll();
    }

    public List<Billet> recupererParUtilisateur(Long utilisateurId) {
        return billetRepository.findByReservationUtilisateurId(utilisateurId);
    }

    public Billet recupererParId(Long id) {
        return billetRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Billet introuvable"));
    }

    // UPDATE (Pour l'admin : ex: changer la place "12A" en "14B")
    public Billet modifier(Long id, Billet details) {
        Billet billet = recupererParId(id);
        billet.setSiege(details.getSiege());
        return billetRepository.save(billet);
    }

    // DELETE (Pour l'admin)
    public void supprimer(Long id) {
        billetRepository.deleteById(id);
    }
}