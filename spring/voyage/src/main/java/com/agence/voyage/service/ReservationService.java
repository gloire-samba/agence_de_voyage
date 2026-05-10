package com.agence.voyage.service;

import com.agence.voyage.entity.Reservation;
import com.agence.voyage.entity.Utilisateur;
import com.agence.voyage.entity.Voyage;
import com.agence.voyage.entity.Billet;
import com.agence.voyage.repository.ReservationRepository;
import com.agence.voyage.repository.VoyageRepository;
import com.itextpdf.text.Document;
import com.itextpdf.text.Paragraph;
import com.itextpdf.text.pdf.PdfWriter;
import com.stripe.exception.StripeException;
import com.stripe.model.Refund;
import com.stripe.param.RefundCreateParams;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.mail.javamail.JavaMailSender;

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final VoyageRepository voyageRepository;
    private final EmailService emailService;

    // L'alphabet pour générer nos sièges jusqu'à Z
    private final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // 👉 LA LIGNE MAGIQUE À AJOUTER :
    private final JavaMailSender mailSender;

    public List<Reservation> getHistoriqueUtilisateur(Long utilisateurId) {
        return reservationRepository.findByUtilisateurIdOrderByDateConfirmationDesc(utilisateurId);
    }

    @Transactional
    public Reservation creerReservation(Long voyageId, Utilisateur utilisateur, int nbPlacesDemandees) {
        Voyage voyage = voyageRepository.findById(voyageId)
            .orElseThrow(() -> new RuntimeException("Voyage introuvable"));
        
        // 1. Vérifier la disponibilité réelle
        int placesOccupees = calculerPlacesOccupees(voyage);
        int placesRestantes = voyage.getNombrePlacesTotal() - placesOccupees;

        if (nbPlacesDemandees > placesRestantes) {
            throw new RuntimeException("Réservation impossible : Il ne reste que " + placesRestantes + " places.");
        }

        // 2. Calculer le prix total (Prix unitaire * nombre de places)
        BigDecimal prixTotal = voyage.getPrixTotal().multiply(new BigDecimal(nbPlacesDemandees));

        // 3. 👉 Attribution intelligente et dynamique des sièges
        List<String> siegesAttribues = trouverProchainesPlacesLibres(voyage, nbPlacesDemandees);

        // 4. Création de la réservation
        Reservation res = new Reservation();
        res.setVoyage(voyage);
        res.setUtilisateur(utilisateur);
        res.setPrixPaye(prixTotal);
        res.setStatut("EN_ATTENTE");
        res.setDateConfirmation(null);

        // 5. Attacher les billets/sièges à la réservation
        List<Billet> billets = siegesAttribues.stream().map(siege -> {
            Billet b = new Billet();
            b.setSiege(siege);
            b.setReservation(res);
            return b;
        }).collect(Collectors.toList());
        
        res.setBillets(billets);

        // 6. Mettre à jour le statut du voyage si le véhicule est désormais plein
        if (placesOccupees + nbPlacesDemandees >= voyage.getNombrePlacesTotal()) {
            voyage.setStatut("COMPLET");
            voyageRepository.save(voyage);
        }

        return reservationRepository.save(res);
    }

    // =========================================================
    // 🧠 LOGIQUE DYNAMIQUE DES SIÈGES
    // =========================================================

    private List<String> trouverProchainesPlacesLibres(Voyage voyage, int nbPlacesDemandees) {
        // 1. Lister tous les sièges qui sont DÉJÀ pris (billets des réservations non annulées)
        Set<String> siegesPris = reservationRepository.findByVoyageId(voyage.getId()).stream()
                .filter(r -> !r.getStatut().equals("ANNULE"))
                .flatMap(r -> r.getBillets().stream())
                .map(Billet::getSiege)
                .collect(Collectors.toSet());

        // 2. Générer le plan de cabine parfait pour la capacité de ce voyage
        List<String> planDeCabine = genererPlanDeCabine(voyage.getNombrePlacesTotal());
        List<String> selection = new ArrayList<>();

        // 3. Assigner les premières places libres trouvées
        for (String siege : planDeCabine) {
            if (!siegesPris.contains(siege)) {
                selection.add(siege);
                if (selection.size() == nbPlacesDemandees) {
                    return selection;
                }
            }
        }
        throw new RuntimeException("Erreur critique : Impossible de trouver assez de sièges libres.");
    }

    /**
     * Génère une liste de sièges (Ex: 1A, 1B, 2A...) parfaitement adaptée à la capacité,
     * sans jamais dépasser 99 rangées, en élargissant les colonnes si nécessaire.
     */
    /**
     * Génère une liste de sièges (Ex: 1A, 1B, 2A...) parfaitement adaptée à la capacité,
     * sans jamais dépasser 99 rangées, en élargissant les colonnes si nécessaire.
     */
    private List<String> genererPlanDeCabine(int capacite) {
        List<String> sieges = new ArrayList<>();
        
        // Calcul mathématique : On élargit l'avion (plus de lettres) si on dépasse 99 rangées.
        // Un avion commercial standard a au moins 6 sièges par rangée (A, B, C, D, E, F).
        int nbColonnes = Math.max(6, (int) Math.ceil((double) capacite / 99.0));
        
        int siegeCrees = 0;
        int rangee = 1;
        
        while (siegeCrees < capacite) {
            for (int c = 0; c < nbColonnes && siegeCrees < capacite; c++) {
                // ALPHABET.charAt(0) donne 'A', charAt(5) donne 'F'
                sieges.add(rangee + String.valueOf(ALPHABET.charAt(c)));
                siegeCrees++;
            }
            rangee++;
        }
        return sieges;
    }

    private int calculerPlacesOccupees(Voyage v) {
        return reservationRepository.findByVoyageId(v.getId()).stream()
                .filter(r -> !r.getStatut().equals("ANNULE"))
                .mapToInt(r -> r.getBillets().size())
                .sum();
    }

    // =========================================================
    // MÉTHODES DE PAIEMENT ET D'ANNULATION (Conservées)
    // =========================================================

    @Transactional
    public Reservation confirmerPaiement(Long id, String stripePaymentId) {
        Reservation r = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réservation introuvable"));

        r.setStatut("CONFIRME");
        r.setStripePaymentId(stripePaymentId);
        r.setDateConfirmation(LocalDateTime.now());
        reservationRepository.save(r);

        String placesStr = r.getBillets().stream()
                .map(Billet::getSiege)
                .collect(Collectors.joining(", "));

        // 👉 1. GÉNÉRATION DU PDF EN MÉMOIRE
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();
            document.add(new Paragraph("CARTE D'EMBARQUEMENT\n\n"));
            document.add(new Paragraph("N° de Commande : #" + r.getId()));
            document.add(new Paragraph("Passager : " + r.getUtilisateur().getEmail()));
            document.add(new Paragraph("Trajet : " + r.getVoyage().getVilleDepart() + " -> " + r.getVoyage().getVilleArrivee()));
            document.add(new Paragraph("Siège(s) assigné(s) : " + placesStr));
            document.add(new Paragraph("Montant réglé : " + r.getPrixPaye() + " EUR\n\n"));
            document.add(new Paragraph("Merci de voyager avec nous. Bon voyage !"));
            document.close();
        } catch (Exception e) {
            System.err.println("❌ Erreur de génération PDF : " + e.getMessage());
        }

        // 👉 2. ENVOI DE L'EMAIL AVEC PIÈCE JOINTE
        try {
            MimeMessage message = mailSender.createMimeMessage();
            // Le "true" active le mode "multipart" pour autoriser les pièces jointes
            MimeMessageHelper helper = new MimeMessageHelper(message, true); 
            
            helper.setTo(r.getUtilisateur().getEmail());
            helper.setSubject("Confirmation de votre réservation - Vol " + r.getVoyage().getVilleDepart());
            
            String texteMail = "Bonjour,\n\n" +
                    "Votre paiement a été validé. Votre réservation est CONFIRMÉE.\n" +
                    "Vos places attribuées : " + placesStr + "\n" +
                    "Montant total payé : " + r.getPrixPaye() + " €\n\n" +
                    "👉 Vous trouverez en pièce jointe votre billet d'embarquement au format PDF.\n\n" +
                    "Bon voyage !";
            helper.setText(texteMail);

            // On attache le PDF
            helper.addAttachment("Billet_Voyage_" + r.getId() + ".pdf", new ByteArrayResource(out.toByteArray()));

            mailSender.send(message);
            System.out.println("✅ Mail avec pièce jointe PDF envoyé !");
        } catch (Exception e) {
            System.err.println("❌ Erreur d'envoi d'email avec PDF : " + e.getMessage());
        }

        return r;
    }

    @Transactional
    public void supprimer(Long id) {
        reservationRepository.deleteById(id);
    }

    @Transactional
    public Reservation annuler(Long id) {
        Reservation res = reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Réservation introuvable"));
        
        res.setStatut("ANNULE");

        // Si le voyage était "COMPLET", il redevient "EN_COURS" ou "A_VENIR" car des places se libèrent
        Voyage voyage = res.getVoyage();
        if ("COMPLET".equals(voyage.getStatut())) {
            // Logique simplifiée : on le remet à l'état par défaut, ton VoyageService corrigera l'état exact au redémarrage
            voyage.setStatut("A_VENIR"); 
            voyageRepository.save(voyage);
        }

        // Remboursement Stripe
        if (res.getStripePaymentId() != null && !res.getStripePaymentId().isEmpty()) {
            try {
                RefundCreateParams params = RefundCreateParams.builder()
                        .setPaymentIntent(res.getStripePaymentId())
                        .build();
                Refund refund = Refund.create(params);
                System.out.println("✅ Remboursement Stripe effectué avec succès. ID: " + refund.getId());
            } catch (StripeException e) {
                System.err.println("❌ Erreur Stripe lors du remboursement : " + e.getMessage());
            }
        }
        
        Reservation reservationSauvegardee = reservationRepository.save(res);

        if (reservationSauvegardee.getUtilisateur() != null && reservationSauvegardee.getUtilisateur().getEmail() != null) {
            String destinataire = reservationSauvegardee.getUtilisateur().getEmail();
            String sujet = "🚫 Annulation de votre réservation #" + reservationSauvegardee.getId();
            String contenu = "Bonjour,\n\nVotre réservation a été ANNULÉE.\n" +
                             "Un remboursement total de " + reservationSauvegardee.getPrixPaye() + "€ a été déclenché vers votre banque.\nÀ bientôt.";
            emailService.envoyerEmail(destinataire, sujet, contenu);
        }

        return reservationSauvegardee;
    }
}