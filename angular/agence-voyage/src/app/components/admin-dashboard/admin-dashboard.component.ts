import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UtilisateurService } from '../../services/utilisateur.service';
// 👉 NOUVEAU : Import du service Segment
import { SegmentService } from '../../services/segment.service';
import { VoyageService } from '../../services/voyage.service';
import { AvisService } from '../../services/avis.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private utilisateurService = inject(UtilisateurService);
  private segmentService = inject(SegmentService); // 👉 NOUVEAU : Injection
  private router = inject(Router);
  // Dans ta classe AdminDashboardComponent, ajoute l'injection :
  private voyageService = inject(VoyageService);
  private avisService = inject(AvisService);

  ongletActif: 'VOYAGES' | 'SEGMENTS' | 'UTILISATEURS' | 'AVIS' = 'UTILISATEURS';

  // --- Données Utilisateurs ---
  utilisateurs: any[] = [];
  afficherModalUtilisateur = false;
  utilisateurEnEdition: any = null;
  formUtilisateur = { nom: '', email: '', motDePasse: '' };

  // 👉 NOUVEAU : --- Données Segments ---
  segments: any[] = [];
  afficherModalSegment = false;
  segmentEnEdition: any = null;
  // Note : Les noms de variables (camelCase) seront mappés vers le backend (snake_case) par les intercepteurs ou directement gérés par Spring.
  formSegment = { 
    villeDepart: '', 
    villeArrivee: '', 
    heureDepart: '', 
    heureArrivee: '', 
    moyenTransport: '' 
  };

  // 👉 NOUVEAU : --- Données Voyages ---
  voyages: any[] = [];
  afficherModalVoyage = false;
  voyageEnEdition: any = null;
  formVoyage = { 
    villeDepart: '', 
    villeArrivee: '', 
    prixTotal: 0, 
    statut: 'A_VENIR', // 👈 NOUVEAU
    segmentsIds: [] as number[] // Pour stocker les ID des segments cochés
  };

  // 👉 NOUVEAU : --- Données Avis ---
  avisList: any[] = [];
  afficherModalAvis = false;
  avisEnEdition: any = null;
  formAvis = { note: 5, commentaire: '' };

  // On stocke l'ID de l'admin pour vérifier s'il est l'auteur d'un avis
  idAdmin = this.authService.getUtilisateurActuel()?.id || 2;

  ngOnInit() {
    if (!this.authService.estAdmin()) {
      this.router.navigate(['/login']);
      return;
    }
    this.chargerDonnees();
  }

  changerOnglet(onglet: 'VOYAGES' | 'SEGMENTS' | 'UTILISATEURS' | 'AVIS') {
    this.ongletActif = onglet;
    this.chargerDonnees();
  }

  // 3. Dans ta méthode chargerDonnees(), ajoute la condition pour les avis :
  chargerDonnees() {
    if (this.ongletActif === 'UTILISATEURS') {
      this.utilisateurService.getTous().subscribe({ next: (data) => this.utilisateurs = data });
    } else if (this.ongletActif === 'SEGMENTS') {
      this.segmentService.getTous().subscribe({ next: (data) => this.segments = data });
    } else if (this.ongletActif === 'VOYAGES') {
      this.voyageService.getTousLesVoyages().subscribe({ next: (data) => this.voyages = data });
      this.segmentService.getTous().subscribe({ next: (data) => this.segments = data });
    } else if (this.ongletActif === 'AVIS') {
      // 👉 NOUVEAU : Chargement de tous les avis pour la modération
      this.avisService.getTous().subscribe({
        next: (data) => this.avisList = data,
        error: (err) => console.error("Erreur chargement des avis", err)
      });
    }
  }

  // --- CRUD UTILISATEURS (Inchangé) ---
  ouvrirFormulaireUtilisateur(utilisateur?: any) {
    if (utilisateur) {
      this.utilisateurEnEdition = utilisateur;
      this.formUtilisateur = { nom: utilisateur.nom, email: utilisateur.email, motDePasse: '' };
    } else {
      this.utilisateurEnEdition = null;
      this.formUtilisateur = { nom: '', email: '', motDePasse: '' };
    }
    this.afficherModalUtilisateur = true;
  }

  fermerModalUtilisateur() {
    this.afficherModalUtilisateur = false;
    this.utilisateurEnEdition = null;
  }

  sauvegarderUtilisateur() {
    if (this.utilisateurEnEdition) {
      this.utilisateurService.modifier(this.utilisateurEnEdition.id, this.formUtilisateur).subscribe({
        next: () => { this.chargerDonnees(); this.fermerModalUtilisateur(); },
        error: (err) => alert("Erreur lors de la modification")
      });
    } else {
      this.utilisateurService.creer(this.formUtilisateur).subscribe({
        next: () => { this.chargerDonnees(); this.fermerModalUtilisateur(); },
        error: (err) => alert("Erreur lors de la création")
      });
    }
  }

  supprimerUtilisateur(id: number) {
    if (id === 2) { // Sécurité modifiée avec le bon ID admin temporaire
      alert("⚠️ Action bloquée : Vous ne pouvez pas supprimer le compte Administrateur principal.");
      return;
    }
    if (confirm("Supprimer définitivement cet utilisateur ?")) {
      this.utilisateurService.supprimer(id).subscribe({
        next: () => this.chargerDonnees(),
        error: (err) => alert("Impossible de supprimer cet utilisateur.")
      });
    }
  }

  // 👉 NOUVEAU : --- CRUD SEGMENTS ---
  ouvrirFormulaireSegment(segment?: any) {
    if (segment) {
      this.segmentEnEdition = segment;
      // Adaptation des clés selon ce qui vient du backend (camelCase vs snake_case)
      this.formSegment = { 
        villeDepart: segment.villeDepart || segment.ville_depart, 
        villeArrivee: segment.villeArrivee || segment.ville_arrivee, 
        heureDepart: segment.heureDepart || segment.heure_depart, 
        heureArrivee: segment.heureArrivee || segment.heure_arrivee, 
        moyenTransport: segment.moyenTransport || segment.moyen_transport || 'Avion' 
      };
    } else {
      this.segmentEnEdition = null;
      this.formSegment = { villeDepart: '', villeArrivee: '', heureDepart: '', heureArrivee: '', moyenTransport: 'Avion' };
    }
    this.afficherModalSegment = true;
  }

  fermerModalSegment() {
    this.afficherModalSegment = false;
    this.segmentEnEdition = null;
  }

  sauvegarderSegment() {
    // Préparation de l'objet à envoyer (on s'assure que les clés correspondent au backend actuel)
    // À ajuster selon les entités exactes de ton Spring/Django si besoin
    const payload = {
      ville_depart: this.formSegment.villeDepart,
      ville_arrivee: this.formSegment.villeArrivee,
      heure_depart: this.formSegment.heureDepart,
      heure_arrivee: this.formSegment.heureArrivee,
      moyen_transport: this.formSegment.moyenTransport
    };

    if (this.segmentEnEdition) {
      this.segmentService.modifier(this.segmentEnEdition.id, payload).subscribe({
        next: () => { this.chargerDonnees(); this.fermerModalSegment(); },
        error: (err) => alert("Erreur lors de la modification du segment")
      });
    } else {
      this.segmentService.creer(payload).subscribe({
        next: () => { this.chargerDonnees(); this.fermerModalSegment(); },
        error: (err) => alert("Erreur lors de la création du segment")
      });
    }
  }

  supprimerSegment(id: number) {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce segment ? Attention, cela pourrait impacter les voyages qui l'utilisent.")) {
      this.segmentService.supprimer(id).subscribe({
        next: () => this.chargerDonnees(),
        error: (err) => alert("Impossible de supprimer ce segment (probablement lié à un voyage existant).")
      });
    }
  }

  deconnexion() {
    this.authService.deconnexion();
    this.router.navigate(['/login']);
  }

  // 👉 NOUVEAU : --- CRUD VOYAGES ---

  ouvrirFormulaireVoyage(voyage?: any) {
    if (voyage) {
      this.voyageEnEdition = voyage;
      this.formVoyage = { 
        villeDepart: voyage.villeDepart || voyage.ville_depart, 
        villeArrivee: voyage.villeArrivee || voyage.ville_arrivee, 
        prixTotal: voyage.prixTotal || voyage.prix_total,
        statut: voyage.statut || 'A_VENIR', // 👈 NOUVEAU
        // Extraction des ID des segments liés à ce voyage
        segmentsIds: voyage.segments ? voyage.segments.map((s: any) => s.id) : [] 
      };
    } else {
      this.voyageEnEdition = null;
      this.formVoyage = { villeDepart: '', villeArrivee: '', prixTotal: 0, statut: 'A_VENIR',segmentsIds: [] };
    }
    this.afficherModalVoyage = true;
  }

  fermerModalVoyage() {
    this.afficherModalVoyage = false;
    this.voyageEnEdition = null;
  }

  // Permet de cocher/décocher un segment dans la liste
  toggleSegmentSelection(segmentId: number) {
    const index = this.formVoyage.segmentsIds.indexOf(segmentId);
    if (index > -1) {
      this.formVoyage.segmentsIds.splice(index, 1); // Décoche
    } else {
      this.formVoyage.segmentsIds.push(segmentId); // Coche
    }
  }

  sauvegarderVoyage() {
    const payload = {
      ville_depart: this.formVoyage.villeDepart,
      ville_arrivee: this.formVoyage.villeArrivee,
      prix_total: this.formVoyage.prixTotal,
      statut: this.formVoyage.statut, // 👈 NOUVEAU
      // On envoie la liste des ID des segments pour que le backend fasse les liaisons
      segments: this.formVoyage.segmentsIds 
    };

    if (this.voyageEnEdition) {
      this.voyageService.modifierVoyage(this.voyageEnEdition.id, payload).subscribe({
        next: () => { this.chargerDonnees(); this.fermerModalVoyage(); },
        error: (err) => alert("Erreur lors de la modification du voyage")
      });
    } else {
      this.voyageService.creerVoyage(payload).subscribe({
        next: () => { this.chargerDonnees(); this.fermerModalVoyage(); },
        error: (err) => alert("Erreur lors de la création du voyage")
      });
    }
  }

  supprimerVoyage(id: number) {
    if (confirm("Supprimer ce voyage ? (Les segments associés ne seront pas détruits, ils seront juste détachés).")) {
      this.voyageService.supprimerVoyage(id).subscribe({
        next: () => this.chargerDonnees(),
        error: (err) => alert("Impossible de supprimer ce voyage.")
      });
    }
  }

  // 👉 NOUVEAU : --- MODÉRATION DES AVIS ---

  // Une fonction pratique pour lire l'ID de l'auteur (compatible Spring/Django)
  getAuteurId(avis: any): number {
    return avis.utilisateur?.id || avis.utilisateur_id || avis.utilisateur;
  }

  ouvrirFormulaireAvis(avis: any) {
    // Sécurité supplémentaire côté TS : on vérifie que c'est bien son avis
    if (this.getAuteurId(avis) !== this.idAdmin) {
      alert("Vous ne pouvez modifier que vos propres avis.");
      return;
    }
    
    this.avisEnEdition = avis;
    this.formAvis = { note: avis.note, commentaire: avis.commentaire };
    this.afficherModalAvis = true;
  }

  fermerModalAvis() {
    this.afficherModalAvis = false;
    this.avisEnEdition = null;
  }

  sauvegarderAvis() {
    if (this.avisEnEdition) {
      const payload = { note: this.formAvis.note, commentaire: this.formAvis.commentaire };
      this.avisService.modifier(this.avisEnEdition.id, payload).subscribe({
        next: () => { this.chargerDonnees(); this.fermerModalAvis(); },
        error: (err) => alert("Erreur lors de la modification de l'avis")
      });
    }
  }

  supprimerAvis(id: number) {
    if (confirm("Supprimer cet avis de la plateforme ? (Action irréversible)")) {
      this.avisService.supprimer(id).subscribe({
        next: () => this.chargerDonnees(),
        error: (err) => alert("Erreur lors de la suppression de l'avis.")
      });
    }
  }
}