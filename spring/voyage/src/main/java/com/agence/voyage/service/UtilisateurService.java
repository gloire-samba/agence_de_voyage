package com.agence.voyage.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.agence.voyage.entity.Utilisateur;
import com.agence.voyage.repository.UtilisateurRepository;

import lombok.RequiredArgsConstructor;

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

    // UPDATE - 👉 C'EST ICI QUE SE TROUVE LA CORRECTION ANTI-CRASH
    public Utilisateur modifier(Long id, Utilisateur utilisateurDetails) {
        Utilisateur utilisateur = recupererParId(id);
        
        // On modifie l'email seulement s'il est fourni
        if (utilisateurDetails.getEmail() != null && !utilisateurDetails.getEmail().isEmpty()) {
            utilisateur.setEmail(utilisateurDetails.getEmail());
        }
        
        // On modifie le mot de passe seulement s'il est fourni
        if (utilisateurDetails.getMotDePasse() != null && !utilisateurDetails.getMotDePasse().isEmpty()) {
            utilisateur.setMotDePasse(utilisateurDetails.getMotDePasse());
        }
        
        // On modifie le rôle seulement s'il est fourni (C'est ça qui causait l'erreur "NULL not allowed")
        if (utilisateurDetails.getRole() != null && !utilisateurDetails.getRole().isEmpty()) {
            utilisateur.setRole(utilisateurDetails.getRole());
        }
        
        return utilisateurRepository.save(utilisateur);
    }

    // DELETE
    public void supprimer(Long id) {
        utilisateurRepository.deleteById(id);
    }
}