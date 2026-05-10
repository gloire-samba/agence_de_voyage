import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { VoyageService } from '../../services/voyage.service';
import { BilletService } from '../../services/billet.service';
import { Voyage } from '../../models/voyage';
import { Reservation } from '../../models/reservation';

@Component({
  selector: 'app-admin-recherche-place',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, CurrencyPipe],
  templateUrl: './admin-recherche-place.component.html',
  styleUrls: ['./admin-recherche-place.component.css']
})
export class AdminRecherchePlaceComponent implements OnInit {
  private voyageService = inject(VoyageService);
  private billetService = inject(BilletService);

  voyages: Voyage[] = [];
  voyageIdSelectionne: number | '' = '';
  siegeSaisi: string = '';

  resultatReservation: Reservation | null = null;
  erreurRecherche: string = '';
  isLoading: boolean = false;

  ngOnInit() {
    // On charge tous les voyages pour peupler la liste déroulante
    this.voyageService.getTousLesVoyages().subscribe({
      next: (data) => this.voyages = data,
      error: (err) => console.error("Erreur chargement voyages", err)
    });
  }

  lancerRecherche() {
    if (!this.voyageIdSelectionne || !this.siegeSaisi.trim()) {
      return;
    }

    this.isLoading = true;
    this.erreurRecherche = '';
    this.resultatReservation = null;

    // On s'assure que le siège est en majuscules (ex: 12a -> 12A)
    const siegeFormatte = this.siegeSaisi.trim().toUpperCase();

    this.billetService.trouverReservationParSiege(Number(this.voyageIdSelectionne), siegeFormatte).subscribe({
      next: (reservation) => {
        this.resultatReservation = reservation;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.erreurRecherche = `Aucun passager n'a été trouvé à la place ${siegeFormatte} pour ce vol.`;
      }
    });
  }

  // 🛡️ Méthodes de lecture compatibles Spring/Django
  getVilleDepart(v: any): string { return v?.villeDepart || v?.ville_depart || '?'; }
  getVilleArrivee(v: any): string { return v?.villeArrivee || v?.ville_arrivee || '?'; }
  getPrixPaye(res: Reservation): number { return res.prixPaye || (res as any).prix_paye || 0; }
  getDateConfirmation(res: Reservation): string { return res.dateConfirmation || (res as any).date_confirmation || ''; }
  getEmailUtilisateur(res: Reservation): string { 
    return (res.utilisateur as any)?.email || 'Utilisateur introuvable'; 
  }
}