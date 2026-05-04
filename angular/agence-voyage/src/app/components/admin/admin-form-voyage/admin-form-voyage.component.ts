import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoyageService } from '../../../services/voyage.service';

@Component({
  selector: 'app-admin-form-voyage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-form-voyage.component.html',
  styleUrls: ['./admin-form-voyage.component.css']
})
export class AdminFormVoyageComponent implements OnInit {
  // Le parent (la liste) nous passe un voyage si on modifie, et la liste des segments disponibles
  @Input() voyageEnEdition: any = null;
  @Input() segmentsDisponibles: any[] = [];
  
  // Événements pour communiquer avec le parent
  @Output() fermer = new EventEmitter<void>();
  @Output() sauvegardeOk = new EventEmitter<void>();

  private voyageService = inject(VoyageService);

  formVoyage = { villeDepart: '', villeArrivee: '', prixTotal: 0, segmentsIds: [] as number[] };

  ngOnInit() {
    if (this.voyageEnEdition) {
      this.formVoyage = {
        villeDepart: this.voyageEnEdition.villeDepart || this.voyageEnEdition.ville_depart,
        villeArrivee: this.voyageEnEdition.villeArrivee || this.voyageEnEdition.ville_arrivee,
        prixTotal: this.voyageEnEdition.prixTotal || this.voyageEnEdition.prix_total,
        // On récupère les ID des segments déjà liés au voyage
        segmentsIds: this.voyageEnEdition.segments ? this.voyageEnEdition.segments.map((s: any) => s.id) : []
      };
    }
  }

  // Permet de cocher/décocher un segment (Désormais 100% optionnel)
  toggleSegmentSelection(segmentId: number) {
    const index = this.formVoyage.segmentsIds.indexOf(segmentId);
    if (index > -1) {
      this.formVoyage.segmentsIds.splice(index, 1);
    } else {
      this.formVoyage.segmentsIds.push(segmentId);
    }
  }

  sauvegarder() {
    const payload = {
      ville_depart: this.formVoyage.villeDepart,
      ville_arrivee: this.formVoyage.villeArrivee,
      prix_total: this.formVoyage.prixTotal,
      // On envoie le tableau d'IDs (il peut être vide, c'est autorisé !)
      segments: this.formVoyage.segmentsIds 
    };

    if (this.voyageEnEdition) {
      this.voyageService.modifierVoyage(this.voyageEnEdition.id, payload).subscribe({
        next: () => this.sauvegardeOk.emit(),
        error: (err) => alert("Erreur lors de la modification.")
      });
    } else {
      this.voyageService.creerVoyage(payload).subscribe({
        next: () => this.sauvegardeOk.emit(),
        error: (err) => alert("Erreur lors de la création.")
      });
    }
  }
}