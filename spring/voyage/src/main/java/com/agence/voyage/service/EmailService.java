package com.agence.voyage.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    // L'outil de Spring qui gère l'envoi
    private final JavaMailSender mailSender;

    public void envoyerEmail(String destinataire, String sujet, String contenu) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(destinataire);
            message.setSubject(sujet);
            message.setText(contenu);
            
            // L'envoi réel
            mailSender.send(message);
            System.out.println("✅ E-mail envoyé avec succès à : " + destinataire);
            
        } catch (Exception e) {
            System.err.println("❌ Erreur lors de l'envoi de l'e-mail : " + e.getMessage());
        }
    }
}