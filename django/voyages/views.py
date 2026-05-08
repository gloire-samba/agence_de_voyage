from rest_framework import viewsets, status
from .models import Reservation, Utilisateur, Voyage, Segment, Avis
from .serializers import ReservationSerializer, UtilisateurSerializer, VoyageSerializer, SegmentSerializer, AvisSerializer
from .services import AvisService, RechercheIntelligenteService, ReservationService, UtilisateurService, VoyageService, SegmentService
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.decorators import action
import stripe
import os
from dotenv import load_dotenv
import stripe
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from .security import EstProprietaireProfilOuAdmin, JwtService, IsAdminRole, EstAuteurAvisOuAdmin
import requests
from django.shortcuts import redirect
import uuid
import urllib.parse

# Charge le fichier .env
load_dotenv()


class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateur.objects.all().order_by('id')
    serializer_class = UtilisateurSerializer
    
    
    def get_permissions(self):
        return [EstProprietaireProfilOuAdmin()] # ✅ On applique la nouvelle règle

class VoyageViewSet(viewsets.ModelViewSet):
    queryset = Voyage.objects.all().order_by('id')
    serializer_class = VoyageSerializer

class SegmentViewSet(viewsets.ModelViewSet):
    queryset = Segment.objects.all().order_by('id')
    serializer_class = SegmentSerializer
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminRole()] # Seul l'admin peut modifier !

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
        
    # 👉 1. On applique la règle
    def get_permissions(self):
        return [EstAuteurAvisOuAdmin()]
    
    # 👉 ON INTERCEPTE LA CRÉATION POUR TRADUIRE LA REQUÊTE D'ANGULAR
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        # 1. Si Angular envoie 'reservationId', on trouve le voyage correspondant
        if 'reservationId' in data:
            try:
                res = Reservation.objects.get(id=data['reservationId'])
                data['voyage'] = res.voyage.id
            except Reservation.DoesNotExist:
                return Response({"error": "Réservation introuvable"}, status=status.HTTP_404_NOT_FOUND)
        
        # 2. On injecte l'ID de l'utilisateur connecté pour satisfaire le Serializer
        data['utilisateur'] = request.user.id
        
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            AvisService.creer(serializer.validated_data)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # 👉 2. On force l'utilisateur connecté comme auteur de l'avis
    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)
        
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
        
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        if self.request.method == 'POST':
            return [IsAuthenticated()] # 👉 Autorise les joueurs connectés à réserver
        return [IsAdminRole()] # 👉 L'admin garde le monopole pour modifier/supprimer

