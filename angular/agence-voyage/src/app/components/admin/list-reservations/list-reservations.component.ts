import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ReservationService } from '../../../services/reservation.service';
import { AdminFormReservationComponent } from '../admin-form-reservation/admin-form-reservation.component';


@Component({
  selector: 'app-list-reservations',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, AdminFormReservationComponent],
  templateUrl: './list-reservations.component.html',
  styleUrls: ['./list-reservations.component.css']
})
export class ListReservationsComponent implements OnInit {
  // L'utilisateur parent nous est passé
  @Input() utilisateur: any;

  private reservationService = inject(ReservationService);

  reservations: any[] = [];
  afficherFormulaire = false;
  reservationSelectionnee: any = null;

  ngOnInit() {
    if (this.utilisateur) {
      this.chargerReservations();
    }
  }

  chargerReservations() {
    this.reservationService.getHistoriqueUtilisateur(this.utilisateur.id).subscribe({
      next: (data: any) => {
        // Extraction compatible Spring/Django
        this.reservations = Array.isArray(data) ? data : (data.results || data.content || data._embedded?.reservations || []);
      }
    });
  }

  supprimer(id: number) {
    if (confirm("Supprimer cette réservation ?")) {
      this.reservationService.annulerReservation(id).subscribe({
        next: () => this.chargerReservations(),
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
    this.chargerReservations();
  }
}