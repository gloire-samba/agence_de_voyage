import jwt
import datetime
from rest_framework import authentication
from rest_framework.permissions import BasePermission
from .models import Utilisateur
from rest_framework.permissions import SAFE_METHODS

# La même clé que tu as mise dans ton .env (ou une par défaut)
import os
SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'UneCleParDefautSiAbsente')

class JwtService:
    @staticmethod
    def generer_token(utilisateur):
        maintenant = datetime.datetime.now(datetime.timezone.utc)
        payload = {
            'sub': utilisateur.email,
            'role': utilisateur.role,
            'id': utilisateur.id,  # Remplacé 'pseudo' par 'id' pour Angular
            'exp': maintenant + datetime.timedelta(days=1),
            'iat': maintenant
        }
        return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

class JWTAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None 

        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user = Utilisateur.objects.get(email=payload['sub'])
            return (user, token) 
        except Exception:
            return None

class IsAdminRole(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not hasattr(request.user, 'role'):
            return False
        return request.user.role == 'ROLE_ADMIN'
    
class EstAuteurAvisOuAdmin(BasePermission):
    """
    - GET : Tout le monde
    - POST : Il faut être connecté
    - PUT/PATCH : Seul l'Auteur de l'avis
    - DELETE : L'Auteur OU l'Admin
    """
    
    # 1. Vérification globale (Pour lire la liste ou créer un nouvel avis)
    def has_permission(self, request, view):
        # Si on veut juste lire (GET), on laisse passer
        if request.method in SAFE_METHODS:
            return True
        # Pour le reste (POST, PUT, DELETE), il faut au moins être connecté avec un Token valide
        return bool(request.user and request.user.is_authenticated)

    # 2. Vérification sur un objet spécifique (Quand on modifie ou supprime UN avis précis)
    def has_object_permission(self, request, view, obj):
        # La lecture (GET /api/avis/5/) est publique
        if request.method in SAFE_METHODS:
            return True
            
        # Modification (PUT / PATCH) : Strictement réservé à l'auteur
        if request.method in ['PUT', 'PATCH']:
            return obj.utilisateur == request.user
            
        # Suppression (DELETE) : L'auteur de l'avis OU l'Admin
        if request.method == 'DELETE':
            return (obj.utilisateur == request.user) or (request.user.role == 'ROLE_ADMIN')
            
        return False
    
    
class EstProprietaireProfilOuAdmin(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        # L'utilisateur peut se modifier lui-même, l'Admin peut modifier tout le monde
        if request.method in ['PUT', 'PATCH']:
            return (obj == request.user) or (request.user.role == 'ROLE_ADMIN')
        return request.user.role == 'ROLE_ADMIN'