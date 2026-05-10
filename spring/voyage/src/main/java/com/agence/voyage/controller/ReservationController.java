package com.agence.voyage.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.agence.voyage.entity.Reservation;
import com.agence.voyage.entity.Utilisateur;
import com.agence.voyage.service.ReservationService;
import com.agence.voyage.repository.UtilisateurRepository;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReservationController {

    private final ReservationService reservationService;
    private final UtilisateurRepository utilisateurRepository; // 👉 Ajouté pour récupérer l'utilisateur

    @GetMapping("/utilisateur/{id}")
    public ResponseEntity<List<Reservation>> getHistorique(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.getHistoriqueUtilisateur(id));
    }

    // 👉 LA MÉTHODE CORRIGÉE
    @PostMapping
    public ResponseEntity<?> reserver(@RequestBody Map<String, Object> payload) {
        try {
            // 1. Extraction de l'ID du voyage (Gère le format objet ou ID simple d'Angular)
            Long voyageId;
            if (payload.containsKey("voyage") && payload.get("voyage") instanceof Map) {
                voyageId = Long.valueOf(((Map<?, ?>) payload.get("voyage")).get("id").toString());
            } else {
                voyageId = Long.valueOf(payload.get("voyageId").toString());
            }

            // 2. Extraction de l'Utilisateur
            Long utilisateurId;
            if (payload.containsKey("utilisateur") && payload.get("utilisateur") instanceof Map) {
                utilisateurId = Long.valueOf(((Map<?, ?>) payload.get("utilisateur")).get("id").toString());
            } else {
                utilisateurId = Long.valueOf(payload.get("utilisateurId").toString());
            }
            
            Utilisateur user = utilisateurRepository.findById(utilisateurId)
                    .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

            // 3. Nombre de places (1 par défaut en attendant qu'on modifie le front-end)
            int nbPlaces = payload.containsKey("nbPlacesDemandees") ? 
                           Integer.parseInt(payload.get("nbPlacesDemandees").toString()) : 1;

            // 4. On appelle le nouveau service !
            Reservation res = reservationService.creerReservation(voyageId, user, nbPlaces);
            return ResponseEntity.ok(res);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("erreur", e.getMessage()));
        }
    }

    @PostMapping("/{id}/confirmer")
    public ResponseEntity<?> confirmerPaiement(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            String stripeId = payload.get("stripePaymentId"); 
            Reservation res = reservationService.confirmerPaiement(id, stripeId);
            return ResponseEntity.ok(res);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("erreur", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> annuler(@PathVariable Long id) {
        reservationService.supprimer(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/annuler")
    public ResponseEntity<?> annulerReservation(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(reservationService.annuler(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("erreur", e.getMessage()));
        }
    }
}