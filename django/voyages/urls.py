from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UtilisateurViewSet, VoyageViewSet, SegmentViewSet, AvisViewSet, ReservationViewSet
from . import views

# Le router gère automatiquement les URLs pour les ViewSets
router = DefaultRouter()
router.register(r'utilisateurs', UtilisateurViewSet, basename='utilisateur')
router.register(r'voyages', VoyageViewSet, basename='voyage')
router.register(r'segments', SegmentViewSet, basename='segment')
router.register(r'avis', AvisViewSet, basename='avis')
router.register(r'reservations', ReservationViewSet, basename='reservation')

urlpatterns = [
    # Toutes les routes CRUD sont maintenant accessibles sous /api/
    path('api/voyages/recherche-intelligente/', views.recherche_intelligente, name='recherche-ia'),
    path('api/voyages/recherche-vocale/', views.recherche_vocale, name='recherche-vocale'),
    path('api/voyages/avis-vocal/', views.avis_vocal, name='avis-vocal'),
    path('api/paiement/create-intent/', views.create_payment_intent, name='create-payment-intent'),
    path('api/', include(router.urls)),
]