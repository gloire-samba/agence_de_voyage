package com.agence.voyage.service;

import com.agence.voyage.entity.Utilisateur;
import com.agence.voyage.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UtilisateurService {

    private final UtilisateurRepository utilisateurRepository;

    // CREATE
    public Utilisateur creer(Utilisateur utilisateur) {
        if (utilisateurRepository.existsByEmail(utilisateur.getEmail())) {
            throw new RuntimeException("Cet email est déjà utilisé.");
        }
        return utilisateurRepository.save(utilisateur);
    }

    // READ
    public List<Utilisateur> recupererTous() {
        return utilisateurRepository.findAll();
    }

    public Utilisateur recupererParId(Long id) {
        return utilisateurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé avec l'id : " + id));
    }

    // UPDATE
    public Utilisateur modifier(Long id, Utilisateur utilisateurDetails) {
        Utilisateur utilisateur = recupererParId(id);
        utilisateur.setEmail(utilisateurDetails.getEmail());
        // On ne modifie le mot de passe que s'il est fourni
        if (utilisateurDetails.getMotDePasse() != null && !utilisateurDetails.getMotDePasse().isEmpty()) {
            utilisateur.setMotDePasse(utilisateurDetails.getMotDePasse());
        }
        utilisateur.setRole(utilisateurDetails.getRole());
        return utilisateurRepository.save(utilisateur);
    }

    // DELETE
    public void supprimer(Long id) {
        utilisateurRepository.deleteById(id);
    }
}