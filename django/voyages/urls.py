from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuthAPIView, BilletViewSet, CheckEmailView, GithubCallbackView, GithubLoginView, GoogleCallbackView, GoogleLoginView, RegisterAPIView, ResetPasswordView, UtilisateurViewSet, VoyageViewSet, SegmentViewSet, AvisViewSet, ReservationViewSet
from . import views

# Le router gère automatiquement les URLs pour les ViewSets
router = DefaultRouter()
router.register(r'utilisateurs', UtilisateurViewSet, basename='utilisateur')
router.register(r'voyages', VoyageViewSet, basename='voyage')
router.register(r'segments', SegmentViewSet, basename='segment')
router.register(r'avis', AvisViewSet, basename='avis')
router.register(r'reservations', ReservationViewSet, basename='reservation')
router.register(r'billets', BilletViewSet, basename='billet') # 👉 AJOUT ICI

urlpatterns = [
    # Toutes les routes CRUD sont maintenant accessibles sous /api/
    path('api/voyages/recherche-intelligente/', views.recherche_intelligente, name='recherche-ia'),
    path('api/voyages/recherche-vocale/', views.recherche_vocale, name='recherche-vocale'),
    path('api/voyages/avis-vocal/', views.avis_vocal, name='avis-vocal'),
    path('api/paiement/create-intent/', views.create_payment_intent, name='create-payment-intent'),
    # 🔐 Routes d'authentification CLASSIQUE (sans magie)
    path('api/auth/login/', AuthAPIView.as_view(), name='login'),
    path('api/auth/register/', RegisterAPIView.as_view(), name='register'),
    # 👉 NOUVELLES ROUTES SOCIALES (Attention, pas de /api/ sur les callbacks pour respecter la config)
    path('api/auth/google/login/', GoogleLoginView.as_view()),
    path('accounts/google/login/callback/', GoogleCallbackView.as_view()),
    
    path('api/auth/github/login/', GithubLoginView.as_view()),
    path('accounts/github/login/callback/', GithubCallbackView.as_view()),
    
    path('api/auth/check-email/', CheckEmailView.as_view()),
    path('api/auth/reset-password/', ResetPasswordView.as_view()),
    
    path('api/', include(router.urls)),
]