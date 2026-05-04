from rest_framework import viewsets, status
from .models import Reservation, Utilisateur, Voyage, Segment, Avis
from .serializers import ReservationSerializer, UtilisateurSerializer, VoyageSerializer, SegmentSerializer, AvisSerializer
from .services import AvisService, RechercheIntelligenteService, ReservationService, UtilisateurService, VoyageService, SegmentService
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.decorators import action
import stripe
import os
from dotenv import load_dotenv
import stripe

# Charge le fichier .env
load_dotenv()


class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all().order_by('id')
    serializer_class = UtilisateurSerializer

class VoyageViewSet(viewsets.ModelViewSet):
    queryset = Voyage.objects.all().order_by('id')
    serializer_class = VoyageSerializer

class SegmentViewSet(viewsets.ModelViewSet):
    queryset = Segment.objects.all().order_by('id')
    serializer_class = SegmentSerializer

class AvisViewSet(viewsets.ModelViewSet):
    queryset = Avis.objects.all().order_by('id')
    serializer_class = AvisSerializer

    def perform_create(self, serializer):
        # On utilise le service pour gérer la logique métier (calcul de moyenne)
        AvisService.creer(serializer.validated_data)

    def perform_update(self, serializer):
        # On utilise le service pour la mise à jour
        AvisService.modifier(self.get_object().id, serializer.validated_data)

    def perform_destroy(self, instance):
        # On utilise le service pour la suppression et le recalcul
        AvisService.supprimer(instance.id)
        
@api_view(['POST'])
def recherche_intelligente(request):
    texte = request.data.get('texte', '')
    voyages = RechercheIntelligenteService.chercher_voyage(texte)
    serializer = VoyageSerializer(voyages, many=True)
    return Response(serializer.data)

@api_view(['POST'])
def recherche_intelligente(request):
    texte = request.data.get('texte', '')
    voyages = RechercheIntelligenteService.chercher_voyage(texte)
    return Response(VoyageSerializer(voyages, many=True).data)

@api_view(['POST'])
def recherche_vocale(request):
    try:
        audio_file = request.FILES.get('audio')
        if not audio_file:
            return Response({"error": "Aucun fichier audio reçu"}, status=400)
        
        texte_transcrit = RechercheIntelligenteService.transcrire_audio(audio_file)
        voyages = RechercheIntelligenteService.chercher_voyage(texte_transcrit)
        
        return Response({
            "texte_reconnu": texte_transcrit,
            "resultats": VoyageSerializer(voyages, many=True).data
        })
    except Exception as e:
        # On renvoie l'erreur proprement au client (Angular/Postman) avec un code 503
        return Response({"erreur": str(e)}, status=503)
    
class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer

    # Surcharge de la méthode POST de base (Création)
    def create(self, request, *args, **kwargs):
        reservation = ReservationService.creer(request.data)
        return Response(ReservationSerializer(reservation).data, status=status.HTTP_201_CREATED)

    # Surcharge de la méthode DELETE de base
    def destroy(self, request, *args, **kwargs):
        ReservationService.supprimer(kwargs.get('pk'))
        return Response(status=status.HTTP_204_NO_CONTENT)

    # Route Personnalisée 1 : GET /api/reservations/utilisateur/{id}/
    @action(detail=False, methods=['get'], url_path=r'utilisateur/(?P<utilisateur_id>\d+)')
    def historique_utilisateur(self, request, utilisateur_id=None):
        reservations = ReservationService.get_historique_utilisateur(utilisateur_id)
        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)

    # Route Personnalisée 2 : POST /api/reservations/{id}/confirmer/
    @action(detail=True, methods=['post'])
    def confirmer(self, request, pk=None):
        try:
            reservation = ReservationService.confirmer_paiement(pk)
            return Response(self.get_serializer(reservation).data)
        except Reservation.DoesNotExist:
            return Response({"erreur": "Réservation introuvable"}, status=status.HTTP_404_NOT_FOUND)
        
    # NOUVELLE ROUTE : POST /api/reservations/{id}/annuler/
    @action(detail=True, methods=['post'])
    def annuler(self, request, pk=None):
        try:
            reservation = ReservationService.annuler(pk)
            return Response(self.get_serializer(reservation).data)
        except Reservation.DoesNotExist:
            return Response({"erreur": "Réservation introuvable"}, status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
def avis_vocal(request):
    audio_file = request.FILES.get('audio')
    voyage_id = request.data.get('voyage_id')
    utilisateur_id = request.data.get('utilisateur_id')
    note = request.data.get('note', 5)

    if not audio_file:
        return Response({"error": "Audio manquant"}, status=400)

    # 1. Transcription
    texte_avis = RechercheIntelligenteService.transcrire_audio(audio_file)
    
    # 2. Création de l'avis en base
    avis_data = {
        "voyage": voyage_id,
        "utilisateur": utilisateur_id,
        "note": note,
        "commentaire": texte_avis
    }
    AvisService.creer(avis_data)
    
    return Response({"message": "Avis vocal enregistré !", "texte": texte_avis})

# Ta CLÉ SECRÈTE Stripe (Ne la donne jamais au front-end !)
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

@api_view(['POST'])
def create_payment_intent(request):
    try:
        # 1. On récupère le prix envoyé par Angular
        prix_total = float(request.data.get('prixTotal', 0))
        
        # 2. PIÈGE CLASSIQUE : Stripe travaille TOUJOURS en centimes ! (50€ = 5000 centimes)
        montant_centimes = int(prix_total * 100)

        # 3. On demande le "ticket" à Stripe
        intent = stripe.PaymentIntent.create(
            amount=montant_centimes,
            currency='eur',
            automatic_payment_methods={'enabled': True},
        )
        
        # 4. On renvoie le ticket secret à Angular
        return Response({'clientSecret': intent.client_secret})
    
    except Exception as e:
        return Response({'error': str(e)}, status=403)