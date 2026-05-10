import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
from voyages.models import Utilisateur, Voyage, Segment, Avis, Reservation, Billet
from voyages.services import AvisService

class Command(BaseCommand):
    help = 'Génère des données fictives massives pour la base de données'

    def handle(self, *args, **kwargs):
        
        # 1. CRÉATION DE L'ADMIN EN CLAIR
        if not Utilisateur.objects.filter(email="admin@voyage.com").exists():
            Utilisateur.objects.create(
                email="admin@voyage.com",
                mot_de_passe="admin123",
                role="ROLE_ADMIN"
            )
            self.stdout.write(self.style.SUCCESS("👑 Compte Administrateur (admin@voyage.com) créé !"))
            
        if Utilisateur.objects.count() > 1:
            self.stdout.write(self.style.WARNING('✅ Base de données déjà peuplée.'))
            return

        self.stdout.write('⏳ Génération massive des données en cours...')
        fake = Faker('fr_FR')

        # 2. CRÉATION DE LA FOULE (300 Utilisateurs)
        utilisateurs = []
        # 👉 CORRECTION : Ajout du "i" pour rendre la génération instantanée !
        for i in range(300):
            u = Utilisateur.objects.create(
                email=f"client{i}_{fake.email()}",
                mot_de_passe="password123",
                role="ROLE_USER"
            )
            utilisateurs.append(u)

        # 3. CRÉATION DES VOYAGES
        for i in range(100):
            ville_depart = fake.city()
            ville_arrivee = fake.city()
            
            if i < 50:
                cible_statut = 'A_VENIR'
            elif i < 80:
                cible_statut = 'EN_COURS'
            elif i < 95:
                cible_statut = 'TERMINE'
            else:
                cible_statut = 'ANNULE'
            
            capacite_vehicule = random.randint(20, 600)
            prix_billet_unitaire = round(random.uniform(50.0, 800.0), 2)

            v = Voyage.objects.create(
                ville_depart=ville_depart,
                ville_arrivee=ville_arrivee,
                prix_total=prix_billet_unitaire,
                nombre_places_total=capacite_vehicule,
                statut=cible_statut 
            )

            # --- Création des Segments ---
            nb_segments = random.randint(1, 3)
            
            if cible_statut == 'TERMINE':
                date_depart = timezone.now() - timedelta(days=random.randint(5, 60))
                date_depart = date_depart.replace(hour=random.randint(0, 23), minute=random.randint(0, 59))
            elif cible_statut == 'EN_COURS':
                date_depart = timezone.now() - timedelta(hours=random.randint(1, 5))
            else:
                date_depart = timezone.now() + timedelta(days=random.randint(1, 60))
                date_depart = date_depart.replace(hour=random.randint(0, 23), minute=random.randint(0, 59))

            ville_dep_segment = ville_depart

            for j in range(1, nb_segments + 1):
                ville_arr_segment = ville_arrivee if j == nb_segments else fake.city()
                date_arrivee = date_depart + timedelta(hours=random.randint(2, 12))

                Segment.objects.create(
                    voyage=v,
                    ordre=j,
                    ville_depart=ville_dep_segment,
                    ville_arrivee=ville_arr_segment,
                    heure_depart=date_depart,
                    heure_arrivee=date_arrivee
                )

                ville_dep_segment = ville_arr_segment
                date_depart = date_arrivee + timedelta(hours=random.randint(1, 5)) 

            # --- REMPLISSAGE INTELLIGENT ---
            doit_etre_complet = (i < 10 and cible_statut != 'ANNULE')
            
            if doit_etre_complet:
                nb_places_a_creer = capacite_vehicule
            else:
                taux_remplissage = random.uniform(0.1, 0.8)
                nb_places_a_creer = int(capacite_vehicule * taux_remplissage)

            places_deja_assignees = 0

            while places_deja_assignees < nb_places_a_creer:
                client_random = random.choice(utilisateurs)
                
                nb_places_demande = random.randint(1, 5)
                
                if places_deja_assignees + nb_places_demande > nb_places_a_creer:
                    nb_places_demande = nb_places_a_creer - places_deja_assignees

                statut_res = random.choices(['CONFIRME', 'EN_ATTENTE', 'ANNULE'], weights=[70, 20, 10])[0]
                date_conf = timezone.now() - timedelta(days=random.randint(1, 20)) if statut_res == 'CONFIRME' else None

                # 1. Création de la réservation
                res = Reservation.objects.create(
                    utilisateur=client_random,
                    voyage=v,
                    prix_paye=prix_billet_unitaire * nb_places_demande,
                    date_confirmation=date_conf,
                    statut=statut_res
                )

                # 2. Création et assignation des billets
                for _ in range(nb_places_demande):
                    row = (places_deja_assignees // 6) + 1
                    col = "ABCDEF"[places_deja_assignees % 6]
                    
                    Billet.objects.create(
                        siege=f"{row}{col}",
                        reservation=res
                    )
                    places_deja_assignees += 1

                # 👉 CORRECTION : L'avis est créé peu importe le statut du voyage !
                if statut_res == 'CONFIRME' and random.choice([True, False]):
                    Avis.objects.create(
                        voyage=v,
                        utilisateur=client_random,
                        note=random.randint(3, 5),
                        commentaire=fake.text(max_nb_chars=100)
                    )

            if places_deja_assignees == capacite_vehicule:
                v.statut = 'COMPLET'
                v.save()

        self.stdout.write(self.style.SUCCESS('🚀 Génération massive terminée avec succès !'))