import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { VoyageService } from '../../services/voyage.service';
import { AudioRecorderService } from '../../services/audio-recorder.service';
import { ReservationService } from '../../services/reservation.service';
import { ServeurService } from '../../services/serveur.service';
// 👉 NOUVEAU : Import du service d'authentification
import { AuthService } from '../../services/auth.service';

import { RechercheIntelligenteResponse } from '../../models/ia-response';
import { Voyage } from '../../models/voyage';
import { CatalogueComponent } from '../catalogue/catalogue.component'; 

@Component({
  selector: 'app-recherche',
  standalone: true,
  imports: [CommonModule, FormsModule, CatalogueComponent], 
  templateUrl: './recherche.component.html',
  styleUrls: ['./recherche.component.css']
})
export class RechercheComponent implements OnInit {
  private voyageService = inject(VoyageService);
  private audioRecorderService = inject(AudioRecorderService);
  private reservationService = inject(ReservationService);
  private serveurService = inject(ServeurService);
  private authService = inject(AuthService); // 👉 NOUVEAU : Injection
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  catalogueComplet: Voyage[] = [];
  voyagesA_Afficher: Voyage[] = []; 

  villeDepart: string = '';
  villeArrivee: string = '';
  dateDepart: string = '';

  isRecording: boolean = false;
  isLoading: boolean = false;
  phraseReconnue: string = '';
  erreur: string = '';

  // NOUVEAU : Propriété pour savoir si on affiche le bouton Admin
  estAdmin: boolean = false;
  
  ngOnInit() {
    this.estAdmin = this.authService.isAdmin();

    this.voyageService.getTousLesVoyages().subscribe({
      next: (voyages) => {
        // 👉 UTILISATION DE LA MOULINETTE
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
    if (!this.villeDepart && !this.villeArrivee && !this.dateDepart) {
      this.erreur = "Veuillez remplir au moins un champ (Départ, Arrivée ou Date).";
      return;
    }

    this.erreur = '';
    this.phraseReconnue = "Recherche manuelle appliquée.";
    
    let resultatsFiltres = [...this.catalogueComplet];

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

    this.voyagesA_Afficher = resultatsFiltres;
  }

  texteIA: string = '';

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
            
            // 👉 UTILISATION DE LA MOULINETTE SUR LES RÉSULTATS DE L'IA
            const resultatsBruts = Array.isArray(response) ? response : (response.resultats || []);
            this.voyagesA_Afficher = this.appliquerFiltreRole(resultatsBruts);

            this.cdr.detectChanges(); 
          },
          error: (err) => {
            this.isLoading = false;
            if (err.status === 429) {
              this.erreur = "L'IA est actuellement surchargée. Veuillez réessayer dans un instant.";
            } else if (err.status === 503) {
              this.erreur = "Le service IA est temporairement indisponible.";
            } else {
              this.erreur = "Erreur IA : " + (err.error?.detail || "Impossible de joindre le serveur.");
            }
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
        
        // 👉 UTILISATION DE LA MOULINETTE SUR LES RÉSULTATS DE L'IA
        const resultatsBruts = Array.isArray(response) ? response : (response.resultats || []);
        this.voyagesA_Afficher = this.appliquerFiltreRole(resultatsBruts);
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 429) {
          this.erreur = "L'IA est actuellement surchargée. Veuillez réessayer dans un instant.";
        } else if (err.status === 503) {
          this.erreur = "Le service IA est temporairement indisponible.";
        } else {
          this.erreur = "Erreur IA : " + (err.error?.detail || "Impossible de joindre le serveur.");
        }
        this.cdr.detectChanges();
      }
    });
  }

  declencherReservation(voyage: Voyage) {
    const prix = voyage.prixTotal || (voyage as any).prix_total;
    const userId = this.authService.getUserId();
    
    let nouvelleResa: any = {};
    if (this.serveurService.getBackend() === 'spring') {
      nouvelleResa = { utilisateur: { id: userId }, voyage: { id: voyage.id }, prixPaye: prix, statut: 'EN_ATTENTE' };
    } else {
      nouvelleResa = { utilisateur_id: userId, voyage_id: voyage.id, prix_paye: prix, statut: 'EN_ATTENTE' };
    }

    this.reservationService.creerReservation(nouvelleResa).subscribe({
      next: (resa) => {
        this.router.navigate(['/paiement', resa.id, prix]);
      },
      error: (err) => alert('Erreur : Impossible de créer la réservation en base de données.')
    });
  }

  // NOUVELLES METHODES DE NAVIGATION
  allerAuProfil() {
    this.router.navigate(['/profil']);
  }

  allerAuDashboard() {
    this.router.navigate(['/admin/dashboard']);
  }

  deconnexion() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // 👉 NOUVELLE MÉTHODE : La moulinette de filtrage intelligente
  private appliquerFiltreRole(resultatsBruts: Voyage[]): Voyage[] {
    if (this.estAdmin) {
      return resultatsBruts; // L'admin voit absolument tout
    }
    
    // Le client normal ne voit que A_VENIR et ANNULE
    return resultatsBruts.filter(v => {
      const statut = v.statut || (v as any).statut || 'A_VENIR';
      return statut === 'A_VENIR' || statut === 'ANNULE';
    });
  }
}