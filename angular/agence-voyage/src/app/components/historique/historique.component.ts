import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router'; // 👉 OBLIGATOIRE : Pour changer de page
import { ReservationService } from '../../services/reservation.service';
import { Reservation } from '../../models/reservation';
import { VoyageService } from '../../services/voyage.service';
import { AvisFormComponent } from '../avis-form/avis-form.component'; 
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, DatePipe, CurrencyPipe, AvisFormComponent], 
  templateUrl: './historique.component.html',
  styleUrls: ['./historique.component.css']
})
export class HistoriqueComponent implements OnInit {
  private reservationService = inject(ReservationService);
  private cdr = inject(ChangeDetectorRef);
  private voyageService = inject(VoyageService); 
  private router = inject(Router); // 👉 OBLIGATOIRE : Injection du routeur
  private authService = inject(AuthService);

  reservations: Reservation[] = [];
  isLoading: boolean = true;
  erreur: string = '';
  idUtilisateurConnecte = this.authService.getUtilisateurActuel()?.id || 1;

  // Variables pour gérer l'affichage de la modale
  afficherModalAvis: boolean = false;
  reservationSelectionneeId!: number;
  avisSelectionne: any = null;

  ngOnInit(): void {
    this.chargerHistorique();
  }

  chargerHistorique() {
    this.isLoading = true;
    this.erreur = '';
    this.cdr.detectChanges(); 

    this.reservationService.getHistoriqueUtilisateur(this.idUtilisateurConnecte).subscribe({
      next: (data: any) => {
        if (!data) {
          this.reservations = [];
        } else {
          const donneesBrutes = data?.results || data?.content || data?._embedded?.reservations || data;
          this.reservations = Array.isArray(donneesBrutes) ? donneesBrutes : [];
        }
        
        this.isLoading = false;
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        this.isLoading = false;
        
        if (err.status === 404 || err.status === 204) {
          this.reservations = [];
        } else {
          this.erreur = "Impossible de récupérer votre historique pour le moment.";
          console.error("❌ Erreur API Historique :", err); 
        }
        
        this.cdr.detectChanges();
      }
    });
  }

  // 👉 LA FONCTION MANQUANTE QUI RÈGLE TON ERREUR
  allerAuPaiement(reservation: Reservation) {
    if (!reservation.id) return;
    const prix = this.getPrixPaye(reservation);
    this.router.navigate(['/paiement', reservation.id, prix]);
  }

  annulerReservation(id: number | undefined) {
    if (!id) return;
    
    if (confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
      this.reservationService.annulerReservation(id).subscribe({
        next: () => {
          this.chargerHistorique();
        },
        error: (err) => {
          alert('Une erreur est survenue lors de l\'annulation.');
        }
      });
    }
  }

  // 🛡️ --- MÉTHODES DE LECTURE UNIVERSELLES --- 🛡️

  private getVoyage(reservation: Reservation): any {
    return reservation.voyage || {};
  }

  getVilleDepart(reservation: Reservation): string {
    const v = this.getVoyage(reservation);
    return v.villeDepart || v.ville_depart || 'Inconnu';
  }

  getVilleArrivee(reservation: Reservation): string {
    const v = this.getVoyage(reservation);
    return v.villeArrivee || v.ville_arrivee || 'Inconnu';
  }

  getPrixPaye(reservation: Reservation): number {
    return reservation.prixPaye || (reservation as any).prix_paye || 0;
  }

  getDateConfirmation(reservation: Reservation): string {
    return reservation.dateConfirmation || (reservation as any).date_confirmation || '';
  }

  // 🛡️ --- GESTION DES AVIS --- 🛡️

  getMonAvis(reservation: Reservation): any {
    const voyage = this.getVoyage(reservation);
    if (voyage && voyage.avis && Array.isArray(voyage.avis)) {
      return voyage.avis.find((a: any) => {
        const auteurId = a.utilisateur?.id || (a as any).utilisateur_id || a.utilisateur;
        return auteurId === this.idUtilisateurConnecte;
      });
    }
    return null;
  }

  // Ouvre la fenêtre modale
  ouvrirFormulaireAvis(idReservation: number | undefined, avisExistant: any = null) {
    if (!idReservation) return;
    
    this.reservationSelectionneeId = idReservation;
    this.avisSelectionne = avisExistant;
    this.afficherModalAvis = true;
  }

  // Ferme la fenêtre modale et rafraîchit si nécessaire
  fermerFormulaire(doitRafraichir: boolean = false) {
    this.afficherModalAvis = false;
    this.avisSelectionne = null;
    
    if (doitRafraichir) {
      this.chargerHistorique();
    }
  }

  // Suppression réelle de l'avis
  supprimerAvis(idAvis: number) {
    if (confirm("Êtes-vous sûr de vouloir supprimer définitivement cet avis ?")) {
      this.isLoading = true;
      this.cdr.detectChanges();

      this.voyageService.supprimerAvisBase(idAvis).subscribe({
        next: () => {
          this.chargerHistorique(); 
        },
        error: (err) => {
          this.isLoading = false;
          alert("Erreur lors de la suppression de l'avis.");
          console.error(err);
          this.cdr.detectChanges();
        }
      });
    }
  }

  // 👉 NOUVEAU : Récupère la date de création de l'avis
  getDateAvis(avis: any): string {
    if (!avis) return '';
    return avis.dateCreation || avis.date_creation || '';
  }
}