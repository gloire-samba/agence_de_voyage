package com.agence.voyage.security;

import java.security.Key;
import java.util.Date;

import org.springframework.stereotype.Service;

import com.agence.voyage.entity.Utilisateur;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

@Service
public class JwtService {
    
    // 👉 LA CORRECTION EST ICI : On utilise une clé secrète fixe (assez longue pour le niveau de sécurité HS256).
    // Ainsi, tes tokens survivront aux redémarrages de Spring !
    private static final String SECRET_STRING = "MaCleSecreteSuperLonguePourSpringEtAngularQuiNeDoitPasChanger123!";
    private static final Key SECRET_KEY = Keys.hmacShaKeyFor(SECRET_STRING.getBytes());

    private static final long EXPIRATION_TIME = 86400000;

    public String genererToken(Utilisateur utilisateur) {
        return Jwts.builder()
                .setSubject(utilisateur.getEmail())
                .claim("role", utilisateur.getRole())
                .claim("id", utilisateur.getId()) // Pratique pour Angular
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION_TIME))
                .signWith(SECRET_KEY)
                .compact();
    }

    public Claims extraireClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(SECRET_KEY)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}