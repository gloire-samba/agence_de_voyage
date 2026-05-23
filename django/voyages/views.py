from rest_framework import viewsets, status
from .models import Billet, Reservation, Utilisateur, Voyage, Segment, Avis
from .serializers import BilletSerializer, ReservationSerializer, UtilisateurSerializer, VoyageSerializer, SegmentSerializer, AvisSerializer
from .services import AvisService, RechercheIntelligenteService, ReservationService, UtilisateurService, VoyageService, SegmentService
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from .security import EstProprietaireProfilOuAdmin, JwtService, IsAdminRole, EstAuteurAvisOuAdmin

# 👉 Nouveaux imports pour les e-mails
from django.core.mail import send_mail
from django.conf import settings

import stripe
import os
from dotenv import load_dotenv
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
        return [EstProprietaireProfilOuAdmin()]

class VoyageViewSet(viewsets.ModelViewSet):
    queryset = Voyage.objects.prefetch_related('segments', 'avis', 'reservations__billets').all().order_by('id')
    serializer_class = VoyageSerializer
    
    # 👉 CORRECTION : On utilise `create` au lieu de `perform_create` 
    # pour récupérer `request.data` BRUT avant que Django n'efface les segments !
    def create(self, request, *args, **kwargs):
        voyage = VoyageService.creer(request.data)
        serializer = self.get_serializer(voyage)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # 👉 CORRECTION : Idem pour la modification
    def update(self, request, *args, **kwargs):
        voyage = VoyageService.modifier(kwargs.get('pk'), request.data)
        serializer = self.get_serializer(voyage)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # 👉 NOUVEAU : On force Django à utiliser notre Service pour la suppression
    def destroy(self, request, *args, **kwargs):
        VoyageService.supprimer(kwargs.get('pk'))
        return Response(status=status.HTTP_204_NO_CONTENT)

class SegmentViewSet(viewsets.ModelViewSet):
    queryset = Segment.objects.all().order_by('id')
    serializer_class = SegmentSerializer
    
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAdminRole()]

class AvisViewSet(viewsets.ModelViewSet):
    queryset = Avis.objects.all().order_by('id')
    serializer_class = AvisSerializer

    def perform_create(self, serializer):
        AvisService.creer(serializer.validated_data)

    def perform_update(self, serializer):
        AvisService.modifier(self.get_object().id, serializer.validated_data)

    def perform_destroy(self, instance):
        AvisService.supprimer(instance.id)
        
    def get_permissions(self):
        return [EstAuteurAvisOuAdmin()]
    
    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        if 'reservationId' in data:
            try:
                res = Reservation.objects.get(id=data['reservationId'])
                data['voyage'] = res.voyage.id
            except Reservation.DoesNotExist:
                return Response({"error": "Réservation introuvable"}, status=status.HTTP_404_NOT_FOUND)
        
        data['utilisateur'] = request.user.id
        
        serializer = self.get_serializer(data=data)
        if serializer.is_valid():
            AvisService.creer(serializer.validated_data)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def perform_create(self, serializer):
        serializer.save(utilisateur=self.request.user)
        
@api_view(['POST'])
def recherche_intelligente(request):
    texte = request.data.get('texte', '')
    voyages = RechercheIntelligenteService.chercher_voyage(texte)
    serializer = VoyageSerializer(voyages, many=True)
    return Response(serializer.data)

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
        return Response({"erreur": str(e)}, status=503)
    
