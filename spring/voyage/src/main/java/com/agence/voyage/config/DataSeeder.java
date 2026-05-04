package com.agence.voyage.config;

import com.agence.voyage.entity.*;
import com.agence.voyage.service.*;
import com.agence.voyage.repository.ReservationRepository;
import com.github.javafaker.Faker;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UtilisateurService utilisateurService;
    private final VoyageService voyageService;
    private final SegmentService segmentService;
    private final AvisService avisService;
    private final ReservationRepository reservationRepository; 

    @Override
    public void run(String... args) {
        if (!utilisateurService.recupererTous().isEmpty()) {
            System.out.println("✅ Base de données déjà peuplée.");
            return;
        }

        System.out.println("⏳ Génération des fausses données en cours...");
        Faker faker = new Faker(new Locale("fr"));
        
        List<Utilisateur> utilisateurs = new ArrayList<>();
        List<Voyage> voyagesGeneres = new ArrayList<>();

        for (int i = 0; i < 10; i++) {
            Utilisateur u = Utilisateur.builder()
                    .email(faker.internet().emailAddress())
                    .motDePasse("password123")
                    .role("ROLE_USER")
                    .build();
            utilisateurs.add(utilisateurService.creer(u));
        }

        // 2. Création de 100 Voyages avec répartition intelligente
        for (int i = 0; i < 100; i++) {
            String villeDepart = faker.address().cityName();
            String villeArrivee = faker.address().cityName();
            
            // 👉 NOUVELLE RÉPARTITION (50 / 30 / 15 / 5)
            String cibleStatut;
            if (i < 50) {
                cibleStatut = "A_VENIR";
            } else if (i < 80) {
                cibleStatut = "EN_COURS";
            } else if (i < 95) {
                cibleStatut = "TERMINE";
            } else {
                cibleStatut = "ANNULE";
            }
            
            Voyage v = Voyage.builder()
                    .villeDepart(villeDepart)
                    .villeArrivee(villeArrivee)
                    .prixTotal(BigDecimal.valueOf(faker.number().randomDouble(2, 100, 1500)))
                    .statut(cibleStatut) 
                    .build();
            Voyage voyageSauvegarde = voyageService.creer(v);
            voyagesGeneres.add(voyageSauvegarde);

            int nbSegments = faker.number().numberBetween(1, 4);
            LocalDateTime dateDepartPrecedente;

            if (cibleStatut.equals("TERMINE")) {
                // Dans le passé, avec heure et minute aléatoires
                dateDepartPrecedente = LocalDateTime.now()
                        .minusDays(faker.number().numberBetween(5, 60))
                        .withHour(faker.number().numberBetween(0, 23))
                        .withMinute(faker.number().numberBetween(0, 59));
            } else if (cibleStatut.equals("EN_COURS")) {
                // Doit rester calculé en heures par rapport à l'instant présent
                dateDepartPrecedente = LocalDateTime.now().minusHours(faker.number().numberBetween(1, 5));
            } else {
                // A_VENIR ou ANNULE : Dans le futur, avec heure et minute aléatoires
                dateDepartPrecedente = LocalDateTime.now()
                        .plusDays(faker.number().numberBetween(1, 60))
                        .withHour(faker.number().numberBetween(0, 23))
                        .withMinute(faker.number().numberBetween(0, 59));
            }

            String villeDepartSegment = villeDepart;

            for (int j = 1; j <= nbSegments; j++) {
                String villeArriveeSegment = (j == nbSegments) ? villeArrivee : faker.address().cityName();
                LocalDateTime dateArrivee = dateDepartPrecedente.plusHours(faker.number().numberBetween(2, 12));

                Segment s = Segment.builder()
                        .voyage(voyageSauvegarde)
                        .ordre(j)
                        .villeDepart(villeDepartSegment)
                        .villeArrivee(villeArriveeSegment)
                        .heureDepart(dateDepartPrecedente)
                        .heureArrivee(dateArrivee)
                        .build();
                segmentService.creer(s);

                villeDepartSegment = villeArriveeSegment;
                dateDepartPrecedente = dateArrivee.plusHours(faker.number().numberBetween(1, 5));
            }

            int nbAvis = faker.number().numberBetween(0, 6);
            for (int k = 0; k < nbAvis; k++) {
                Utilisateur auteurRandom = utilisateurs.get(faker.number().numberBetween(0, utilisateurs.size()));
                Avis a = Avis.builder()
                        .voyage(voyageSauvegarde)
                        .utilisateur(auteurRandom)
                        .note(faker.number().numberBetween(1, 6))
                        .commentaire(faker.lorem().sentence(10))
                        .build();
                avisService.creer(a);
            }
        }

        for (int i = 0; i < 15; i++) {
            Voyage voyageRandom = voyagesGeneres.get(faker.number().numberBetween(0, voyagesGeneres.size()));
            Utilisateur utilisateurRandom = utilisateurs.get(faker.number().numberBetween(0, utilisateurs.size()));
            
            int choixStatut = faker.number().numberBetween(0, 3);
            String statut = (choixStatut == 0) ? "EN_ATTENTE" : (choixStatut == 1) ? "ANNULE" : "CONFIRME";
            
            LocalDateTime dateConf = statut.equals("CONFIRME") 
                ? LocalDateTime.now().minusDays(faker.number().numberBetween(1, 30)) 
                : null;

            Reservation r = Reservation.builder()
                    .utilisateur(utilisateurRandom)
                    .voyage(voyageRandom)
                    .prixPaye(voyageRandom.getPrixTotal())
                    .statut(statut)
                    .dateConfirmation(dateConf)
                    .build();
            
            reservationRepository.save(r);
        }

        System.out.println("🚀 Génération terminée avec succès !");
    }
}