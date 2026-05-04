package com.agence.voyage.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.agence.voyage.entity.Voyage;
import com.agence.voyage.service.IaClientService;
import com.agence.voyage.service.VoyageService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/voyages")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class VoyageController {

    private final VoyageService voyageService;
    private final IaClientService iaClientService;

    @PostMapping
    public ResponseEntity<Voyage> creer(@RequestBody Voyage voyage) {
        return ResponseEntity.status(HttpStatus.CREATED).body(voyageService.creer(voyage));
    }

    @GetMapping
    public ResponseEntity<List<Voyage>> listerTous() {
        return ResponseEntity.ok(voyageService.recupererTous());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Voyage> recupererParId(@PathVariable Long id) {
        return ResponseEntity.ok(voyageService.recupererParId(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Voyage> modifier(@PathVariable Long id, @RequestBody Voyage voyageDetails) {
        return ResponseEntity.ok(voyageService.modifier(id, voyageDetails));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimer(@PathVariable Long id) {
        voyageService.supprimer(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/recherche-intelligente")
    public ResponseEntity<List<Voyage>> rechercheIntelligente(@RequestBody Map<String, String> payload) {
        String texte = payload.get("texte");
        return ResponseEntity.ok(iaClientService.chercherVoyageAvecIA(texte));
    }

    @PostMapping("/recherche-vocale")
    public ResponseEntity<?> rechercheVocale(@RequestParam("audio") MultipartFile audio) {
        try {
            String texte = iaClientService.transcrireAudio(audio);
            List<Voyage> resultats = iaClientService.chercherVoyageAvecIA(texte);
            return ResponseEntity.ok(Map.of("texteReconnu", texte, "resultats", resultats));
        } catch (Exception e) {
            // Emballage propre de l'erreur
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                                .body(Map.of("erreur", e.getMessage()));
        }
    }
}