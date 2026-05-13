import datetime
from django.utils import timezone
from django.db import transaction
from django.db.models import Avg, Count
from django.core.mail import EmailMessage, send_mail
from django.conf import settings
from .models import Billet, Reservation, Utilisateur, Voyage, Segment, Avis
import requests
import stripe
import os
import math
from django.db.models import Avg, Count, Q, Min, Max, F, ExpressionWrapper, DurationField
from io import BytesIO
from reportlab.pdfgen import canvas

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
    @transaction.atomic
    def creer(data):
        # 1. On extrait les segments du payload Angular
        segments_data = data.pop('segments', [])
        
        # 2. On crée le voyage avec les infos globales
        voyage = Voyage.objects.create(**data)
        
        # 3. On crée les segments liés à ce voyage
        for seg_data in segments_data:
            Segment.objects.create(voyage=voyage, **seg_data)
            
        return voyage

    @staticmethod
    @transaction.atomic
    def modifier(pk, data):
        voyage = Voyage.objects.get(id=pk)
        
        # 👉 On extrait les segments
        segments_data = data.pop('segments', None)
        
        # 👉 CORRECTION ICI : On retire les relations inverses envoyées par Angular
        data.pop('avis', None)
        data.pop('reservations', None)
        data.pop('id', None) # Par sécurité
        
        passage_en_annule = data.get('statut') == 'ANNULE' and voyage.statut != 'ANNULE'

        # Maintenant, la boucle ne plantera plus !
        for key, value in data.items():
            setattr(voyage, key, value)
        voyage.save()

        # 👉 GESTION DES NOUVEAUX SEGMENTS
        if segments_data is not None:
            # L'admin a modifié les segments. On efface les anciens et on recrée les nouveaux
            voyage.segments.all().delete()
            for seg_data in segments_data:
                # 👉 CORRECTION : on nettoie les clés en double avant la création
                seg_data.pop('id', None)
                seg_data.pop('voyage', None)
                seg_data.pop('voyage_id', None)
                
                Segment.objects.create(voyage=voyage, **seg_data)

        # 👉 AJOUT DES MESSAGES DE LOGS POUR LE REMBOURSEMENT DE MASSE
        if passage_en_annule:
            print(f"⚠️ Voyage #{pk} annulé par l'admin. Déclenchement du remboursement de masse...")
            reservations = Reservation.objects.filter(voyage_id=pk).exclude(statut='ANNULE')
            for res in reservations:
                try:
                    ReservationService.annuler(res.id)
                    print(f"✅ Client {res.utilisateur.email} remboursé.")
                except Exception as e:
                    print(f"❌ Échec remboursement pour la réservation #{res.id}: {e}")

        return voyage
    
    
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
    ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"

    @staticmethod
    def get_historique_utilisateur(utilisateur_id):
        return Reservation.objects.filter(utilisateur_id=utilisateur_id).order_by('-date_confirmation')

    @staticmethod
    @transaction.atomic
    def creer(voyage_id, utilisateur, nb_places_demandees):
        voyage = Voyage.objects.get(id=voyage_id)
        
        # 1. Vérification des places
        places_occupees = Billet.objects.filter(reservation__voyage=voyage).exclude(reservation__statut='ANNULE').count()
        places_restantes = voyage.nombre_places_total - places_occupees

        if nb_places_demandees > places_restantes:
            raise Exception(f"Réservation impossible : Il ne reste que {places_restantes} places.")

        # 2. Prix et attribution
        prix_total = voyage.prix_total * nb_places_demandees
        sieges_attribues = ReservationService.trouver_prochaines_places_libres(voyage, nb_places_demandees)

        # 3. Création
        res = Reservation.objects.create(
            voyage=voyage,
            utilisateur=utilisateur,
            prix_paye=prix_total,
            statut='EN_ATTENTE'
        )

        for siege in sieges_attribues:
            Billet.objects.create(siege=siege, reservation=res)

        if places_occupees + nb_places_demandees >= voyage.nombre_places_total:
            voyage.statut = 'COMPLET'
            voyage.save()

        return res

    @staticmethod
    def trouver_prochaines_places_libres(voyage, nb_places_demandees):
        sieges_pris = set(Billet.objects.filter(reservation__voyage=voyage).exclude(reservation__statut='ANNULE').values_list('siege', flat=True))
        plan_cabine = ReservationService.generer_plan_de_cabine(voyage.nombre_places_total)

        selection = []
        for siege in plan_cabine:
            if siege not in sieges_pris:
                selection.append(siege)
                if len(selection) == nb_places_demandees:
                    return selection
        raise Exception("Erreur critique : Impossible de trouver assez de sièges libres.")

    @staticmethod
    def generer_plan_de_cabine(capacite):
        sieges = []
        nb_colonnes = max(6, math.ceil(capacite / 99.0))
        siege_crees = 0
        rangee = 1
        
        while siege_crees < capacite:
            for c in range(nb_colonnes):
                if siege_crees >= capacite:
                    break
                sieges.append(f"{rangee}{ReservationService.ALPHABET[c]}")
                siege_crees += 1
            rangee += 1
        return sieges

    @staticmethod
    @transaction.atomic
    def confirmer_paiement(pk, stripe_payment_id):
        reservation = Reservation.objects.get(id=pk)
        reservation.statut = 'CONFIRME'
        reservation.stripe_payment_id = stripe_payment_id
        reservation.date_confirmation = timezone.now()
        reservation.save()

        # On récupère les sièges sous forme de texte ("1A, 1B")
        places = ", ".join([b.siege for b in reservation.billets.all()])

        # 👉 1. GÉNÉRATION DU PDF EN MÉMOIRE (Sans le sauvegarder sur le disque)
        buffer = BytesIO()
        p = canvas.Canvas(buffer)
        
        # Design basique du billet
        p.setFont("Helvetica-Bold", 18)
        p.drawString(180, 800, "CARTE D'EMBARQUEMENT")
        p.setFont("Helvetica", 12)
        p.drawString(100, 750, f"N° de Commande : #{reservation.id}")
        p.drawString(100, 730, f"Passager : {reservation.utilisateur.email}")
        p.drawString(100, 710, f"Trajet : {reservation.voyage.ville_depart} ➔ {reservation.voyage.ville_arrivee}")
        p.drawString(100, 690, f"Siège(s) assigné(s) : {places}")
        p.drawString(100, 670, f"Montant réglé : {reservation.prix_paye} EUR")
        p.drawString(100, 600, "Merci de voyager avec nous. Bon voyage !")
        
        p.showPage()
        p.save()
        pdf_bytes = buffer.getvalue() # On récupère le fichier brut
        buffer.close()

        # 👉 2. CRÉATION DU MAIL AVEC PIÈCE JOINTE
        sujet = f"Confirmation de votre réservation - Vol {reservation.voyage.ville_depart} ➔ {reservation.voyage.ville_arrivee}"
        texte_mail = (
            f"Bonjour,\n\n"
            f"Votre paiement a été validé. Votre réservation est CONFIRMÉE.\n"
            f"Vos places attribuées : {places}\n"
            f"Montant total payé : {reservation.prix_paye} €\n\n"
            f"👉 Vous trouverez en pièce jointe votre billet d'embarquement au format PDF.\n\n"
            f"Bon voyage !"
        )

        try:
            # On utilise EmailMessage (plus puissant que send_mail) pour attacher un fichier
            email = EmailMessage(
                sujet,
                texte_mail,
                settings.EMAIL_HOST_USER,
                [reservation.utilisateur.email]
            )
            email.attach(f'Billet_Voyage_{reservation.id}.pdf', pdf_bytes, 'application/pdf')
            email.send(fail_silently=True)
            print("✅ Mail avec PDF envoyé avec succès.")
        except Exception as e:
            print(f"❌ Erreur d'envoi du mail : {e}")

        return reservation
    
    @staticmethod
    def supprimer(pk):
        Reservation.objects.filter(id=pk).delete()
        
    @staticmethod
    @transaction.atomic
    def annuler(pk):
        reservation = Reservation.objects.get(id=pk)
        reservation.statut = 'ANNULE'
        
        voyage = reservation.voyage
        if voyage.statut == 'COMPLET':
            voyage.statut = 'A_VENIR'
            voyage.save()

        if reservation.stripe_payment_id:
            try:
                stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
                remboursement = stripe.Refund.create(payment_intent=reservation.stripe_payment_id)
            except Exception as e:
                pass

        reservation.save()

        if reservation.utilisateur and reservation.utilisateur.email:
            sujet = f"🚫 Annulation de votre réservation #{reservation.id}"
            contenu = f"Bonjour,\n\nVotre réservation a été ANNULÉE.\nUn remboursement total de {reservation.prix_paye}€ a été déclenché vers votre banque.\nÀ bientôt."
            try:
                send_mail(sujet, contenu, settings.EMAIL_HOST_USER, [reservation.utilisateur.email], fail_silently=False)
            except Exception as e:
                pass

        return reservation
    
            
