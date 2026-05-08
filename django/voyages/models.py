from django.db import models
# On importe le modèle User standard de Django pour démarrer. 
# Si tu as créé un Utilisateur custom (AbstractUser), il faudra l'adapter.
from django.contrib.auth.models import User


class Utilisateur(models.Model):
    email = models.CharField(max_length=100, unique=True)
    mot_de_passe = models.CharField(max_length=255) 
    role = models.CharField(max_length=20, default='ROLE_USER')
    date_inscription = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'UTILISATEUR'
        
    @property
    def is_authenticated(self):
        return True

    def __str__(self):
        return self.email
    
    
class Voyage(models.Model):
    ville_depart = models.CharField(max_length=100)
    ville_arrivee = models.CharField(max_length=100)
    prix_total = models.DecimalField(max_digits=10, decimal_places=2)
    note_moyenne = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)
    # 👉 NOUVEAU : Le statut du voyage
    statut = models.CharField(max_length=20, default='A_VENIR')

    def __str__(self):
        return f"{self.ville_depart} -> {self.ville_arrivee} ({self.prix_total}€) - {self.statut}"
    
class Segment(models.Model):
    # Le related_name='segments' permet de faire: mon_voyage.segments.all()
    voyage = models.ForeignKey(Voyage, on_delete=models.CASCADE, related_name='segments')
    ordre = models.IntegerField()
    ville_depart = models.CharField(max_length=100)
    ville_arrivee = models.CharField(max_length=100)
    heure_depart = models.DateTimeField()
    heure_arrivee = models.DateTimeField()

    class Meta:
        # Django triera automatiquement les segments par ordre
        ordering = ['ordre']

    def __str__(self):
        return f"[{self.ordre}] {self.ville_depart} -> {self.ville_arrivee}"

class Avis(models.Model):
    voyage = models.ForeignKey(Voyage, on_delete=models.CASCADE, related_name='avis')
    # C'est cette ligne qui est critique : elle doit pointer vers Utilisateur
    utilisateur = models.ForeignKey(Utilisateur, on_delete=models.CASCADE, related_name='avis')
    note = models.IntegerField()
    commentaire = models.TextField(blank=True, null=True)
    # 👉 NOUVEAU : Date auto-générée (Équivalent du @PrePersist de Spring)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Avis"
        # 👉 On en profite pour trier automatiquement les avis du plus récent au plus ancien !
        ordering = ['-date_creation']

    def __str__(self):
        return f"Avis de {self.utilisateur} sur {self.voyage} - Note: {self.note}/5"
    
class Reservation(models.Model):
    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente'),
        ('CONFIRME', 'Confirmé'),
        ('ANNULE', 'Annulé'),
    ]

    utilisateur = models.ForeignKey('Utilisateur', on_delete=models.CASCADE, related_name='reservations')
    voyage = models.ForeignKey('Voyage', on_delete=models.CASCADE, related_name='reservations')
    prix_paye = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Peut être null tant que ce n'est pas payé
    date_confirmation = models.DateTimeField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_ATTENTE')

    def __str__(self):
        return f"Reservation {self.id} - {self.utilisateur.email}"