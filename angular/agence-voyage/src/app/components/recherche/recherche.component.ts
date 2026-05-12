import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { VoyageService } from '../../services/voyage.service';
import { AudioRecorderService } from '../../services/audio-recorder.service';
import { ReservationService } from '../../services/reservation.service';
import { ServeurService } from '../../services/serveur.service';
import { AuthService } from '../../services/auth.service';

import { Voyage } from '../../models/voyage';
import { CatalogueComponent } from '../catalogue/catalogue.component'; 

@Component({
  selector: 'app-recherche',
  standalone: true,
  imports: [CommonModule, FormsModule, CatalogueComponent, RouterModule], 
  templateUrl: './recherche.component.html',
  styleUrls: ['./recherche.component.css']
})
export class RechercheComponent implements OnInit {
  private voyageService = inject(VoyageService);
  private audioRecorderService = inject(AudioRecorderService);
  private reservationService = inject(ReservationService);
  private serveurService = inject(ServeurService);
  private authService = inject(AuthService); 
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  catalogueComplet: Voyage[] = [];
  voyagesA_Afficher: Voyage[] = []; 

  texteRecherche: string = '';
  villeDepart: string = '';
  villeArrivee: string = '';
  dateDepart: string = '';
  dureeMaxHeures: number | null = null; 

  isRecording: boolean = false;
  isLoading: boolean = false;
  phraseReconnue: string = '';
  erreur: string = '';
  estAdmin: boolean = false;
  texteIA: string = '';
  
  ngOnInit() {
    this.estAdmin = this.authService.isAdmin();

    this.voyageService.getTousLesVoyages().subscribe({
      next: (voyages) => {
        this.catalogueComplet = this.appliquerFiltreRole(voyages);
        this.voyagesA_Afficher = this.catalogueComplet;
      },
      error: (err) => console.error("Erreur de chargement du catalogue", err)
    });
  }

  permuterVilles() {
    const temp = this.villeDepart;
    this.villeDepart = this.villeArrivee;
    this.villeArrivee = temp;
  }
 
  rechercheManuelle() {
    this.erreur = '';
    this.phraseReconnue = ''; 
    
    let resultatsFiltres = [...this.catalogueComplet];

    if (this.texteRecherche) {
      const recherche = this.texteRecherche.toLowerCase();
      resultatsFiltres = resultatsFiltres.filter(v => {
        const depart = (v.villeDepart || (v as any).ville_depart || '').toLowerCase();
        const arrivee = (v.villeArrivee || (v as any).ville_arrivee || '').toLowerCase();
        return depart.includes(recherche) || arrivee.includes(recherche);
      });
    }

    if (this.villeDepart) {
      resultatsFiltres = resultatsFiltres.filter(v => {
        const nomVille = v.villeDepart || (v as any).ville_depart || '';
        return nomVille.toLowerCase().includes(this.villeDepart.toLowerCase());
      });
    }

    if (this.villeArrivee) {
      resultatsFiltres = resultatsFiltres.filter(v => {
        const nomVille = v.villeArrivee || (v as any).ville_arrivee || '';
        return nomVille.toLowerCase().includes(this.villeArrivee.toLowerCase());
      });
    }

    if (this.dateDepart) {
      resultatsFiltres = resultatsFiltres.filter(v => {
        if (!v.segments || v.segments.length === 0) return false;
        const heureDep = v.segments[0].heureDepart || (v.segments[0] as any).heure_depart || '';
        return heureDep.startsWith(this.dateDepart);
      });
    }

    if (this.dureeMaxHeures !== null) {
      const maxMinutes = this.dureeMaxHeures * 60;
      resultatsFiltres = resultatsFiltres.filter(v => {
        const duree = this.calculerDureeMinutes(v);
        return duree <= maxMinutes;
      });
    }

    this.voyagesA_Afficher = resultatsFiltres;
  }

  private calculerDureeMinutes(v: any): number {
    if (!v.segments || v.segments.length === 0) return 0;
    const d1 = new Date(v.segments[0].heureDepart || v.segments[0].heure_depart).getTime();
    const d2 = new Date(v.segments[v.segments.length - 1].heureArrivee || v.segments[v.segments.length - 1].heure_arrivee).getTime();
    return (d2 - d1) / 60000;
  }

