from django.apps import AppConfig
import sys

class VoyagesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "voyages"

    def ready(self):
        # On vérifie qu'on est bien en train de lancer le serveur (runserver)
        # Cela évite que le script se lance quand on fait des makemigrations ou migrate
        if 'runserver' in sys.argv:
            # On importe le service À L'INTÉRIEUR de la méthode 
            # C'est obligatoire dans Django pour éviter les erreurs d'importations circulaires au démarrage
            from .services import VoyageService
            VoyageService.mettre_a_jour_statuts_au_demarrage()