import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ReservationService } from '../../../services/reservation.service';
import { AdminFormReservationComponent } from '../admin-form-reservation/admin-form-reservation.component';

@Component({
  selector: 'app-list-reservations-global',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, AdminFormReservationComponent],
  templateUrl: './list-reservations-global.component.html',
  styleUrls: ['./list-reservations-global.component.css']
})
export class ListReservationsGlobalComponent implements OnInit {
  private reservationService = inject(ReservationService);

  reservations: any[] = [];
  afficherFormulaire = false;
  reservationSelectionnee: any = null;

  ngOnInit() {
    this.chargerToutesLesReservations();
  }

  chargerToutesLesReservations() {
    this.reservationService.getToutes().subscribe({
      next: (data: any) => {
        this.reservations = Array.isArray(data) ? data : (data.results || data.content || []);
      },
      error: (err) => console.error("Erreur de chargement", err)
    });
  }

  // Permet d'extraire le nom du client depuis l'objet imbriqué
  getNomClient(r: any): string {
    return r.utilisateur?.nom || r.utilisateur?.email || `Client #${r.utilisateur_id || r.utilisateur}`;
  }

  supprimer(id: number) {
    if (confirm("Supprimer définitivement ce dossier de réservation ?")) {
      this.reservationService.annulerReservation(id).subscribe({
        next: () => this.chargerToutesLesReservations(),
        error: () => alert("Impossible de supprimer.")
      });
    }
  }

  ouvrirModification(resa: any) {
    this.reservationSelectionnee = resa;
    this.afficherFormulaire = true;
  }

  onSauvegardeReussie() {
    this.afficherFormulaire = false;
    this.chargerToutesLesReservations();
  }
}