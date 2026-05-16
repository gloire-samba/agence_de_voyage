package com.agence.voyage.service;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.agence.voyage.entity.Billet;
import com.agence.voyage.entity.Reservation;
import com.agence.voyage.entity.Utilisateur;
import com.agence.voyage.entity.Voyage;
import com.agence.voyage.repository.BilletRepository;
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

@Service
@RequiredArgsConstructor
public class ReservationService {

    private final ReservationRepository reservationRepository;
    private final VoyageRepository voyageRepository;
    private final EmailService emailService;
    private final BilletRepository billetRepository;
    private final JavaMailSender mailSender;

    private final String ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    public List<Reservation> getHistoriqueUtilisateur(Long utilisateurId) {
        return reservationRepository.findByUtilisateurIdOrderByDateConfirmationDesc(utilisateurId);
    }

    @Transactional
    public Reservation creerReservation(Long voyageId, Utilisateur utilisateur, int nbPlacesDemandees) {
        Voyage voyage = voyageRepository.findById(voyageId)
            .orElseThrow(() -> new RuntimeException("Voyage introuvable"));
        
        int placesOccupees = calculerPlacesOccupees(voyage);
        int placesRestantes = voyage.getNombrePlacesTotal() - placesOccupees;

        if (nbPlacesDemandees > placesRestantes) {
            throw new RuntimeException("Réservation impossible : Il ne reste que " + placesRestantes + " places.");
        }

        BigDecimal prixTotal = voyage.getPrixTotal().multiply(new BigDecimal(nbPlacesDemandees));
        List<String> siegesAttribues = trouverProchainesPlacesLibres(voyage, nbPlacesDemandees);

        Reservation res = new Reservation();
        res.setVoyage(voyage);
        res.setUtilisateur(utilisateur);
        res.setPrixPaye(prixTotal);
        res.setStatut("EN_ATTENTE");
        res.setDateConfirmation(null);

        List<Billet> billets = siegesAttribues.stream().map(siege -> {
            Billet b = new Billet();
            b.setSiege(siege);
            b.setReservation(res);
            return b;
        }).collect(Collectors.toList());
        
        res.setBillets(billets);

        if (placesOccupees + nbPlacesDemandees >= voyage.getNombrePlacesTotal()) {
            voyage.setStatut("COMPLET");
            voyageRepository.save(voyage);
        }

        return reservationRepository.save(res);
    }

    private List<String> trouverProchainesPlacesLibres(Voyage voyage, int nbPlacesDemandees) {
        Set<String> siegesPris = reservationRepository.findByVoyageId(voyage.getId()).stream()
                .filter(r -> r.getStatut() != null && !"ANNULE".equals(r.getStatut()))
                // 👉 CORRECTION : On vérifie que getBillets() n'est pas null avant de le parcourir
                .flatMap(r -> r.getBillets() != null ? r.getBillets().stream() : java.util.stream.Stream.empty())
                .map(Billet::getSiege)
                .collect(Collectors.toSet());

        List<String> planDeCabine = genererPlanDeCabine(voyage.getNombrePlacesTotal());
        List<String> selection = new ArrayList<>();

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

    private List<String> genererPlanDeCabine(int capacite) {
        List<String> sieges = new ArrayList<>();
        int nbColonnes = Math.max(6, (int) Math.ceil((double) capacite / 99.0));
        int siegeCrees = 0;
        int rangee = 1;
        
        while (siegeCrees < capacite) {
            for (int c = 0; c < nbColonnes && siegeCrees < capacite; c++) {
                sieges.add(rangee + String.valueOf(ALPHABET.charAt(c)));
                siegeCrees++;
            }
            rangee++;
        }
        return sieges;
    }

    private int calculerPlacesOccupees(Voyage v) {
        return reservationRepository.findByVoyageId(v.getId()).stream()
                .filter(r -> r.getStatut() != null && !"ANNULE".equals(r.getStatut()))
                // 👉 CORRECTION : On applique la même protection anti-null ici
                .mapToInt(r -> r.getBillets() != null ? r.getBillets().size() : 0)
                .sum();
    }

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

        String texteMail = "Bonjour,\n\n" +
                "Votre paiement a été validé. Votre réservation est CONFIRMÉE.\n" +
                "Vos places attribuées : " + placesStr + "\n" +
                "Montant total payé : " + r.getPrixPaye() + " €\n\n" +
                "👉 Vous trouverez en pièce jointe votre billet d'embarquement au format PDF.\n\n" +
                "Bon voyage !";
                
        envoyerMailAvecPDF(r, "Confirmation de votre réservation - Vol " + r.getVoyage().getVilleDepart(), texteMail);

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

        Voyage voyage = res.getVoyage();
        if ("COMPLET".equals(voyage.getStatut())) {
            voyage.setStatut("A_VENIR"); 
            voyageRepository.save(voyage);
        }

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
            String sujet = "🚫 Annulation de votre réservation #" + reservationSauvegardee.getId();
            String contenu = "Bonjour,\n\nVotre réservation a été ANNULÉE.\n" +
                             "Un remboursement total de " + reservationSauvegardee.getPrixPaye() + "€ a été déclenché vers votre banque.\n" +
                             "Vous trouverez le récapitulatif en pièce jointe.\nÀ bientôt.";
            envoyerMailAvecPDF(reservationSauvegardee, sujet, contenu);
        }

