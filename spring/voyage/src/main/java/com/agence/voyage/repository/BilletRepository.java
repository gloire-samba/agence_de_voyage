package com.agence.voyage.repository;

import com.agence.voyage.entity.Billet;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface BilletRepository extends JpaRepository<Billet, Long> {
    // 👉 Permet de trouver tous les billets appartenant à un utilisateur précis
    List<Billet> findByReservationUtilisateurId(Long utilisateurId);
}