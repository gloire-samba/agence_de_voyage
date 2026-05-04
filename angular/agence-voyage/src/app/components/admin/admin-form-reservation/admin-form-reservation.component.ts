import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReservationService } from '../../../services/reservation.service';

@Component({
  selector: 'app-admin-form-reservation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-form-reservation.component.html',
  styleUrls: ['./admin-form-reservation.component.css']
})
export class AdminFormReservationComponent implements OnInit {
  @Input() reservationEnEdition: any = null;
  
  @Output() fermer = new EventEmitter<void>();
  @Output() sauvegardeOk = new EventEmitter<void>();

  private reservationService = inject(ReservationService);

  formResa = { statut: '', prixPaye: 0 };

  ngOnInit() {
    if (this.reservationEnEdition) {
      this.formResa = {
        statut: this.reservationEnEdition.statut,
        prixPaye: this.reservationEnEdition.prixPaye || this.reservationEnEdition.prix_paye
      };
    }
  }

  sauvegarder() {
    const payload = {
      statut: this.formResa.statut,
      prix_paye: this.formResa.prixPaye
    };

    // Assure-toi d'ajouter "modifierReservation(id, payload)" dans ton ReservationService si ce n'est pas fait !
    this.reservationService.modifierReservation(this.reservationEnEdition.id, payload).subscribe({
      next: () => this.sauvegardeOk.emit(),
      error: (err) => alert("Erreur lors de la modification de la réservation.")
    });
  }
}