class RechercheIntelligenteService:
    IA_API_URL = "http://127.0.0.1:8001/api/ia/analyser"

    @staticmethod
    def chercher_voyage(texte):
        try:
            # 1. On interroge l'IA (qui va extraire duree_max_minutes)
            reponse = requests.post(
                "http://127.0.0.1:8001/api/ia/analyser",
                json={"texte": texte},
                timeout=10.0
            )
            reponse.raise_for_status()
            criteres = reponse.json()
        except Exception as e:
            print(f"❌ Erreur IA : {e}")
            return Voyage.objects.none()

        # 👉 2. PRÉPARATION DE LA REQUÊTE AVEC CALCUL DES DATES
        # On calcule le tout premier départ et la toute dernière arrivée de l'itinéraire
        resultats = Voyage.objects.annotate(
            depart_initial=Min('segments__heure_depart'),
            arrivee_finale=Max('segments__heure_arrivee')
        )

        # 3. Application des filtres classiques
        if criteres.get('ville_depart'):
            resultats = resultats.filter(ville_depart__icontains=criteres['ville_depart'])
        if criteres.get('ville_arrivee'):
            resultats = resultats.filter(ville_arrivee__icontains=criteres['ville_arrivee'])
        if criteres.get('prix_min') is not None:
            resultats = resultats.filter(prix_total__gte=criteres['prix_min'])
        if criteres.get('prix_max') is not None:
            resultats = resultats.filter(prix_total__lte=criteres['prix_max'])
        if criteres.get('statut'):
            resultats = resultats.filter(statut=criteres['statut'])
            
        # Filtres sur les dates
        if criteres.get('date_debut'):
            resultats = resultats.filter(depart_initial__date__gte=criteres['date_debut'])
        if criteres.get('date_fin'):
            resultats = resultats.filter(depart_initial__date__lte=criteres['date_fin'])

        # Filtres sur les escales
        if criteres.get('escales_min') is not None or criteres.get('escales_max') is not None:
            resultats = resultats.annotate(nb_segments=Count('segments'))
            if criteres.get('escales_min') is not None:
                # 1 escale = 2 segments
                resultats = resultats.filter(nb_segments__gte=criteres['escales_min'] + 1)
            if criteres.get('escales_max') is not None:
                resultats = resultats.filter(nb_segments__lte=criteres['escales_max'] + 1)

        # Filtres sur les places
        if criteres.get('places_total') is not None:
            resultats = resultats.filter(nombre_places_total=criteres['places_total'])
            
        if criteres.get('places_restantes_min') is not None:
            # Soustraction : Capacité totale - billets vendus
            resultats = resultats.annotate(
                places_occupees=Count('reservations__billets', filter=~Q(reservations__statut='ANNULE'))
            ).annotate(
                places_restantes=F('nombre_places_total') - F('places_occupees')
            ).filter(places_restantes__gte=criteres['places_restantes_min'])

        # ==========================================
        # 👉 NOUVEAU : LE FILTRE SUR LA DURÉE MAXIMALE
        # ==========================================
        duree_max = criteres.get('duree_max_minutes')
        if duree_max is not None:
            # On convertit le nombre de l'IA en véritable objet "Durée" pour Python
            max_timedelta = datetime.timedelta(minutes=duree_max)
            
            # On demande à la base de données de faire la soustraction (Arrivée - Départ)
            resultats = resultats.annotate(
                duree_totale=ExpressionWrapper(
                    F('arrivee_finale') - F('depart_initial'), 
                    output_field=DurationField()
                )
            ).filter(duree_totale__lte=max_timedelta)

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
        
class BilletService:
    @staticmethod
    def lister_tous():
        return Billet.objects.all()

    @staticmethod
    def lister_par_utilisateur(utilisateur_id):
        # On remonte la chaîne : Billet -> Reservation -> Utilisateur
        return Billet.objects.filter(reservation__utilisateur_id=utilisateur_id)

    @staticmethod
    def modifier(pk, data):
        billet = Billet.objects.get(id=pk)
        if 'siege' in data:
            billet.siege = data['siege']
            billet.save()
        return billet

    @staticmethod
    def supprimer(pk):
        Billet.objects.filter(id=pk).delete()