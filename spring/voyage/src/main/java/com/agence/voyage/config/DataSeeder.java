package com.agence.voyage.config;

import com.agence.voyage.entity.*;
import com.agence.voyage.service.*;
import com.agence.voyage.repository.ReservationRepository;
import com.agence.voyage.repository.VoyageRepository;
import com.agence.voyage.repository.UtilisateurRepository;
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
    private final VoyageRepository voyageRepository; 
    private final UtilisateurRepository utilisateurRepository;  

    @Override
    public void run(String... args) {

        // 1. Création de l'admin
        if (utilisateurRepository.findByEmail("admin@voyage.com").isEmpty()) {
            Utilisateur admin = new Utilisateur();
            admin.setEmail("admin@voyage.com");
            admin.setMotDePasse("admin123");
            admin.setRole("ROLE_ADMIN");
            utilisateurRepository.save(admin);
            System.out.println("✅ Admin créé (admin@voyage.com / admin123)");
        }

        if (utilisateurRepository.count() > 1) {
            System.out.println("✅ Base de données déjà peuplée.");
            return;
        }

        System.out.println("⏳ Génération massive des fausses données en cours...");
        Faker faker = new Faker(new Locale("fr"));
        
        // 2. Création de 300 Utilisateurs (La foule !)
        List<Utilisateur> utilisateurs = new ArrayList<>();
        for (int i = 0; i < 300; i++) {
            String emailUnique = "client" + i + "_" + faker.internet().emailAddress();
            Utilisateur u = Utilisateur.builder()
                    .email(emailUnique)
                    .motDePasse("password123")
                    .role("ROLE_USER")
                    .build();
            utilisateurs.add(utilisateurService.creer(u));
        }

        // 3. Création de 100 Voyages
        for (int i = 0; i < 100; i++) {
            String villeDepart = faker.address().cityName();
            String villeArrivee = faker.address().cityName();
            
            // Répartition des statuts
            String cibleStatut = (i < 50) ? "A_VENIR" : (i < 80) ? "EN_COURS" : (i < 95) ? "TERMINE" : "ANNULE";
            
            int capaciteVehicule = faker.number().numberBetween(20, 600);
            BigDecimal prixBilletUnitaire = BigDecimal.valueOf(faker.number().randomDouble(2, 50, 800));

            Voyage v = Voyage.builder()
                    .villeDepart(villeDepart)
                    .villeArrivee(villeArrivee)
                    .prixTotal(prixBilletUnitaire)
                    .nombrePlacesTotal(capaciteVehicule) 
                    .statut(cibleStatut) 
                    // On s'assure d'initialiser la liste
                    .segments(new ArrayList<>())
                    .build();
                    
            Voyage voyageSauvegarde = voyageService.creer(v);
            
            // Sécurité supplémentaire au cas où le service l'aurait écrasée
            if (voyageSauvegarde.getSegments() == null) {
                voyageSauvegarde.setSegments(new ArrayList<>());
            }

            // --- Création des Segments ---
            int nbSegments = faker.number().numberBetween(1, 4);
            LocalDateTime dateDepartPrecedente;

            if (cibleStatut.equals("TERMINE")) {
                dateDepartPrecedente = LocalDateTime.now().minusDays(faker.number().numberBetween(5, 60));
            } else if (cibleStatut.equals("EN_COURS")) {
                dateDepartPrecedente = LocalDateTime.now().minusHours(faker.number().numberBetween(1, 5));
            } else {
                dateDepartPrecedente = LocalDateTime.now().plusDays(faker.number().numberBetween(1, 60));
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
                        
                // 👉 LA 1ère LIGNE CRITIQUE : on attache le segment à la liste du voyage en mémoire
                voyageSauvegarde.getSegments().add(s);
                
                segmentService.creer(s);

                villeDepartSegment = villeArriveeSegment;
                dateDepartPrecedente = dateArrivee.plusHours(faker.number().numberBetween(1, 5));
            }

            // 👉 LA 2ème LIGNE CRITIQUE : on valide et scelle la relation dans la base de données !
            voyageSauvegarde = voyageRepository.save(voyageSauvegarde);

            // --- REMPLISSAGE INTELLIGENT ---
            boolean doitEtreComplet = (i < 10 && !cibleStatut.equals("ANNULE"));
            int nbPlacesACreer;
            
            if (doitEtreComplet) {
                nbPlacesACreer = capaciteVehicule;
            } else {
                double tauxRemplissage = faker.number().numberBetween(10, 80) / 100.0;
                nbPlacesACreer = (int) (capaciteVehicule * tauxRemplissage);
            }

            int placesDejaAssignees = 0;

            while (placesDejaAssignees < nbPlacesACreer) {
                Utilisateur clientRandom = utilisateurs.get(faker.number().numberBetween(0, utilisateurs.size()));
                
                int nbPlacesDemande = faker.number().numberBetween(1, 6);
                
                if (placesDejaAssignees + nbPlacesDemande > nbPlacesACreer) {
                    nbPlacesDemande = nbPlacesACreer - placesDejaAssignees;
                }

                int randStatut = faker.number().numberBetween(0, 10);
                String statutRes = (randStatut < 7) ? "CONFIRME" : (randStatut < 9) ? "EN_ATTENTE" : "ANNULE";
                LocalDateTime dateConf = statutRes.equals("CONFIRME") ? LocalDateTime.now().minusDays(faker.number().numberBetween(1, 20)) : null;

                Reservation r = Reservation.builder()
                        .utilisateur(clientRandom)
                        .voyage(voyageSauvegarde)
                        .prixPaye(prixBilletUnitaire.multiply(new BigDecimal(nbPlacesDemande)))
                        .statut(statutRes)
                        .dateConfirmation(dateConf)
                        .build();

                List<Billet> billets = new ArrayList<>();
                for (int b = 0; b < nbPlacesDemande; b++) {
                    int row = (placesDejaAssignees / 6) + 1;
                    char col = "ABCDEF".charAt(placesDejaAssignees % 6);
                    
                    Billet billet = new Billet();
                    billet.setSiege(row + String.valueOf(col));
                    billet.setReservation(r);
                    billets.add(billet);
                    
                    placesDejaAssignees++;
                }
                r.setBillets(billets);
                reservationRepository.save(r); 

                // L'avis est créé peu importe le statut du voyage !
                if (statutRes.equals("CONFIRME") && faker.bool().bool()) {
                    Avis a = Avis.builder()
                            .voyage(voyageSauvegarde)
                            .utilisateur(clientRandom)
                            .note(faker.number().numberBetween(3, 6)) 
                            .commentaire(faker.lorem().sentence(12))
                            .build();
                    avisService.creer(a);
                }
            }

            if (placesDejaAssignees == capaciteVehicule) {
                voyageSauvegarde.setStatut("COMPLET");
                voyageRepository.save(voyageSauvegarde);
            }
        }

        System.out.println("🚀 Génération massive terminée avec succès !");
    }
}