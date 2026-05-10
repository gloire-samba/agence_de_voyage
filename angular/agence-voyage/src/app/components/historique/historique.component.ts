import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http'; 
import { jsPDF } from 'jspdf'; // 👉 NOUVEL IMPORT

import { ReservationService } from '../../services/reservation.service';
import { Reservation } from '../../models/reservation';
import { VoyageService } from '../../services/voyage.service';
import { AvisFormComponent } from '../avis-form/avis-form.component'; 
import { AuthService } from '../../services/auth.service';
import { ServeurService } from '../../services/serveur.service'; 

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
  private serveurService = inject(ServeurService); 

  reservations: Reservation[] = [];
  isLoading: boolean = true;
  erreur: string = '';
  utilisateurConnecte = this.authService.getUserId();

  afficherModalAvis: boolean = false;
  reservationSelectionneeId!: number;
  avisSelectionne: any = null;

  // 👉 NOUVEAU : État de la modale Billet
  afficherModalBillet: boolean = false;
  reservationBillet: Reservation | null = null;

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

  getStatutVoyage(reservation: Reservation): string {
    const v = this.getVoyage(reservation);
    return v.statut || 'A_VENIR';
  }

  demanderRemboursement(res: Reservation) {
    if (!res.id) return;
    const confirmation = confirm(`Voulez-vous demander un remboursement intégral de ${this.getPrixPaye(res)}€ directement sur la carte utilisée lors du paiement ?`);
    if (confirmation) {
      this.isLoading = true;
      this.cdr.detectChanges();
      this.reservationService.annulerReservation(res.id).subscribe({
        next: () => {
          alert("✅ Remboursement Stripe validé avec succès ! L'argent apparaîtra sur votre compte sous 3 à 5 jours.");
          this.chargerHistorique(); 
        },
        error: (err) => {
          this.isLoading = false;
          alert("❌ Erreur lors du traitement du remboursement avec la banque.");
          this.cdr.detectChanges();
        }
      });
    }
  }

  echangerBillet(res: Reservation) {
    alert(`Votre avoir de ${this.getPrixPaye(res)}€ est enregistré ! Vous allez être redirigé vers le catalogue pour choisir un nouveau vol.`);
    this.router.navigate(['/recherche']);
  }

  // ==========================================
  // 👉 GESTION DU BILLET ET PDF
  // ==========================================

  getSieges(reservation: Reservation): string {
    if (!reservation.billets || reservation.billets.length === 0) return 'En attente';
    return reservation.billets.map(b => b.siege).join(', ');
  }

  ouvrirBillet(res: Reservation) {
    this.reservationBillet = res;
    this.afficherModalBillet = true;
  }

  fermerBillet() {
    this.afficherModalBillet = false;
    this.reservationBillet = null;
  }

  telechargerPDF() {
    if (!this.reservationBillet) return;
    
    const res = this.reservationBillet;
    const doc = new jsPDF();
    
    // Décoration de l'en-tête
    doc.setFillColor(15, 23, 42); // Bleu foncé
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text('CARTE D\'EMBARQUEMENT', 105, 25, { align: 'center' });

    // Contenu principal
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    
    doc.text(`N° de Réservation : #${res.id}`, 20, 60);
    const dateC = this.getDateConfirmation(res);
    doc.text(`Date d'achat : ${dateC ? new Date(dateC).toLocaleDateString('fr-FR') : 'N/A'}`, 140, 60);

    // Encadré Trajet
    doc.setLineWidth(0.5);
    doc.rect(20, 75, 170, 35);
    doc.setFontSize(16);
    doc.text(`${this.getVilleDepart(res)}`, 30, 95);
    doc.text(`➔`, 100, 95);
    doc.text(`${this.getVilleArrivee(res)}`, 120, 95);

    // Infos passager et places
    doc.setFontSize(12);
    doc.text('INFORMATIONS VOYAGEUR', 20, 130);
    doc.setFontSize(10);
    doc.text(`Propriétaire : Compte Client N°${this.utilisateurConnecte}`, 20, 140);
    doc.text(`Siège(s) assigné(s) : ${this.getSieges(res)}`, 20, 150);
    doc.text(`Montant réglé : ${this.getPrixPaye(res)} EUR`, 20, 160);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Merci de voyager avec nous. Présentez ce document à la porte d\'embarquement.', 105, 280, { align: 'center' });

    // Lancement du téléchargement
    doc.save(`Billet_Voyage_${res.id}.pdf`);
  }

  // 🛡️ --- MÉTHODES DE LECTURE UNIVERSELLES --- 🛡️

  private getVoyage(reservation: Reservation): any { return reservation.voyage || {}; }
  getVilleDepart(reservation: Reservation): string { const v = this.getVoyage(reservation); return v.villeDepart || v.ville_depart || 'Inconnu'; }
  getVilleArrivee(reservation: Reservation): string { const v = this.getVoyage(reservation); return v.villeArrivee || v.ville_arrivee || 'Inconnu'; }
  getPrixPaye(reservation: Reservation): number { return reservation.prixPaye || (reservation as any).prix_paye || 0; }
  getDateConfirmation(reservation: Reservation): string { return reservation.dateConfirmation || (reservation as any).date_confirmation || ''; }
  
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

  getDateAvis(avis: any): string { return avis ? (avis.dateCreation || avis.date_creation || '') : ''; }
}