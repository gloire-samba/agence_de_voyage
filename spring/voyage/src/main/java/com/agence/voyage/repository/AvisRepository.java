package com.agence.voyage.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.agence.voyage.entity.Avis;

@Repository
public interface AvisRepository extends JpaRepository<Avis, Long> {
    
    // Récupérer tous les avis d'un voyage précis
    List<Avis> findByVoyageId(Long voyageId);

    // 👉 MODIFIÉ : On ajoute "OrderByDateCreationDesc" pour trier du plus récent au plus ancien
    List<Avis> findByVoyageIdOrderByDateCreationDesc(Long voyageId);
}