class ReservationViewSet(viewsets.ModelViewSet):
    queryset = Reservation.objects.all()
    serializer_class = ReservationSerializer

    def destroy(self, request, *args, **kwargs):
        ReservationService.supprimer(kwargs.get('pk'))
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['get'], url_path=r'utilisateur/(?P<utilisateur_id>\d+)')
    def historique_utilisateur(self, request, utilisateur_id=None):
        reservations = ReservationService.get_historique_utilisateur(utilisateur_id)
        serializer = self.get_serializer(reservations, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def confirmer(self, request, pk=None):
        try:
            stripe_id = request.data.get('stripePaymentId') 
            reservation = ReservationService.confirmer_paiement(pk, stripe_id)
            return Response(self.get_serializer(reservation).data)
        except Reservation.DoesNotExist:
            return Response({"erreur": "Réservation introuvable"}, status=status.HTTP_404_NOT_FOUND)
        
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
            return [IsAuthenticated()]
        return [IsAdminRole()]
    
    def create(self, request, *args, **kwargs):
        try:
            data = request.data
            voyage_id = data.get('voyage', {}).get('id') if isinstance(data.get('voyage'), dict) else data.get('voyage_id') or data.get('voyage')
            utilisateur_id = data.get('utilisateur', {}).get('id') if isinstance(data.get('utilisateur'), dict) else data.get('utilisateur_id') or data.get('utilisateur')
            
            utilisateur = Utilisateur.objects.get(id=utilisateur_id)
            nb_places = int(data.get('nbPlacesDemandees', 1))

            reservation = ReservationService.creer(voyage_id, utilisateur, nb_places)
            return Response(ReservationSerializer(reservation).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"erreur": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
    @action(detail=True, methods=['post'], url_path='echanger')
    def echanger(self, request, pk=None):
        try:
            # Django récupère les données dans request.data
            nouveau_voyage_id = request.data.get('nouveauVoyageId')
            
            if not nouveau_voyage_id:
                return Response({"erreur": "ID du nouveau voyage manquant."}, status=status.HTTP_400_BAD_REQUEST)
                
            nouvelle_reservation = ReservationService.echanger(pk, nouveau_voyage_id)
            return Response(self.get_serializer(nouvelle_reservation).data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"erreur": str(e)}, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def avis_vocal(request):
    audio_file = request.FILES.get('audio')
    reservation_id = request.data.get('reservationId') 
    note = request.data.get('note', 5)

    if not audio_file:
        return Response({"error": "Audio manquant"}, status=400)

    try:
        res = Reservation.objects.get(id=reservation_id)
        voyage_id = res.voyage.id
    except Reservation.DoesNotExist:
        return Response({"error": "Réservation introuvable"}, status=404)

    # Transcription de l'audio en texte via ton service IA
    texte_avis = RechercheIntelligenteService.transcrire_audio(audio_file)
    
    # 👉 LA CORRECTION EST ICI :
    # On ajoute "_id" aux noms des clés pour que Django accepte les nombres
    avis_data = {
        "voyage_id": voyage_id,          # <-- Ajout de _id
        "utilisateur_id": request.user.id, # <-- Ajout de _id
        "note": note,
        "commentaire": texte_avis
    }
    
    # Appel au service pour créer l'entrée en base
    AvisService.creer(avis_data)
    
    return Response({"message": "Avis vocal enregistré !", "texte": texte_avis})

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

@api_view(['POST'])
def create_payment_intent(request):
    try:
        prix_total = float(request.data.get('prixTotal', 0))
        montant_centimes = int(prix_total * 100)

        intent = stripe.PaymentIntent.create(
            amount=montant_centimes,
            currency='eur',
            automatic_payment_methods={'enabled': True},
        )
        
        return Response({'clientSecret': intent.client_secret})
    except Exception as e:
        return Response({'error': str(e)}, status=403)
    
class AuthAPIView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email')
        mot_de_passe = request.data.get('motDePasse') 

        try:
            user = Utilisateur.objects.get(email=email)
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
        
        try:
            send_mail(
                "Bienvenue chez Agence de Voyage ✈️",
                "Bonjour et bienvenue !\n\nVotre compte a été créé avec succès. Préparez-vous à découvrir de nouvelles destinations !\n\nL'équipe.",
                settings.EMAIL_HOST_USER,
                [email],
                fail_silently=True
            )
        except Exception:
            pass

        return Response({"message": "Inscription réussie !"}, status=status.HTTP_201_CREATED)
    
# ==========================================
# 🌐 GOOGLE OAUTH2 MANUEL
# ==========================================
class GoogleLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        # On récupère le frontend demandeur (react ou angular). Par défaut angular.
        frontend = request.GET.get('frontend', 'angular')
        redirect_uri = request.build_absolute_uri('/accounts/google/login/callback/')
        
        # On injecte le nom du front dans le paramètre 'state' d'OAuth2
        params = {
            'client_id': os.getenv('GOOGLE_CLIENT_ID'),
            'redirect_uri': redirect_uri,
            'response_type': 'code',
            'scope': 'email profile',
            'state': frontend  # <-- Transmis de façon sécurisée à Google
        }
        
        auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)
        return redirect(auth_url)


class GoogleCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        code = request.GET.get('code')
        # Google nous renvoie le paramètre 'state' intact ('react' ou 'angular')
        frontend = request.GET.get('state', 'angular')
        
        redirect_uri = request.build_absolute_uri('/accounts/google/login/callback/')
        
        token_url = "https://oauth2.googleapis.com/token"
        data = {
            'code': code,
            'client_id': os.getenv('GOOGLE_CLIENT_ID'),
            'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
            'redirect_uri': redirect_uri,
            'grant_type': 'authorization_code'
        }
        
        res = requests.post(token_url, data=data)
        access_token = res.json().get('access_token')
        
        user_info_res = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={'Authorization': f'Bearer {access_token}'}
        )
        user_info = user_info_res.json()
        email = user_info.get('email')
        
        utilisateur, created = Utilisateur.objects.get_or_create(
            email=email,
            defaults={
                'mot_de_passe': str(uuid.uuid4()),
                'role': 'ROLE_USER'
            }
        )
        
        token = JwtService.generer_token(utilisateur)
        
        # Choix dynamique de l'URL du frontend
        frontend_url = "http://localhost:5173" if frontend == 'react' else "http://localhost:4200"
        
        target_url = f"{frontend_url}/login?token={token}&id={utilisateur.id}&role={utilisateur.role}&email={utilisateur.email}"
        return redirect(target_url)
    
