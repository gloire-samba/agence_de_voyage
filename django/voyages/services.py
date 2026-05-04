import datetime
from django.utils import timezone
from django.db import transaction
from django.db.models import Avg, Count
from .models import Reservation, Utilisateur, Voyage, Segment, Avis
import requests

class UtilisateurService:
    @staticmethod
    def creer(data):
        return Utilisateur.objects.create(**data)

    @staticmethod
    def modifier(pk, data):
        Utilisateur.objects.filter(id=pk).update(**data)
        return Utilisateur.objects.get(id=pk)

    @staticmethod
    def supprimer(pk):
        Utilisateur.objects.filter(id=pk).delete()

class VoyageService:
    @staticmethod
    @transaction.atomic
    def mettre_a_jour_statuts_au_demarrage():
        try:
            voyages = Voyage.objects.prefetch_related('segments').exclude(statut='ANNULE')
            maintenant = timezone.now()

            for v in voyages:
                segments = v.segments.all()
                
                if not segments.exists():
                    v.statut = 'A_VENIR'
                else:
                    depart_reel = segments.first().heure_depart
                    arrivee_reelle = segments.last().heure_arrivee

                    if maintenant < depart_reel:
                        v.statut = 'A_VENIR'
                    elif maintenant > arrivee_reelle:
                        v.statut = 'TERMINE'
                    else:
                        v.statut = 'EN_COURS'
                
                v.save()
            print("✅ Mise à jour automatique des statuts des voyages terminée.")
        except Exception as e:
            pass

    @staticmethod
    def creer(data):
        return Voyage.objects.create(**data)

    @staticmethod
    def modifier(pk, data):
        Voyage.objects.filter(id=pk).update(**data)
        return Voyage.objects.get(id=pk)

    @staticmethod
    def supprimer(pk):
        Voyage.objects.filter(id=pk).delete()

class SegmentService:
    @staticmethod
    def creer(data):
        return Segment.objects.create(**data)

    @staticmethod
    def modifier(pk, data):
        Segment.objects.filter(id=pk).update(**data)
        return Segment.objects.get(id=pk)

    @staticmethod
    def supprimer(pk):
        Segment.objects.filter(id=pk).delete()

class AvisService:
    @staticmethod
    @transaction.atomic
    def creer(data):
        avis = Avis.objects.create(**data)
        AvisService.recalculer_moyenne(avis.voyage.id)
        return avis

    @staticmethod
    @transaction.atomic
    def modifier(pk, data):
        avis = Avis.objects.get(id=pk)
        for key, value in data.items():
            setattr(avis, key, value)
        avis.save()
        AvisService.recalculer_moyenne(avis.voyage.id)
        return avis

    @staticmethod
    @transaction.atomic
    def supprimer(pk):
        avis = Avis.objects.get(id=pk)
        voyage_id = avis.voyage.id
        avis.delete()
        AvisService.recalculer_moyenne(voyage_id)

    @staticmethod
    def recalculer_moyenne(voyage_id):
        voyage = Voyage.objects.get(id=voyage_id)
        stats = Avis.objects.filter(voyage=voyage).aggregate(Avg('note'))
        voyage.note_moyenne = stats['note__avg'] or 0
        voyage.save()
        
class ReservationService:
    @staticmethod
    def get_historique_utilisateur(utilisateur_id):
        return Reservation.objects.filter(utilisateur_id=utilisateur_id).order_by('-date_confirmation')

    @staticmethod
    def creer(data):
        data['statut'] = 'EN_ATTENTE'
        return Reservation.objects.create(**data)

    @staticmethod
    @transaction.atomic
    def confirmer_paiement(pk):
        reservation = Reservation.objects.get(id=pk)
        reservation.date_confirmation = timezone.now()
        reservation.statut = 'CONFIRME'
        reservation.save()
        print(f"📧 Mail de confirmation envoyé pour le voyage vers {reservation.voyage.ville_arrivee}")
        return reservation

    @staticmethod
    def supprimer(pk):
        Reservation.objects.filter(id=pk).delete()
        
    @staticmethod
    def annuler(pk):
        reservation = Reservation.objects.get(id=pk)
        reservation.statut = 'ANNULE'
        reservation.save()
        return reservation
        
