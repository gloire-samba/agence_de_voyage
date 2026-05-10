package com.agence.voyage.controller;

import com.agence.voyage.entity.Billet;
import com.agence.voyage.entity.Utilisateur;
import com.agence.voyage.repository.UtilisateurRepository;
import com.agence.voyage.service.BilletService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/billets")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class BilletController {

    private final BilletService billetService;
    private final UtilisateurRepository utilisateurRepository;

    // 👉 ASTUCE ANTI-BOUCLE : On formate nous-mêmes le JSON pour Angular
    private Map<String, Object> convertirBilletEnMap(Billet b) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", b.getId());
        map.put("siege", b.getSiege());
        
        if (b.getReservation() != null) {
            map.put("reservationId", b.getReservation().getId());
            if (b.getReservation().getVoyage() != null) {
                map.put("voyageId", b.getReservation().getVoyage().getId());
            }
            if (b.getReservation().getUtilisateur() != null) {
                map.put("utilisateurId", b.getReservation().getUtilisateur().getId());
            }
        }
        return map;
    }

    // 👉 LECTURE : L'intelligence est ici (Admin = Tous, User = Les siens)
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listerBillets(Principal principal) {
        Utilisateur user = utilisateurRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
                
        List<Billet> billets;

        if ("ROLE_ADMIN".equals(user.getRole())) {
            billets = billetService.recupererTous(); // L'admin voit tout
        } else {
            billets = billetService.recupererParUtilisateur(user.getId()); // Le client voit les siens
        }

        List<Map<String, Object>> reponse = billets.stream()
                .map(this::convertirBilletEnMap)
                .collect(Collectors.toList());

        return ResponseEntity.ok(reponse);
    }

    // 👉 LECTURE PAR ID : Avec vérification de propriété
    @GetMapping("/{id}")
    public ResponseEntity<?> recupererParId(@PathVariable Long id, Principal principal) {
        Billet billet = billetService.recupererParId(id);
        Utilisateur user = utilisateurRepository.findByEmail(principal.getName()).orElseThrow();

        // Sécurité : Si je ne suis pas admin, je vérifie que c'est bien MON billet
        boolean estAdmin = "ROLE_ADMIN".equals(user.getRole());
        boolean estMonBillet = billet.getReservation().getUtilisateur().getId().equals(user.getId());

        if (!estAdmin && !estMonBillet) {
            return ResponseEntity.status(403).body(Map.of("erreur", "Accès refusé. Ce n'est pas votre billet."));
        }

        return ResponseEntity.ok(convertirBilletEnMap(billet));
    }

    // 👉 MODIFICATION : Réservé à l'Admin
    @PutMapping("/{id}")
    public ResponseEntity<?> modifier(@PathVariable Long id, @RequestBody Billet details, Principal principal) {
        Utilisateur user = utilisateurRepository.findByEmail(principal.getName()).orElseThrow();
        if (!"ROLE_ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(403).body(Map.of("erreur", "Seul un administrateur peut modifier un billet."));
        }
        return ResponseEntity.ok(convertirBilletEnMap(billetService.modifier(id, details)));
    }

    // 👉 SUPPRESSION : Réservé à l'Admin
    @DeleteMapping("/{id}")
    public ResponseEntity<?> supprimer(@PathVariable Long id, Principal principal) {
        Utilisateur user = utilisateurRepository.findByEmail(principal.getName()).orElseThrow();
        if (!"ROLE_ADMIN".equals(user.getRole())) {
            return ResponseEntity.status(403).body(Map.of("erreur", "Seul un administrateur peut supprimer un billet."));
        }
        billetService.supprimer(id);
        return ResponseEntity.noContent().build();
    }
}