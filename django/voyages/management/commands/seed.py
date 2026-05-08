import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
from voyages.models import Utilisateur, Voyage, Segment, Avis, Reservation
from voyages.services import AvisService

class Command(BaseCommand):
    help = 'Génère des données fictives pour la base de données'

    def handle(self, *args, **kwargs):
        
        # 1. CRÉATION DE L'ADMIN EN CLAIR
        if not Utilisateur.objects.filter(email="admin@voyage.com").exists():
            Utilisateur.objects.create(
                email="admin@voyage.com",
                mot_de_passe="admin123",
                role="ROLE_ADMIN"
            )
            self.stdout.write(self.style.SUCCESS("👑 Compte Administrateur (admin@voyage.com) créé !"))
            
        # On s'arrête seulement s'il y a plus que juste l'admin
        if Utilisateur.objects.count() > 1:
            self.stdout.write(self.style.WARNING('✅ Base de données déjà peuplée.'))
            return

        self.stdout.write('⏳ Génération des fausses données en cours...')
        fake = Faker('fr_FR')

        utilisateurs = []
        for _ in range(10):
            u = Utilisateur.objects.create(
                email=fake.unique.email(),
                mot_de_passe="password123",
                role="ROLE_USER"
            )
            utilisateurs.append(u)

        voyages_generes = []

        # 👉 NOUVELLE RÉPARTITION (100 voyages)
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
            
            v = Voyage.objects.create(
                ville_depart=ville_depart,
                ville_arrivee=ville_arrivee,
                prix_total=round(random.uniform(100.0, 1500.0), 2),
                statut=cible_statut 
            )
            voyages_generes.append(v)

            nb_segments = random.randint(1, 3)
            
            if cible_statut == 'TERMINE':
                # Dans le passé, on écrase l'heure et la minute avec des valeurs aléatoires
                date_depart = timezone.now() - timedelta(days=random.randint(5, 60))
                date_depart = date_depart.replace(hour=random.randint(0, 23), minute=random.randint(0, 59))
            elif cible_statut == 'EN_COURS':
                # Doit rester calculé en heures par rapport à l'instant présent
                date_depart = timezone.now() - timedelta(hours=random.randint(1, 5))
            else:
                # A_VENIR ou ANNULE : Dans le futur, on écrase l'heure et la minute
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

            nb_avis = random.randint(0, 5)
            for _ in range(nb_avis):
                auteur = random.choice(utilisateurs)
                AvisService.creer({
                    'voyage': v,
                    'utilisateur': auteur,
                    'note': random.randint(1, 5),
                    'commentaire': fake.text(max_nb_chars=100)
                })

        for _ in range(15):
            voyage_random = random.choice(voyages_generes)
            utilisateur_random = random.choice(utilisateurs)
            
            statut = random.choice(['CONFIRME', 'CONFIRME', 'EN_ATTENTE', 'ANNULE'])
            date_conf = timezone.now() - timedelta(days=random.randint(1, 30)) if statut == 'CONFIRME' else None
            
            Reservation.objects.create(
                utilisateur=utilisateur_random,
                voyage=voyage_random,
                prix_paye=voyage_random.prix_total,
                date_confirmation=date_conf,
                statut=statut
            )

        self.stdout.write(self.style.SUCCESS('🚀 Génération terminée avec succès !'))