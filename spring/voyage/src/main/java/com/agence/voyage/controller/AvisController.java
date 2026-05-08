package com.agence.voyage.controller;

import com.agence.voyage.entity.Avis;
import com.agence.voyage.entity.Reservation;
import com.agence.voyage.entity.Utilisateur;
import com.agence.voyage.repository.ReservationRepository;
import com.agence.voyage.repository.UtilisateurRepository;
import com.agence.voyage.service.AvisService;
import com.agence.voyage.service.IaClientService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/avis")
@RequiredArgsConstructor
public class AvisController {

    private final AvisService avisService;
    private final IaClientService iaClientService;
    private final UtilisateurRepository utilisateurRepository;
    private final ReservationRepository reservationRepository;

    @PostMapping
    public ResponseEntity<?> creerAvisTexte(@RequestBody Map<String, Object> payload, Principal principal) {
        try {
            Utilisateur user = utilisateurRepository.findByEmail(principal.getName())
                    .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
            
            int note = Integer.parseInt(payload.get("note").toString());
            String commentaire = payload.get("commentaire") != null ? payload.get("commentaire").toString() : "";
            
            Long reservationId = Long.valueOf(payload.get("reservationId").toString());
            Reservation res = reservationRepository.findById(reservationId)
                    .orElseThrow(() -> new RuntimeException("Réservation introuvable"));

            Avis avis = new Avis();
            avis.setVoyage(res.getVoyage());
            avis.setUtilisateur(user); 
            avis.setNote(note);
            avis.setCommentaire(commentaire);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(avisService.creer(avis));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping(value = "/vocal", consumes = "multipart/form-data")
    public ResponseEntity<?> creerAvisVocal(
            @RequestParam("audio") MultipartFile audio,
            @RequestParam("reservationId") Long reservationId,
            @RequestParam("note") Integer note,
            Principal principal) {
        try {
            Utilisateur user = utilisateurRepository.findByEmail(principal.getName())
                    .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));
                    
            Reservation res = reservationRepository.findById(reservationId)
                    .orElseThrow(() -> new RuntimeException("Réservation introuvable"));
            
            String commentaire = iaClientService.transcrireAudio(audio);
            
            Avis avis = new Avis();
            avis.setVoyage(res.getVoyage());
            avis.setUtilisateur(user); 
            avis.setNote(note);
            avis.setCommentaire(commentaire);
            
            avisService.creer(avis);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Avis enregistré", "texte", commentaire));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // 👉 LA SOLUTION EST ICI : On force le formatage du JSON pour éviter les censures de Spring
    private Map<String, Object> convertirAvisEnMap(Avis a) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", a.getId());
        map.put("note", a.getNote());
        map.put("commentaire", a.getCommentaire());
        
        if (a.getVoyage() != null) {
            map.put("voyage", Map.of("id", a.getVoyage().getId()));
        }
        if (a.getUtilisateur() != null) {
            map.put("utilisateur", Map.of("id", a.getUtilisateur().getId(), "email", a.getUtilisateur().getEmail()));
        }
        return map;
    }

    // --- METHODES CLASSIQUES RE-SÉCURISÉES ---
    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> listerTous() { 
        List<Map<String, Object>> liste = avisService.recupererTous().stream()
                .map(this::convertirAvisEnMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(liste); 
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> recupererParId(@PathVariable Long id) { 
        return ResponseEntity.ok(convertirAvisEnMap(avisService.recupererParId(id))); 
    }

    @GetMapping("/voyage/{voyageId}")
    public ResponseEntity<List<Map<String, Object>>> recupererParVoyage(@PathVariable Long voyageId) { 
        List<Map<String, Object>> liste = avisService.recupererParVoyage(voyageId).stream()
                .map(this::convertirAvisEnMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(liste); 
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> modifier(@PathVariable Long id, @RequestBody Avis avisDetails) { 
        return ResponseEntity.ok(convertirAvisEnMap(avisService.modifier(id, avisDetails))); 
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {
        avisService.supprimer(id);
        return ResponseEntity.noContent().build();
    }
}