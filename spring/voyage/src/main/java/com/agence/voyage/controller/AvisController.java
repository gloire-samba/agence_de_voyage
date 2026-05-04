package com.agence.voyage.controller;

import com.agence.voyage.entity.Avis;
import com.agence.voyage.service.AvisService;
import com.agence.voyage.service.IaClientService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/avis")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AvisController {

    private final AvisService avisService;
    private final IaClientService iaClientService;


    @PostMapping("/avis-vocal")
    public ResponseEntity<?> creerAvisVocal(@RequestBody Avis avis) {
        return ResponseEntity.status(HttpStatus.CREATED).body(avisService.creer(avis));
    }

    @GetMapping
    public ResponseEntity<List<Avis>> listerTous() {
        return ResponseEntity.ok(avisService.recupererTous());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Avis> recupererParId(@PathVariable Long id) {
        return ResponseEntity.ok(avisService.recupererParId(id));
    }

    @GetMapping("/voyage/{voyageId}")
    public ResponseEntity<List<Avis>> recupererParVoyage(@PathVariable Long voyageId) {
        return ResponseEntity.ok(avisService.recupererParVoyage(voyageId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Avis> modifier(@PathVariable Long id, @RequestBody Avis avisDetails) {
        return ResponseEntity.ok(avisService.modifier(id, avisDetails));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {
        avisService.supprimer(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/vocal")
    public ResponseEntity<?> creerAvisVocal(
            @RequestParam("audio") MultipartFile audio,
            @RequestParam("voyageId") Long voyageId,
            @RequestParam("utilisateurId") Long utilisateurId,
            @RequestParam("note") Integer note) {
        
        // 1. Transformer l'audio en texte via l'IA
        String commentaire = iaClientService.transcrireAudio(audio);
        
        // 2. Enregistrer l'avis (Logique identique à un avis écrit)
        // Note: Adapte selon tes DTOs existants
        Avis avis = new Avis();
        avis.setCommentaire(commentaire);
        avis.setNote(note);
        // ... liaison voyage et utilisateur ...
        
        avisService.creer(avis);
        
        return ResponseEntity.ok(Map.of("message", "Avis enregistré", "texte", commentaire));
    }
}