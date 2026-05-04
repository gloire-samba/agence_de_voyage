package com.agence.voyage.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.agence.voyage.entity.Reservation;
import com.agence.voyage.service.ReservationService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ReservationController {

    private final ReservationService reservationService;

    @GetMapping("/utilisateur/{id}")
    public ResponseEntity<List<Reservation>> getHistorique(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.getHistoriqueUtilisateur(id));
    }

    @PostMapping
    public ResponseEntity<Reservation> reserver(@RequestBody Reservation reservation) {
        return ResponseEntity.ok(reservationService.creerReservation(reservation));
    }

    @PostMapping("/{id}/confirmer")
    public ResponseEntity<Reservation> confirmer(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.confirmerPaiement(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> annuler(@PathVariable Long id) {
        reservationService.supprimer(id);
        return ResponseEntity.noContent().build();
    }

    // NOUVELLE ROUTE : Le client annule sa réservation
    @PostMapping("/{id}/annuler")
    public ResponseEntity<Reservation> annulerReservation(@PathVariable Long id) {
        return ResponseEntity.ok(reservationService.annuler(id));
    }
}