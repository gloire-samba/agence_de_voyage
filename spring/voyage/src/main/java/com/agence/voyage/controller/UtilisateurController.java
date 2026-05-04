package com.agence.voyage.controller;

import com.agence.voyage.entity.Utilisateur;
import com.agence.voyage.service.UtilisateurService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/utilisateurs")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    @PostMapping
    public ResponseEntity<?> creer(@RequestBody Utilisateur utilisateur) {
        try {
            Utilisateur nouvelUtilisateur = utilisateurService.creer(utilisateur);
            return ResponseEntity.status(HttpStatus.CREATED).body(nouvelUtilisateur);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<List<Utilisateur>> listerTous() {
        return ResponseEntity.ok(utilisateurService.recupererTous());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Utilisateur> recupererParId(@PathVariable Long id) {
        return ResponseEntity.ok(utilisateurService.recupererParId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Utilisateur> modifier(@PathVariable Long id, @RequestBody Utilisateur utilisateurDetails) {
        return ResponseEntity.ok(utilisateurService.modifier(id, utilisateurDetails));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {
        utilisateurService.supprimer(id);
        return ResponseEntity.noContent().build();
    }
}