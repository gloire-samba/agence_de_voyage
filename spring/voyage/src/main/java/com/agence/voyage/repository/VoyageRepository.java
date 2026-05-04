package com.agence.voyage.repository;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.agence.voyage.entity.Voyage;

@Repository
public interface VoyageRepository extends JpaRepository<Voyage, Long> {
    
    // Pour une barre de recherche classique : trouver les voyages entre deux villes
    List<Voyage> findByVilleDepartIgnoreCaseAndVilleArriveeIgnoreCase(String villeDepart, String villeArrivee);

    @Query("SELECT DISTINCT v FROM Voyage v LEFT JOIN v.segments s WHERE " +
           "(s.ordre = 1) AND " + 
           "(:statut IS NULL OR UPPER(v.statut) = UPPER(:statut)) AND " +
           // 👉 CORRECTION : On exige un départ dans le futur SEULEMENT SI le statut n'est pas précisé
           "(:statut IS NOT NULL OR s.heureDepart >= CURRENT_TIMESTAMP) AND " +
           "(:depart IS NULL OR LOWER(v.villeDepart) LIKE :depart) AND " +
           "(:arrivee IS NULL OR LOWER(v.villeArrivee) LIKE :arrivee) AND " +
           "(:prixMin IS NULL OR CAST(v.prixTotal AS double) >= CAST(:prixMin AS double)) AND " +
           "(:prixMax IS NULL OR CAST(v.prixTotal AS double) <= CAST(:prixMax AS double)) AND " +
           "(:maxSegments IS NULL OR SIZE(v.segments) <= :maxSegments) AND " +
           "(:minSegments IS NULL OR SIZE(v.segments) >= :minSegments) AND " +
           "(:dateDebut IS NULL OR CAST(s.heureDepart AS string) >= :dateDebut) AND " +
           "(:dateFin IS NULL OR CAST(s.heureDepart AS string) <= :dateFin)")
    List<Voyage> rechercherParCriteresFuzzy(
            @Param("depart") String depart, 
            @Param("arrivee") String arrivee, 
            @Param("prixMin") BigDecimal prixMin,
            @Param("prixMax") BigDecimal prixMax,
            @Param("minSegments") Integer minSegments,
            @Param("maxSegments") Integer maxSegments,
            @Param("dateDebut") String dateDebut,
            @Param("dateFin") String dateFin,
            @Param("statut") String statut);
}