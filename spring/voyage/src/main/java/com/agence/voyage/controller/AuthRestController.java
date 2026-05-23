package com.agence.voyage.controller;

import com.agence.voyage.entity.Utilisateur;
import com.agence.voyage.repository.UtilisateurRepository;
import com.agence.voyage.security.JwtService;
import com.agence.voyage.service.EmailService;

import jakarta.servlet.http.HttpServletResponse;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import jakarta.servlet.http.Cookie;
import java.io.IOException;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthRestController {

    private final UtilisateurRepository utilisateurRepository;
    private final JwtService jwtService;
    private final EmailService emailService; // 👉 Injecte ton service d'e-mail

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
    public ResponseEntity<?> register(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("motDePasse");

        if (utilisateurRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email déjà utilisé."));
        }

        Utilisateur u = new Utilisateur();
        u.setEmail(email);
        u.setMotDePasse(password);
        u.setRole("ROLE_USER");
        utilisateurRepository.save(u);

        // 👉 ENVOI DU MAIL DE BIENVENUE
        try {
            String sujet = "Bienvenue chez Agence de Voyage ✈️";
            String contenu = "Bonjour,\n\nVotre compte a été créé avec succès. Bienvenue dans notre communauté de voyageurs !";
            emailService.envoyerEmail(email, sujet, contenu);
        } catch (Exception e) {
            // On ne bloque pas l'inscription si le mail échoue
            System.err.println("Erreur envoi mail bienvenue : " + e.getMessage());
        }

        return ResponseEntity.ok(Map.of("message", "Inscription réussie !"));
    }

    @PostMapping("/check-email")
    public ResponseEntity<?> checkEmail(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        
        Optional<Utilisateur> userOpt = utilisateurRepository.findByEmail(email);
        
        if (userOpt.isPresent()) {
            Utilisateur user = userOpt.get();
            
            // 👉 ENVOI DU VRAI MOT DE PASSE PAR MAIL
            try {
                String sujet = "Récupération de votre mot de passe 🔒";
                String contenu = "Bonjour,\n\n" +
                                 "Vous avez oublié votre mot de passe. Voici votre mot de passe actuel : " + user.getMotDePasse() + "\n\n" +
                                 "Nous vous conseillons de le modifier depuis votre profil une fois connecté.\n\n" +
                                 "L'équipe Agence de Voyage.";
                                 
                emailService.envoyerEmail(email, sujet, contenu); // Ou mailSender.send(message) selon ton implémentation
            } catch (Exception e) {
                System.err.println("Erreur envoi mail reset : " + e.getMessage());
            }
            
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String newPassword = payload.get("newPassword");

        return utilisateurRepository.findByEmail(email).map(user -> {
            user.setMotDePasse(newPassword);
            utilisateurRepository.save(user);
            return ResponseEntity.ok().build();
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // 👉 LA NOUVELLE MÉTHODE INFALLIBLE POUR OAUTH2
    @GetMapping("/init-social")
    public void initSocialLogin(@RequestParam String fournisseur, @RequestParam(defaultValue = "angular") String frontend, HttpServletResponse response) throws IOException {
        // On crée un Cookie sécurisé et isolé
        Cookie cookie = new Cookie("oauth_frontend_origin", frontend);
        cookie.setPath("/");
        cookie.setMaxAge(300); // Valable 5 minutes
        response.addCookie(cookie);
        
        // On redirige ENFIN vers Spring Security, maintenant que le cookie est bien en place
        response.sendRedirect("/oauth2/authorization/" + fournisseur);
    }
}