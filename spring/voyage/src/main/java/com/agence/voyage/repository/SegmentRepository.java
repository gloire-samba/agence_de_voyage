package com.agence.voyage.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.agence.voyage.entity.Segment;

@Repository
public interface SegmentRepository extends JpaRepository<Segment, Long> {
    
    // Récupère toutes les escales d'un voyage, triées par la colonne "ordre" (1, 2, 3...)
    List<Segment> findByVoyageIdOrderByOrdreAsc(Long voyageId);
}