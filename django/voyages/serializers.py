from rest_framework import serializers
from .models import Reservation, Utilisateur, Voyage, Segment, Avis

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

    class Meta:
        model = Voyage
        # 👉 AJOUT de 'statut'
        fields = ['id', 'ville_depart', 'ville_arrivee', 'prix_total', 'note_moyenne', 'statut', 'segments', 'avis']
        
class ReservationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reservation
        fields = '__all__'
        depth = 1  # 👈 Force Django à envoyer l'objet Voyage entier au lieu de juste son ID