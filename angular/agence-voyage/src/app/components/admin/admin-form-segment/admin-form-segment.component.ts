import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SegmentService } from '../../../services/segment.service';

@Component({
  selector: 'app-admin-form-segment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-form-segment.component.html',
  styleUrls: ['./admin-form-segment.component.css']
})
export class AdminFormSegmentComponent implements OnInit {
  // Le parent nous passe un segment si on a cliqué sur "Modifier"
  @Input() segmentEnEdition: any = null;
  
  // Événements pour prévenir le parent
  @Output() fermer = new EventEmitter<void>();
  @Output() sauvegardeOk = new EventEmitter<void>();

  private segmentService = inject(SegmentService);

  formSegment = { villeDepart: '', villeArrivee: '', heureDepart: '', heureArrivee: '', moyenTransport: 'Avion' };

  ngOnInit() {
    if (this.segmentEnEdition) {
      this.formSegment = {
        villeDepart: this.segmentEnEdition.villeDepart || this.segmentEnEdition.ville_depart,
        villeArrivee: this.segmentEnEdition.villeArrivee || this.segmentEnEdition.ville_arrivee,
        heureDepart: this.segmentEnEdition.heureDepart || this.segmentEnEdition.heure_depart,
        heureArrivee: this.segmentEnEdition.heureArrivee || this.segmentEnEdition.heure_arrivee,
        moyenTransport: this.segmentEnEdition.moyenTransport || this.segmentEnEdition.moyen_transport || 'Avion'
      };
    }
  }

  sauvegarder() {
    const payload = {
      ville_depart: this.formSegment.villeDepart,
      ville_arrivee: this.formSegment.villeArrivee,
      heure_depart: this.formSegment.heureDepart,
      heure_arrivee: this.formSegment.heureArrivee,
      moyen_transport: this.formSegment.moyenTransport
    };

    if (this.segmentEnEdition) {
      this.segmentService.modifier(this.segmentEnEdition.id, payload).subscribe({
        next: () => this.sauvegardeOk.emit(), // On prévient le parent de rafraîchir la liste
        error: (err) => alert("Erreur lors de la modification.")
      });
    } else {
      this.segmentService.creer(payload).subscribe({
        next: () => this.sauvegardeOk.emit(),
        error: (err) => alert("Erreur lors de la création.")
      });
    }
  }
}