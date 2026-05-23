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

        // 👉 L'ASTUCE : Mode Initial vs Mode Dynamique
        long nbUsersActuels = utilisateurRepository.count();
        boolean estInitial = nbUsersActuels <= 1;
        
        int nbUsersACreer = estInitial ? 300 : 15;
        int nbVoyagesACreer = estInitial ? 100 : 10;

        if (estInitial) {
            System.out.println("⏳ [MODE INITIAL] Génération massive (300 users, 100 voyages)...");
        } else {
            System.out.println("🌱 [MODE DYNAMIQUE] Ajout de " + nbUsersACreer + " users et " + nbVoyagesACreer + " voyages pour simuler de la vie...");
        }

        Faker faker = new Faker(new Locale("fr"));
        
        // 2. Création des nouveaux Utilisateurs
        for (int i = 0; i < nbUsersACreer; i++) {
            // Garantie d'unicité avec le timestamp
            String emailUnique = "client_" + System.currentTimeMillis() + "_" + i + "_" + faker.internet().emailAddress();
            Utilisateur u = Utilisateur.builder()
                    .email(emailUnique)
                    .motDePasse("password123")
                    .role("ROLE_USER")
                    .build();
            utilisateurService.creer(u);
        }

        // On récupère la base complète pour faire interagir anciens et nouveaux !
        List<Utilisateur> tousLesUtilisateurs = utilisateurRepository.findAll();

        // 3. Création des Voyages
        for (int i = 0; i < nbVoyagesACreer; i++) {
            String villeDepart = faker.address().cityName();
            String villeArrivee = faker.address().cityName();
            
            // Répartition probabiliste dynamique
            int randStatut = faker.number().numberBetween(0, 100);
            String cibleStatut;
            if (randStatut < 50) cibleStatut = "A_VENIR";
            else if (randStatut < 80) cibleStatut = "EN_COURS";
            else if (randStatut < 95) cibleStatut = "TERMINE";
            else cibleStatut = "ANNULE";
            
            int capaciteVehicule = faker.number().numberBetween(20, 600);
            BigDecimal prixBilletUnitaire = BigDecimal.valueOf(faker.number().randomDouble(2, 50, 800));

            Voyage v = Voyage.builder()
                    .villeDepart(villeDepart)
                    .villeArrivee(villeArrivee)
                    .prixTotal(prixBilletUnitaire)
                    .nombrePlacesTotal(capaciteVehicule) 
                    .statut(cibleStatut) 
                    .segments(new ArrayList<>())
                    .build();
                    
            Voyage voyageSauvegarde = voyageService.creer(v);
            if (voyageSauvegarde.getSegments() == null) voyageSauvegarde.setSegments(new ArrayList<>());

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
                        
                voyageSauvegarde.getSegments().add(s);
                segmentService.creer(s);

                villeDepartSegment = villeArriveeSegment;
                dateDepartPrecedente = dateArrivee.plusHours(faker.number().numberBetween(1, 5));
            }

            voyageSauvegarde = voyageRepository.save(voyageSauvegarde);

            // --- REMPLISSAGE INTELLIGENT ---
            boolean doitEtreComplet = (faker.number().numberBetween(0, 100) < 10 && !cibleStatut.equals("ANNULE"));
            int nbPlacesACreer;
            
            if (doitEtreComplet) {
                nbPlacesACreer = capaciteVehicule;
            } else {
                double tauxRemplissage = faker.number().numberBetween(10, 80) / 100.0;
                nbPlacesACreer = (int) (capaciteVehicule * tauxRemplissage);
            }

            int placesDejaAssignees = 0;

            while (placesDejaAssignees < nbPlacesACreer) {
                // L'IA pioche au hasard dans toute la base (anciens et nouveaux utilisateurs confondus)
                Utilisateur clientRandom = tousLesUtilisateurs.get(faker.number().numberBetween(0, tousLesUtilisateurs.size()));
                
                int nbPlacesDemande = faker.number().numberBetween(1, 6);
                if (placesDejaAssignees + nbPlacesDemande > nbPlacesACreer) {
                    nbPlacesDemande = nbPlacesACreer - placesDejaAssignees;
                }

                int randResa = faker.number().numberBetween(0, 10);
                String statutRes = (randResa < 7) ? "CONFIRME" : (randResa < 9) ? "EN_ATTENTE" : "ANNULE";
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

                // Avis aléatoires
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

        System.out.println("✨ Mise à jour terminée ! La BDD compte désormais " + utilisateurRepository.count() + " utilisateurs et " + voyageRepository.count() + " voyages.");
    }
}