        return reservationSauvegardee;
    }

    @Transactional
    public Reservation echanger(Long oldResId, Long nouveauVoyageId) {
        Reservation oldRes = reservationRepository.findById(oldResId).orElseThrow();
        Voyage nouveauVoyage = voyageRepository.findById(nouveauVoyageId).orElseThrow();
        // PROTECTION : Évite le crash si la liste de billets n'est pas instanciée
        int nbPlaces = oldRes.getBillets() != null ? oldRes.getBillets().size() : 0;

        oldRes.setStatut("ANNULE");
        reservationRepository.save(oldRes);

        Reservation newRes = new Reservation();
        newRes.setUtilisateur(oldRes.getUtilisateur());
        newRes.setVoyage(nouveauVoyage);
        newRes.setPrixPaye(oldRes.getPrixPaye());
        newRes.setStatut("CONFIRME");
        newRes.setStripePaymentId(oldRes.getStripePaymentId());
        newRes.setDateConfirmation(LocalDateTime.now());
        newRes = reservationRepository.save(newRes);

        List<String> siegesLibres = trouverProchainesPlacesLibres(nouveauVoyage, nbPlaces);
        List<Billet> nouveauxBillets = new ArrayList<>();
        for (String siege : siegesLibres) {
            Billet b = new Billet();
            b.setSiege(siege);
            b.setReservation(newRes);
            nouveauxBillets.add(billetRepository.save(b));
        }
        newRes.setBillets(nouveauxBillets);

        String texteEchange = "Bonjour,\n\nSuite à un aléa, nous vous avons transféré sur un nouveau vol gratuitement.\n" + 
                              "Voici votre nouvelle carte d'embarquement en pièce jointe.";
        envoyerMailAvecPDF(newRes, "🔄 Échange de vol Confirmé", texteEchange);
        
        return newRes;
    }

    // =========================================================
    // 📩 LA MÉTHODE UNIVERSELLE POUR GÉNÉRER ET ENVOYER LE PDF
    // =========================================================
    private void envoyerMailAvecPDF(Reservation r, String sujet, String texteMail) {
        String placesStr = (r.getBillets() != null && !r.getBillets().isEmpty()) 
            ? r.getBillets().stream().map(Billet::getSiege).collect(Collectors.joining(", ")) 
            : "N/A";

        // 1. FABRICATION DU PDF EN MÉMOIRE
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            Document document = new Document();
            PdfWriter.getInstance(document, out);
            document.open();
            
            String titre = "ANNULE".equals(r.getStatut()) ? "BILLET ANNULÉ\n\n" : "CARTE D'EMBARQUEMENT\n\n";
            document.add(new Paragraph(titre));
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

        // 2. CRÉATION ET ENVOI DU MAIL AVEC LA PIÈCE JOINTE
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true); 
            
            helper.setTo(r.getUtilisateur().getEmail());
            helper.setSubject(sujet);
            helper.setText(texteMail);

            helper.addAttachment("Billet_" + r.getId() + ".pdf", new ByteArrayResource(out.toByteArray()));

            mailSender.send(message);
            System.out.println("✅ Mail avec pièce jointe PDF envoyé à " + r.getUtilisateur().getEmail() + " !");
        } catch (Exception e) {
            System.err.println("❌ Erreur d'envoi d'email avec PDF : " + e.getMessage());
        }
    }
}