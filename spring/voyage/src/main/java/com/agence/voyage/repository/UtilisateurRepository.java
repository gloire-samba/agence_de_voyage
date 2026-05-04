package com.agence.voyage.repository;

import com.agence.voyage.entity.Utilisateur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {
    
    // Pour la connexion (vérifier si l'email existe)
    Optional<Utilisateur> findByEmail(String email);
    
    boolean existsByEmail(String email);
}