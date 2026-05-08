package com.agence.voyage.controller;

import com.agence.voyage.entity.Utilisateur;
import com.agence.voyage.repository.UtilisateurRepository;
import com.agence.voyage.security.JwtService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthRestController {

    private final UtilisateurRepository utilisateurRepository;
    private final JwtService jwtService;

    @Data
    public static class LoginRequest {
        private String email;
        private String motDePasse;
    }

    @Data
    public static class UtilisateurRequest {
        private String email;
        private String motDePasse;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<Utilisateur> optUser = utilisateurRepository.findByEmail(request.getEmail());

        if (optUser.isPresent() && optUser.get().getMotDePasse().equals(request.getMotDePasse())) {
            Utilisateur u = optUser.get();
            String token = jwtService.genererToken(u);
            
            Map<String, String> response = new HashMap<>();
            response.put("token", token);
            response.put("role", u.getRole());
            response.put("email", u.getEmail());
            response.put("utilisateurId", String.valueOf(u.getId()));
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(401).body(Map.of("error", "Identifiants incorrects"));
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody UtilisateurRequest request) {
        if (utilisateurRepository.findByEmail(request.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Cet email est déjà utilisé."));
        }

        Utilisateur newUser = new Utilisateur();
        newUser.setEmail(request.getEmail());
        newUser.setMotDePasse(request.getMotDePasse()); 
        newUser.setRole("ROLE_USER");

        utilisateurRepository.save(newUser);
        return ResponseEntity.ok(Map.of("message", "Inscription réussie !"));
    }
}