  async toggleRecording() {
    this.erreur = '';
    
    if (this.isRecording) {
      this.isRecording = false;
      this.isLoading = true;
      this.cdr.detectChanges(); 

      try {
        const audioBlob = await this.audioRecorderService.stopRecording();
        this.voyageService.rechercheVocaleIA(audioBlob).subscribe({
          next: (response: any) => {
            this.isLoading = false;
            const texteIA = response.texteReconnu || response.texte_reconnu || "Recherche incomprise";
            this.phraseReconnue = `L'IA a compris : "${texteIA}"`;
            
            const resultatsBruts = Array.isArray(response) ? response : (response.resultats || []);
            this.voyagesA_Afficher = this.appliquerFiltreRole(resultatsBruts);

            this.cdr.detectChanges(); 
          },
          error: (err) => {
            this.isLoading = false;
            this.erreur = "Erreur IA : " + (err.error?.detail || "Impossible de joindre le serveur.");
            this.cdr.detectChanges();
          }
        });
      } catch (err) {
        this.erreur = "Erreur lors de l'arrêt de l'enregistrement.";
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    } else {
      try {
        await this.audioRecorderService.startRecording();
        this.isRecording = true;
        this.cdr.detectChanges(); 
      } catch (err) {
        this.erreur = "Impossible d'accéder au micro.";
        this.cdr.detectChanges();
      }
    }
  }

  rechercheTexteIA() {
    if (!this.texteIA.trim()) return;
    
    this.isLoading = true;
    this.erreur = '';
    this.cdr.detectChanges();

    this.voyageService.rechercheTexteIA(this.texteIA).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        const texteCompris = response.texteReconnu || response.texte_reconnu || "Analyse terminée";
        this.phraseReconnue = `L'IA a analysé : "${texteCompris}"`;
        
        const resultatsBruts = Array.isArray(response) ? response : (response.resultats || []);
        this.voyagesA_Afficher = this.appliquerFiltreRole(resultatsBruts);
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.erreur = "Erreur IA : " + (err.error?.detail || "Impossible de joindre le serveur.");
        this.cdr.detectChanges();
      }
    });
  }

  declencherReservation(event: { voyage: Voyage, nbPlaces: number }) {
    const voyage = event.voyage;
    const nbPlaces = event.nbPlaces;
    const prixUnitaire = voyage.prixTotal || (voyage as any).prix_total;
    const prixTotalPaiement = prixUnitaire * nbPlaces; 
    const userId = this.authService.getUserId();
    
    let nouvelleResa: any = {};
    if (this.serveurService.getBackend() === 'spring') {
      nouvelleResa = { utilisateur: { id: userId }, voyage: { id: voyage.id }, nbPlacesDemandees: nbPlaces };
    } else {
      nouvelleResa = { utilisateur_id: userId, voyage_id: voyage.id, nbPlacesDemandees: nbPlaces };
    }

    this.reservationService.creerReservation(nouvelleResa).subscribe({
      next: (resa) => this.router.navigate(['/paiement', resa.id, prixTotalPaiement]),
      error: (err) => alert('Erreur : Impossible de créer la réservation.')
    });
  }

  private appliquerFiltreRole(resultatsBruts: Voyage[]): Voyage[] {
    const estAdmin = this.authService.isAdmin();
    if (estAdmin) return resultatsBruts; 
    
    return resultatsBruts.filter(v => {
      const statut = v.statut || (v as any).statut || 'A_VENIR';
      const capacite = v.nombrePlacesTotal || (v as any).nombre_places_total || 0;
      let placesRestantes = capacite;

      if ((v as any).placesRestantes !== undefined && (v as any).placesRestantes !== null) {
          placesRestantes = (v as any).placesRestantes;
      } else if ((v as any).places_restantes !== undefined && (v as any).places_restantes !== null) {
          placesRestantes = (v as any).places_restantes;
      }
      return statut === 'A_VENIR' && placesRestantes > 0; 
    });
  }
}