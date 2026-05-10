from rest_framework import serializers
from .models import Billet, Reservation, Utilisateur, Voyage, Segment, Avis

class UtilisateurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Utilisateur
        fields = ['id', 'email', 'mot_de_passe', 'role', 'date_inscription']
        extra_kwargs = {'mot_de_passe': {'write_only': True}} # Sécurité : jamais renvoyé au client

class SegmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Segment
        fields = '__all__'

class AvisSerializer(serializers.ModelSerializer):
    email_auteur = serializers.ReadOnlyField(source='utilisateur.email')

    class Meta:
        model = Avis
        # 👉 AJOUT de 'date_creation'
        fields = ['id', 'voyage', 'utilisateur', 'email_auteur', 'note', 'commentaire', 'date_creation']

class VoyageSerializer(serializers.ModelSerializer):
    # 'related_name' défini dans les models permet cette imbrication
    segments = SegmentSerializer(many=True, read_only=True)
    avis = AvisSerializer(many=True, read_only=True)

    # 👉 C'EST CETTE LIGNE QUI MANQUAIT ! 
    # Elle indique à Django d'utiliser la méthode get_places_restantes() en bas
    places_restantes = serializers.SerializerMethodField()

    class Meta:
        model = Voyage
        # 👉 On ajoute 'places_restantes' à la liste des champs envoyés
        fields = ['id', 'ville_depart', 'ville_arrivee', 'prix_total', 'nombre_places_total', 'places_restantes', 'note_moyenne', 'statut', 'segments', 'avis']

    # 👉 Calcul mathématique au moment de l'envoi
    def get_places_restantes(self, obj):
        places_occupees = sum(res.billets.count() for res in obj.reservations.exclude(statut='ANNULE'))
        return obj.nombre_places_total - places_occupees
    
# 👉 NOUVEAU
class BilletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Billet
        fields = ['id', 'siege']
        
class ReservationSerializer(serializers.ModelSerializer):
    billets = BilletSerializer(many=True, read_only=True)

    class Meta:
        model = Reservation
        fields = '__all__'
        depth = 1  # 👈 Force Django à envoyer l'objet Voyage entier au lieu de juste son ID