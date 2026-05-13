import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VoyageService } from '../../services/voyage.service';
import { ServeurService } from '../../services/serveur.service';

@Component({
  selector: 'app-admin-voyage-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-voyage-form.component.html',
  styleUrls: ['./admin-voyage-form.component.css']
})
export class AdminVoyageFormComponent implements OnInit {
  private voyageService = inject(VoyageService);
  private serveurService = inject(ServeurService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  voyageId: number | null = null;
  isLoading = true;
  erreurFormulaire = '';

  formVoyage: any = { 
    villeDepart: '', 
    villeArrivee: '', 
    prixTotal: 0, 
    nombrePlacesTotal: 0,
    statut: 'A_VENIR', 
    segments: [] 
  };

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.voyageId = Number(idParam);
      this.chargerVoyage(this.voyageId);
    } else {
      this.formVoyage.statut = 'A_VENIR';
      this.ajouterSegment(); 
      this.isLoading = false; 
    }
  }

  chargerVoyage(id: number) {
    this.voyageService.getTousLesVoyages().subscribe({
      next: (data: any) => {
        const donneesBrutes = data?.results || data?.content || data?._embedded?.voyages || data;
        const voyages = Array.isArray(donneesBrutes) ? donneesBrutes : [];
        const voyage = voyages.find((v: any) => v.id === id);
        
        if (voyage) {
          this.formVoyage = {
            villeDepart: voyage.villeDepart || voyage.ville_depart || '',
            villeArrivee: voyage.villeArrivee || voyage.ville_arrivee || '',
            prixTotal: voyage.prixTotal || voyage.prix_total || 0,
            nombrePlacesTotal: voyage.nombrePlacesTotal || voyage.nombre_places_total || 0,
            statut: voyage.statut || 'A_VENIR',
            segments: (voyage.segments || []).map((s: any) => {
              const hDep = s.heureDepart || s.heure_depart || '';
              const hArr = s.heureArrivee || s.heure_arrivee || '';

              return {
                villeDepart: s.villeDepart || s.ville_depart || '',
                villeArrivee: s.villeArrivee || s.ville_arrivee || '',
                heureDepart: hDep ? hDep.substring(0, 16) : '',
                heureArrivee: hArr ? hArr.substring(0, 16) : ''
              };
            })
          };
        }
        
        this.isLoading = false;
        this.verifierFormulaire();
        this.cdr.detectChanges(); 
      },
      error: () => { 
        this.isLoading = false; 
        this.cdr.detectChanges(); 
      }
    });
  }

  ajouterSegment() {
    this.formVoyage.segments.push({
      villeDepart: '', villeArrivee: '', heureDepart: '', heureArrivee: ''
    });
    this.verifierFormulaire();
  }

  supprimerSegment(index: number) {
    this.formVoyage.segments.splice(index, 1);
    this.verifierFormulaire();
  }

  verifierFormulaire() {
    this.erreurFormulaire = '';

    if (!this.formVoyage.villeDepart || !this.formVoyage.villeArrivee) {
      this.erreurFormulaire = "Les villes de départ et d'arrivée du voyage sont obligatoires.";
      return;
    }
    if (this.formVoyage.prixTotal <= 0) {
      this.erreurFormulaire = "Le prix total doit être supérieur à 0.";
      return;
    }
    if (this.formVoyage.nombrePlacesTotal <= 0) {
      this.erreurFormulaire = "Le nombre de places doit être supérieur à 0.";
      return;
    }
    if (this.formVoyage.segments.length === 0) {
      this.erreurFormulaire = "Il faut au moins 1 segment pour ce voyage.";
      return;
    }

    // ==========================================
    // 🌍 NOUVELLES RÈGLES DE COHÉRENCE DES VILLES
    // ==========================================
    
    const villeDepGlobale = this.formVoyage.villeDepart.trim().toLowerCase();
    const villeArrGlobale = this.formVoyage.villeArrivee.trim().toLowerCase();
    const premierSegDep = (this.formVoyage.segments[0].villeDepart || '').trim().toLowerCase();
    const dernierSegArr = (this.formVoyage.segments[this.formVoyage.segments.length - 1].villeArrivee || '').trim().toLowerCase();

    // Règle 1 : Départ et Arrivée globaux
    if (premierSegDep !== '' && villeDepGlobale !== premierSegDep) {
      this.erreurFormulaire = "La ville de départ globale doit être identique à la ville de départ du 1er segment.";
      return;
    }
    if (dernierSegArr !== '' && villeArrGlobale !== dernierSegArr) {
      this.erreurFormulaire = "La ville d'arrivée globale doit être identique à la ville d'arrivée du dernier segment.";
      return;
    }

    // Règle 2 : Continuité entre les segments
    for (let i = 0; i < this.formVoyage.segments.length - 1; i++) {
      const arrPrecedent = (this.formVoyage.segments[i].villeArrivee || '').trim().toLowerCase();
      const depSuivant = (this.formVoyage.segments[i+1].villeDepart || '').trim().toLowerCase();
      
      if (arrPrecedent !== '' && depSuivant !== '' && arrPrecedent !== depSuivant) {
        this.erreurFormulaire = `Continuité rompue : La ville d'arrivée du Segment ${i+1} doit correspondre au départ du Segment ${i+2}.`;
        return;
      }
    }

    // ==========================================
    // ⏱️ RÈGLES DE COHÉRENCE TEMPORELLES ET STATUT
    // ==========================================

    const maintenant = new Date();

    for (let i = 0; i < this.formVoyage.segments.length; i++) {
      const seg = this.formVoyage.segments[i];
      
      if (!seg.villeDepart || !seg.villeArrivee || !seg.heureDepart || !seg.heureArrivee) {
        this.erreurFormulaire = `Segment ${i+1} : Tous les champs doivent être remplis.`;
        return;
      }

      const dep = new Date(seg.heureDepart);
      const arr = new Date(seg.heureArrivee);

      // L'arrivée doit être APRES le départ
      if (arr <= dep) {
        this.erreurFormulaire = `Segment ${i+1} : L'heure d'arrivée doit être postérieure au départ.`;
        return;
      }

      // Le départ du segment N doit être APRES l'arrivée du segment N-1
      if (i > 0) {
        const arriveePrecedente = new Date(this.formVoyage.segments[i-1].heureArrivee);
        if (dep <= arriveePrecedente) {
          this.erreurFormulaire = `Segment ${i+1} : Le départ doit se faire APRÈS l'arrivée du Segment ${i}.`;
          return;
        }
      }
    }

    // 👉 REGLE 2 : Contrôle des dates par rapport au statut sélectionné
    const premierDepart = new Date(this.formVoyage.segments[0].heureDepart);
    const derniereArrivee = new Date(this.formVoyage.segments[this.formVoyage.segments.length - 1].heureArrivee);

    if (this.formVoyage.statut === 'A_VENIR') {
      if (premierDepart <= maintenant) {
        this.erreurFormulaire = `Cohérence Statut : Pour un voyage "A VENIR", la date de départ du 1er segment doit être dans le futur (après ${maintenant.toLocaleString('fr-FR')}).`;
        return;
      }
    } 
    else if (this.formVoyage.statut === 'EN_COURS') {
      if (maintenant < premierDepart || maintenant > derniereArrivee) {
        this.erreurFormulaire = `Cohérence Statut : Pour un voyage "EN COURS", la date actuelle (${maintenant.toLocaleString('fr-FR')}) doit être comprise entre le 1er départ et la dernière arrivée.`;
        return;
      }
    } 
    else if (this.formVoyage.statut === 'TERMINE') {
      if (derniereArrivee >= maintenant) {
        this.erreurFormulaire = `Cohérence Statut : Pour un voyage "TERMINE", l'arrivée du dernier segment doit être dans le passé (avant ${maintenant.toLocaleString('fr-FR')}).`;
        return;
      }
    }
  }

  sauvegarder() {
    this.verifierFormulaire();
    if (this.erreurFormulaire !== '') return;

    const backend = this.serveurService.getBackend();
    
    const segmentsFormates = this.formVoyage.segments.map((s: any, index: number) => {
      return backend === 'spring' ? {
        ordre: index + 1, villeDepart: s.villeDepart, villeArrivee: s.villeArrivee, heureDepart: s.heureDepart, heureArrivee: s.heureArrivee
      } : {
        ordre: index + 1, ville_depart: s.villeDepart, ville_arrivee: s.villeArrivee, heure_depart: s.heureDepart, heure_arrivee: s.heureArrivee
      };
    });

    const payload = backend === 'spring' ? {
      villeDepart: this.formVoyage.villeDepart, villeArrivee: this.formVoyage.villeArrivee,
      prixTotal: Number(this.formVoyage.prixTotal), nombrePlacesTotal: Number(this.formVoyage.nombrePlacesTotal),
      statut: this.formVoyage.statut, segments: segmentsFormates
    } : {
      ville_depart: this.formVoyage.villeDepart, ville_arrivee: this.formVoyage.villeArrivee,
      prix_total: Number(this.formVoyage.prixTotal), nombre_places_total: Number(this.formVoyage.nombrePlacesTotal),
      statut: this.formVoyage.statut, segments: segmentsFormates
    };

    const requete = this.voyageId 
      ? this.voyageService.modifierVoyage(this.voyageId, payload)
      : this.voyageService.creerVoyage(payload);

    requete.subscribe({
      next: () => this.router.navigate(['/admin/voyages']),
      error: () => alert("Erreur lors de la sauvegarde du voyage.")
    });
  }

  annuler() { 
    this.router.navigate(['/admin/voyages']); 
  }
}