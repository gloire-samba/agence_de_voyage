package com.agence.voyage.repository;

import com.agence.voyage.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Long> {
    List<Reservation> findByUtilisateurIdOrderByDateConfirmationDesc(Long utilisateurId);
}