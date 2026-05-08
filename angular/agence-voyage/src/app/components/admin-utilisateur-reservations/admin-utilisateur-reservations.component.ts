import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // 👉 Ajout
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReservationService } from '../../services/reservation.service';
import { VoyageService } from '../../services/voyage.service';

@Component({
  selector: 'app-admin-utilisateur-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-utilisateur-reservations.component.html',
  styleUrls: ['../admin-voyages/admin-voyages.component.css']
})
export class AdminUtilisateurReservationsComponent implements OnInit {
  private reservationService = inject(ReservationService);
  private voyageService = inject(VoyageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); // 👉 Injection

  utilisateurId!: number;
  reservations: any[] = [];
  voyagesDisponibles: any[] = [];
  isLoading = true;

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.utilisateurId = Number(idParam);
      this.chargerDonnees();
    }
  }

  chargerDonnees() {
    this.isLoading = true;
    this.cdr.detectChanges(); // On dit à Angular qu'on charge
    
    this.reservationService.getHistoriqueUtilisateur(this.utilisateurId).subscribe({
      next: (data: any) => {
        try {
          const donneesBrutes = data?.results || data?.content || data?._embedded?.reservations || data;
          this.reservations = Array.isArray(donneesBrutes) ? donneesBrutes : [];
          
          this.voyageService.getTousLesVoyages().subscribe({
            next: (vData: any) => {
              const voyagesBruts = vData?.results || vData?.content || vData?._embedded?.voyages || vData;
              this.voyagesDisponibles = Array.isArray(voyagesBruts) ? voyagesBruts : [];
              this.isLoading = false;
              this.cdr.detectChanges(); // 👉 C'est bon, on affiche !
            },
            error: () => { this.isLoading = false; this.cdr.detectChanges(); }
          });
        } catch(e) {
          this.isLoading = false; this.cdr.detectChanges();
        }
      },
      error: () => {
        this.reservations = [];
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  mettreAJourReservation(res: any) {
    const payload = {
      voyage_id: res.voyage_id || res.voyage?.id,
      statut: res.statut,
      date_reservation: new Date().toISOString()
    };

    this.reservationService.modifierReservation(res.id, payload).subscribe({
      next: () => {
        alert("✅ Réservation mise à jour.");
        this.chargerDonnees();
      },
      error: () => alert("❌ Erreur lors de la modification.")
    });
  }

  annulerReservation(id: number) {
    if (confirm("Voulez-vous annuler ce billet ?")) {
       this.reservationService.annulerReservation(id).subscribe(() => this.chargerDonnees());
    }
  }

  retour() {
    this.router.navigate(['/admin/utilisateurs']);
  }
}