class RechercheIntelligenteService:
    IA_API_URL = "http://127.0.0.1:8001/api/ia/analyser"

    @staticmethod
    def chercher_voyage(phrase_utilisateur):
        try:
            reponse = requests.post(
                RechercheIntelligenteService.IA_API_URL, 
                json={"texte": phrase_utilisateur}, 
                timeout=15.0
            )
            reponse.raise_for_status() 
            criteres = reponse.json()
            print(f"🤖 IA a compris : {criteres}")
            
        except requests.exceptions.HTTPError as e:
            if e.response.status_code in [429, 503]:
                message_ia = e.response.json().get('detail', "Erreur API IA")
                print(f"⚠️ Alerte remontée par l'IA : {message_ia}")
                from rest_framework.exceptions import Throttled
                raise Throttled(detail=message_ia)
            else:
                print(f"⚠️ Erreur HTTP {e.response.status_code}. Fallback activé !")
                return Voyage.objects.all()
                
        except requests.exceptions.RequestException as e:
            print(f"⚠️ L'IA est injoignable ou trop lente. Fallback activé !")
            return Voyage.objects.all()
        
        # 👉 CORRECTION 1 : Suppression de l'exception qui bloquait les dates passées

        resultats = Voyage.objects.annotate(nb_segments_total=Count('segments', distinct=True))

        # 👉 CORRECTION 2 : Filtrer le 1er segment
        resultats = resultats.filter(segments__ordre=1)
        
        # 👉 CORRECTION 3 : N'exiger un départ dans le futur QUE si aucun statut n'est précisé par l'IA
        if not criteres.get('statut'):
            resultats = resultats.filter(segments__heure_depart__gte=timezone.now())

        if criteres.get('ville_depart'):
            resultats = resultats.filter(ville_depart__icontains=criteres['ville_depart'])
            
        if criteres.get('ville_arrivee'):
            resultats = resultats.filter(ville_arrivee__icontains=criteres['ville_arrivee'])
            
        if criteres.get('prix_min') is not None:
            resultats = resultats.filter(prix_total__gte=criteres['prix_min'])
            
        if criteres.get('prix_max') is not None:
            resultats = resultats.filter(prix_total__lte=criteres['prix_max'])

        if criteres.get('date_debut'):
            resultats = resultats.filter(segments__ordre=1, segments__heure_depart__date__gte=criteres['date_debut'])
            
        if criteres.get('date_fin'):
            resultats = resultats.filter(segments__ordre=1, segments__heure_depart__date__lte=criteres['date_fin'])

        if criteres.get('escales_min') is not None:
            resultats = resultats.filter(nb_segments_total__gte=criteres['escales_min'] + 1)
        if criteres.get('escales_max') is not None:
            resultats = resultats.filter(nb_segments_total__lte=criteres['escales_max'] + 1)

        # 👉 CORRECTION 4 : Ajout du filtre par statut
        if criteres.get('statut'):
            resultats = resultats.filter(statut__iexact=criteres['statut'])

        return resultats.distinct()
    
    @staticmethod
    def transcrire_audio(fichier_audio):
        try:
            files = {'fichier': (fichier_audio.name, fichier_audio.read(), fichier_audio.content_type)}
            reponse = requests.post(
                "http://127.0.0.1:8001/api/ia/transcrire",
                files=files,
                timeout=15.0
            )
            reponse.raise_for_status()
            return reponse.json().get('texte', "")
        except requests.exceptions.HTTPError as e:
            if e.response.status_code in [429, 503]:
                raise Exception(e.response.json().get('detail', "Service IA saturé"))
            return ""
        except Exception as e:
            print(f"❌ Erreur transcription : {e}")
            return ""