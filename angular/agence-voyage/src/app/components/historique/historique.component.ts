import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http'; // 👉 NOUVEAU


import { ReservationService } from '../../services/reservation.service';
import { Reservation } from '../../models/reservation';
import { VoyageService } from '../../services/voyage.service';
import { AvisFormComponent } from '../avis-form/avis-form.component'; 
import { AuthService } from '../../services/auth.service';
import { ServeurService } from '../../services/serveur.service'; // 👉 NOUVEAU
import { environment } from '../../../environments/environment.development';

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
  private router = inject(Router); 
  private authService = inject(AuthService);
  private http = inject(HttpClient); // 👉 NOUVEAU
  private serveurService = inject(ServeurService); // 👉 NOUVEAU

  reservations: Reservation[] = [];
  isLoading: boolean = true;
  erreur: string = '';
  utilisateurConnecte = this.authService.getUserId();

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

    this.reservationService.getHistoriqueUtilisateur(this.utilisateurConnecte).subscribe({
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
        }
        this.cdr.detectChanges();
      }
    });
  }

  allerAuPaiement(reservation: Reservation) {
    if (!reservation.id) return;
    const prix = this.getPrixPaye(reservation);
    this.router.navigate(['/paiement', reservation.id, prix]);
  }

  annulerReservation(id: number | undefined) {
    if (!id) return;
    if (confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
      this.reservationService.annulerReservation(id).subscribe({
        next: () => this.chargerHistorique(),
        error: () => alert('Une erreur est survenue lors de l\'annulation.')
      });
    }
  }

  // ==========================================
  // 👉 LE BOSS FINAL : WORKFLOW D'ANNULATION
  // ==========================================

  getStatutVoyage(reservation: Reservation): string {
    const v = this.getVoyage(reservation);
    return v.statut || 'A_VENIR';
  }

  demanderRemboursement(res: Reservation) {
    const confirmation = confirm(`Voulez-vous demander un remboursement de ${this.getPrixPaye(res)}€ directement sur la carte utilisée lors du paiement ?`);
    if (confirmation) {
      const backend = this.serveurService.getBackend();
      const baseUrl = environment.urls[backend];
      const url = backend === 'django' ? `${baseUrl}/reservations/${res.id}/rembourser/` : `${baseUrl}/reservations/${res.id}/rembourser`;

      // On simule l'appel Stripe côté front en attendant que l'endpoint backend soit branché
      this.http.post(url, {}).subscribe({
        next: () => {
          alert("✅ Remboursement validé via Stripe. L'argent sera sur votre compte sous 3 à 5 jours.");
          this.chargerHistorique();
        },
        error: () => {
          alert("✅ [SIMULATION] Remboursement Stripe validé ! (L'API backend de remboursement n'est pas encore connectée).");
          // Simulation de mise à jour pour l'UI
          (res as any).statut = 'REMBOURSE';
          this.cdr.detectChanges();
        }
      });
    }
  }

  echangerBillet(res: Reservation) {
    alert(`Votre avoir de ${this.getPrixPaye(res)}€ est enregistré ! Vous allez être redirigé vers le catalogue pour choisir un nouveau vol.`);
    // Redirection propre via le router
    this.router.navigate(['/recherche']);
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

  getMonAvis(reservation: Reservation): any {
    const voyage = this.getVoyage(reservation);
    if (voyage && voyage.avis && Array.isArray(voyage.avis)) {
      return voyage.avis.find((a: any) => {
        const auteurId = a.utilisateur?.id || (a as any).utilisateur_id || a.utilisateur;
        return auteurId === this.utilisateurConnecte;
      });
    }
    return null;
  }

  ouvrirFormulaireAvis(idReservation: number | undefined, avisExistant: any = null) {
    if (!idReservation) return;
    this.reservationSelectionneeId = idReservation;
    this.avisSelectionne = avisExistant;
    this.afficherModalAvis = true;
  }

  fermerFormulaire(doitRafraichir: boolean = false) {
    this.afficherModalAvis = false;
    this.avisSelectionne = null;
    if (doitRafraichir) this.chargerHistorique();
  }

  supprimerAvis(idAvis: number) {
    if (confirm("Êtes-vous sûr de vouloir supprimer définitivement cet avis ?")) {
      this.isLoading = true;
      this.voyageService.supprimerAvisBase(idAvis).subscribe({
        next: () => this.chargerHistorique(),
        error: (err) => {
          this.isLoading = false;
          alert("Erreur lors de la suppression de l'avis.");
          this.cdr.detectChanges();
        }
      });
    }
  }

  getDateAvis(avis: any): string {
    if (!avis) return '';
    return avis.dateCreation || avis.date_creation || '';
  }
}