package com.agence.voyage.repository;

import com.agence.voyage.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByUtilisateurIdOrderByDateConfirmationDesc(Long utilisateurId);

    // 👉 NOUVEAU : Pour trouver tous les billets rattachés à un voyage
    List<Reservation> findByVoyageId(Long voyageId);

    // 👉 Trouver l'utilisateur qui possède une place spécifique dans un voyage
    @Query("SELECT r FROM Reservation r JOIN r.billets b WHERE r.voyage.id = :voyageId AND b.siege = :siege")
    Optional<Reservation> trouverParPlace(@Param("voyageId") Long voyageId, @Param("siege") String siege);

    // 👉 Pour le filtrage général admin
    @Query("SELECT r FROM Reservation r JOIN r.billets b WHERE b.siege LIKE %:keyword%")
    List<Reservation> chercherParNumeroDeSiege(@Param("keyword") String keyword);
}