@api_view(['POST'])
@permission_classes([IsAuthenticated]) # 👉 On force la sécurité
def avis_vocal(request):
    audio_file = request.FILES.get('audio')
    reservation_id = request.data.get('reservationId') # 👉 On récupère la réservation d'Angular !
    note = request.data.get('note', 5)

    if not audio_file:
        return Response({"error": "Audio manquant"}, status=400)

    try:
        # On devine le voyage grâce à la réservation
        res = Reservation.objects.get(id=reservation_id)
        voyage_id = res.voyage.id
    except Reservation.DoesNotExist:
        return Response({"error": "Réservation introuvable"}, status=404)

    # 1. Transcription IA
    texte_avis = RechercheIntelligenteService.transcrire_audio(audio_file)
    
    # 2. Création de l'avis avec l'utilisateur connecté (sécurisé)
    avis_data = {
        "voyage": voyage_id,
        "utilisateur": request.user.id,
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
    
    
class AuthAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email')
        mot_de_passe = request.data.get('motDePasse') # Ou 'password', gère les deux si tu veux

        try:
            user = Utilisateur.objects.get(email=email)
            # Comparaison "brute" comme dans l'ancien projet
            if user.mot_de_passe == mot_de_passe:
                token = JwtService.generer_token(user)
                return Response({
                    "token": token,
                    "role": user.role,
                    "email": user.email,
                    "utilisateurId": str(user.id)
                }, status=status.HTTP_200_OK)
            return Response({"error": "Mot de passe incorrect"}, status=status.HTTP_401_UNAUTHORIZED)
        except Utilisateur.DoesNotExist:
            return Response({"error": "Utilisateur introuvable"}, status=status.HTTP_404_NOT_FOUND)

class RegisterAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email')
        mot_de_passe = request.data.get('motDePasse')

        if Utilisateur.objects.filter(email=email).exists():
            return Response({"error": "Cet email est déjà utilisé."}, status=status.HTTP_400_BAD_REQUEST)

        Utilisateur.objects.create(
            email=email,
            mot_de_passe=mot_de_passe,
            role="ROLE_USER"
        )
        return Response({"message": "Inscription réussie !"}, status=status.HTTP_201_CREATED)
    
    # ==========================================
# 🌐 GOOGLE OAUTH2 MANUEL
# ==========================================
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        client_id = os.getenv('GOOGLE_CLIENT_ID')
        # L'URL exacte enregistrée dans ta console Google
        redirect_uri = "http://localhost:8000/accounts/google/login/callback/"
        scope = "email profile"
        url = f"https://accounts.google.com/o/oauth2/v2/auth?client_id={client_id}&redirect_uri={redirect_uri}&response_type=code&scope={scope}"
        return redirect(url)

class GoogleCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        code = request.GET.get('code')
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            'code': code,
            'client_id': os.getenv('GOOGLE_CLIENT_ID'),
            'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
            'redirect_uri': "http://localhost:8000/accounts/google/login/callback/",
            'grant_type': 'authorization_code'
        }
        res = requests.post(token_url, data=data)
        access_token = res.json().get('access_token')

        # Récupération de l'email
        user_res = requests.get("https://www.googleapis.com/oauth2/v2/userinfo", headers={"Authorization": f"Bearer {access_token}"})
        email = user_res.json().get('email')

        # Création ou connexion
        user, created = Utilisateur.objects.get_or_create(
            email=email,
            defaults={'mot_de_passe': str(uuid.uuid4()), 'role': 'ROLE_USER'}
        )
        
        # Redirection vers Angular
        token = JwtService.generer_token(user)
        redirect_url = f"http://localhost:4200/login?token={token}&id={user.id}&role={user.role}&email={user.email}"
        return redirect(redirect_url)

# ==========================================
# 🐙 GITHUB OAUTH2 MANUEL
# ==========================================
class GithubLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        client_id = os.getenv('GITHUB_CLIENT_ID')
        redirect_uri = "http://localhost:8000/accounts/github/login/callback/"
        url = f"https://github.com/login/oauth/authorize?client_id={client_id}&redirect_uri={redirect_uri}&scope=user:email"
        return redirect(url)

class GithubCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        code = request.GET.get('code')
        data = {
            'client_id': os.getenv('GITHUB_CLIENT_ID'),
            'client_secret': os.getenv('GITHUB_CLIENT_SECRET'),
            'code': code,
            'redirect_uri': "http://localhost:8000/accounts/github/login/callback/"
        }
        headers = {'Accept': 'application/json'}
        res = requests.post('https://github.com/login/oauth/access_token', data=data, headers=headers)
        access_token = res.json().get('access_token')

        # Récupération de l'email
        user_res = requests.get('https://api.github.com/user', headers={'Authorization': f"Bearer {access_token}"})
        email = user_res.json().get('email')
        
        if not email:
            emails_res = requests.get('https://api.github.com/user/emails', headers={'Authorization': f"Bearer {access_token}"})
            for e in emails_res.json():
                if e.get('primary'):
                    email = e.get('email')
                    break

        user, created = Utilisateur.objects.get_or_create(
            email=email,
            defaults={'mot_de_passe': str(uuid.uuid4()), 'role': 'ROLE_USER'}
        )
        
        token = JwtService.generer_token(user)
        redirect_url = f"http://localhost:4200/login?token={token}&id={user.id}&role={user.role}&email={user.email}"
        return redirect(redirect_url)