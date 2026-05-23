import random
import time
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
from voyages.models import Utilisateur, Voyage, Segment, Avis, Reservation, Billet

class Command(BaseCommand):
    help = 'Génère des données fictives initiales ou incrémentales pour la base de données'

    def handle(self, *args, **kwargs):
        
        # 1. CRÉATION DE L'ADMIN EN CLAIR
        if not Utilisateur.objects.filter(email="admin@voyage.com").exists():
            Utilisateur.objects.create(
                email="admin@voyage.com",
                mot_de_passe="admin123",
                role="ROLE_ADMIN"
            )
            self.stdout.write(self.style.SUCCESS("👑 Compte Administrateur (admin@voyage.com) créé !"))
            
        # 👉 L'ASTUCE : On détermine si on fait le gros remplissage ou juste la mise à jour dynamique
        nb_utilisateurs_actuels = Utilisateur.objects.count()
        est_initial = nb_utilisateurs_actuels <= 1
        
        nb_users_a_creer = 300 if est_initial else 15
        nb_voyages_a_creer = 100 if est_initial else 10
        
        if est_initial:
            self.stdout.write('⏳ [MODE INITIAL] Génération massive des données (300 users, 100 voyages)...')
        else:
            self.stdout.write(f'🌱 [MODE DYNAMIQUE] Ajout de {nb_users_a_creer} users et {nb_voyages_a_creer} voyages pour simuler de la vie...')

        fake = Faker('fr_FR')

        # 2. CRÉATION DES NOUVEAUX UTILISATEURS
        nouveaux_utilisateurs = []
        for i in range(nb_users_a_creer):
            # Utilisation du temps pour garantir des emails 100% uniques à chaque redémarrage
            suffixe_unique = int(time.time() * 1000) + i
            u = Utilisateur.objects.create(
                email=f"client_{suffixe_unique}_{fake.email()}",
                mot_de_passe="password123",
                role="ROLE_USER"
            )
            nouveaux_utilisateurs.append(u)

        # On récupère TOUS les utilisateurs (anciens + nouveaux) pour que les anciens continuent d'acheter des billets !
        tous_les_utilisateurs = list(Utilisateur.objects.filter(role="ROLE_USER"))

        # 3. CRÉATION DES VOYAGES
        for _ in range(nb_voyages_a_creer):
            ville_depart = fake.city()
            ville_arrivee = fake.city()
            
            # Répartition probabiliste (50% à venir, 30% en cours, 15% terminé, 5% annulé)
            cible_statut = random.choices(
                ['A_VENIR', 'EN_COURS', 'TERMINE', 'ANNULE'], 
                weights=[50, 30, 15, 5]
            )[0]
            
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

            # --- REMPLISSAGE (RÉSERVATIONS, BILLETS, AVIS) ---
            doit_etre_complet = (random.random() < 0.1 and cible_statut != 'ANNULE') # 10% de chance d'être complet
            
            if doit_etre_complet:
                nb_places_a_creer = capacite_vehicule
            else:
                taux_remplissage = random.uniform(0.1, 0.8)
                nb_places_a_creer = int(capacite_vehicule * taux_remplissage)

            places_deja_assignees = 0

            while places_deja_assignees < nb_places_a_creer:
                # 👉 L'IA pioche au hasard dans TOUTE la base pour simuler de vieux clients qui reviennent !
                client_random = random.choice(tous_les_utilisateurs)
                
                nb_places_demande = random.randint(1, 5)
                if places_deja_assignees + nb_places_demande > nb_places_a_creer:
                    nb_places_demande = nb_places_a_creer - places_deja_assignees

                statut_res = random.choices(['CONFIRME', 'EN_ATTENTE', 'ANNULE'], weights=[70, 20, 10])[0]
                date_conf = timezone.now() - timedelta(days=random.randint(1, 20)) if statut_res == 'CONFIRME' else None

                res = Reservation.objects.create(
                    utilisateur=client_random,
                    voyage=v,
                    prix_paye=prix_billet_unitaire * nb_places_demande,
                    date_confirmation=date_conf,
                    statut=statut_res
                )

                for _ in range(nb_places_demande):
                    row = (places_deja_assignees // 6) + 1
                    col = "ABCDEF"[places_deja_assignees % 6]
                    Billet.objects.create(siege=f"{row}{col}", reservation=res)
                    places_deja_assignees += 1

                # Création d'avis
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

        self.stdout.write(self.style.SUCCESS(f'✨ Mise à jour terminée ! La BDD compte désormais {Utilisateur.objects.count()} utilisateurs et {Voyage.objects.count()} voyages.'))