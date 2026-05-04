package com.agence.voyage.service;

import com.agence.voyage.entity.Reservation;
import com.agence.voyage.repository.ReservationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;

    public List<Reservation> getHistoriqueUtilisateur(Long utilisateurId) {
        return reservationRepository.findByUtilisateurIdOrderByDateConfirmationDesc(utilisateurId);
    }

    @Transactional
    public Reservation creerReservation(Reservation reservation) {
        reservation.setStatut("EN_ATTENTE");
        return reservationRepository.save(reservation);
    }

    @Transactional
    public Reservation confirmerPaiement(Long reservationId) {
        Reservation res = reservationRepository.findById(reservationId)
                .orElseThrow(() -> new RuntimeException("Réservation introuvable"));
        
        // Logique demandée : la date et l'heure ne sont fixées que maintenant
        res.setDateConfirmation(LocalDateTime.now());
        res.setStatut("CONFIRME");
        
        // C'est ici que tu appellerais ton service d'envoi de mail plus tard
        System.out.println("📧 Mail de confirmation envoyé pour le voyage vers " + res.getVoyage().getVilleArrivee());
        
        return reservationRepository.save(res);
    }

    @Transactional
    public void supprimer(Long id) {
        reservationRepository.deleteById(id);
    }

    // NOUVELLE MÉTHODE : Pour l'utilisateur
    @Transactional
    public Reservation annuler(Long id) {
        Reservation res = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réservation introuvable"));
        res.setStatut("ANNULE");
        return reservationRepository.save(res);
    }
}