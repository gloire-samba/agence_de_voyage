package com.agence.voyage.security;

import java.io.IOException;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.agence.voyage.entity.Utilisateur;
import com.agence.voyage.repository.UtilisateurRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UtilisateurRepository utilisateurRepository;
    private final JwtService jwtService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        
        String email = oAuth2User.getAttribute("email");
        if (email == null) {
            email = oAuth2User.getAttribute("login") + "@github.com";
        }

        final String finalEmail = email;
        
        Utilisateur utilisateur = utilisateurRepository.findByEmail(finalEmail)
                .orElseGet(() -> {
                    Utilisateur newUser = new Utilisateur();
                    newUser.setEmail(finalEmail);
                    newUser.setMotDePasse(UUID.randomUUID().toString()); // MDP aléatoire pour bloquer la co classique
                    newUser.setRole("ROLE_USER");
                    return utilisateurRepository.save(newUser);
                });

        String token = jwtService.genererToken(utilisateur);

        // Renvoie vers Angular avec le token
        String targetUrl = "http://localhost:4200/login?token=" + token 
                         + "&id=" + utilisateur.getId() 
                         + "&role=" + utilisateur.getRole();
                         
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}