# ==========================================
# 🐙 GITHUB OAUTH2 MANUEL
# ==========================================
class GithubLoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        frontend = request.GET.get('frontend', 'angular')
        
        params = {
            'client_id': os.getenv('GITHUB_CLIENT_ID'),
            'scope': 'user:email',
            'state': frontend # <-- Transmis de façon sécurisée à GitHub
        }
        auth_url = "https://github.com/login/oauth/authorize?" + urllib.parse.urlencode(params)
        return redirect(auth_url)


class GithubCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        code = request.GET.get('code')
        # GitHub nous renvoie le 'state' intact
        frontend = request.GET.get('state', 'angular')
        
        token_url = "https://github.com/login/oauth/access_token"
        headers = {'Accept': 'application/json'}
        data = {
            'client_id': os.getenv('GITHUB_CLIENT_ID'),
            'client_secret': os.getenv('GITHUB_CLIENT_SECRET'),
            'code': code
        }
        
        res = requests.post(token_url, headers=headers, data=data)
        access_token = res.json().get('access_token')
        
        emails_res = requests.get(
            "https://api.github.com/user/emails",
            headers={'Authorization': f'Bearer {access_token}'}
        )
        emails = emails_res.json()
        
        primary_email = None
        if isinstance(emails, list):
            for e in emails:
                if e.get('primary'):
                    primary_email = e.get('email')
                    break
        
        if not primary_email and isinstance(emails, list) and len(emails) > 0:
            primary_email = emails[0].get('email')
            
        if not primary_email:
            user_res = requests.get(
                "https://api.github.com/user",
                headers={'Authorization': f'Bearer {access_token}'}
            )
            primary_email = user_res.json().get('login') + "@github.com"

        utilisateur, created = Utilisateur.objects.get_or_create(
            email=primary_email,
            defaults={
                'mot_de_passe': str(uuid.uuid4()),
                'role': 'ROLE_USER'
            }
        )
        
        token = JwtService.generer_token(utilisateur)
        
        # Choix dynamique de l'URL du frontend
        frontend_url = "http://localhost:5173" if frontend == 'react' else "http://localhost:4200"
        
        target_url = f"{frontend_url}/login?token={token}&id={utilisateur.id}&role={utilisateur.role}&email={utilisateur.email}"
        return redirect(target_url)
        
class BilletViewSet(viewsets.ModelViewSet):
    serializer_class = BilletSerializer

    def get_queryset(self):
        user = self.request.user 
        if user.role == 'ROLE_ADMIN':
            return Billet.objects.all()
        return Billet.objects.filter(reservation__utilisateur=user)

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAdminRole()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], url_path='trouver-par-siege')
    def trouver_par_siege(self, request):
        voyage_id = request.query_params.get('voyageId')
        numero_siege = request.query_params.get('siege')
        try:
            billet = Billet.objects.get(reservation__voyage_id=voyage_id, siege=numero_siege)
            return Response(ReservationSerializer(billet.reservation).data)
        except Billet.DoesNotExist:
            return Response({"erreur": "Personne n'occupe cette place"}, status=404)
        
class CheckEmailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email')
        try:
            # On cherche l'utilisateur dans la base
            user = Utilisateur.objects.get(email=email)
            
            # 👉 ENVOI DU VRAI MOT DE PASSE PAR MAIL
            try:
                sujet = "Récupération de votre mot de passe 🔒"
                texte = (
                    f"Bonjour,\n\n"
                    f"Vous avez oublié votre mot de passe. Voici votre mot de passe actuel : {user.mot_de_passe}\n\n"
                    f"Nous vous conseillons de le modifier depuis votre profil une fois connecté.\n\n"
                    f"L'équipe Agence de Voyage."
                )
                send_mail(sujet, texte, settings.EMAIL_HOST_USER, [email], fail_silently=True)
            except Exception as e:
                print(f"Erreur envoi mail reset : {e}")
                
            return Response({"message": "Email trouvé, mot de passe envoyé."}, status=status.HTTP_200_OK)
            
        except Utilisateur.DoesNotExist:
            return Response({"error": "Email introuvable."}, status=status.HTTP_404_NOT_FOUND)
        
class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        email = request.data.get('email')
        new_password = request.data.get('newPassword')
        try:
            user = Utilisateur.objects.get(email=email)
            user.mot_de_passe = new_password
            user.save()
            return Response({"message": "Mot de passe mis à jour."}, status=status.HTTP_200_OK)
        except Utilisateur.DoesNotExist:
            return Response({"error": "Utilisateur introuvable."}, status=status.HTTP_404_NOT_FOUND)