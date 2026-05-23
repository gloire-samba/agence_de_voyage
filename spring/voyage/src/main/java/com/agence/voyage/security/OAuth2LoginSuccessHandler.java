package com.agence.voyage.security;

import java.io.IOException;
import java.util.UUID;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import com.agence.voyage.entity.Utilisateur;
import com.agence.voyage.repository.UtilisateurRepository;

import jakarta.servlet.http.Cookie;
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
                    newUser.setMotDePasse(UUID.randomUUID().toString());
                    newUser.setRole("ROLE_USER");
                    return utilisateurRepository.save(newUser);
                });

        String token = jwtService.genererToken(utilisateur);

        // 👉 Lecture exclusive du Cookie qu'on a créé dans le contrôleur
        String frontend = null;
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("oauth_frontend_origin".equals(cookie.getName())) {
                    frontend = cookie.getValue();
                    break;
                }
            }
        }

        // Valeur par défaut : Angular
        String frontendUrl = "http://localhost:4200"; 
        
        // Si le cookie dit react, on redirige vers Vite
        if ("react".equals(frontend)) {
            frontendUrl = "http://localhost:5173";
        }

        // Nettoyage du cookie
        Cookie cookieNettoyage = new Cookie("oauth_frontend_origin", null);
        cookieNettoyage.setPath("/");
        cookieNettoyage.setMaxAge(0);
        response.addCookie(cookieNettoyage);

        String targetUrl = frontendUrl + "/login?token=" + token 
                         + "&id=" + utilisateur.getId() 
                         + "&role=" + utilisateur.getRole()
                         + "&email=" + utilisateur.getEmail();
                         
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}