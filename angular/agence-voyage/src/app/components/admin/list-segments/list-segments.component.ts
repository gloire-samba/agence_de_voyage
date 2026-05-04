import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { SegmentService } from '../../../services/segment.service';
import { AdminFormSegmentComponent } from '../admin-form-segment/admin-form-segment.component';
// 👉 IMPORTANT : On importe le composant enfant


@Component({
  selector: 'app-list-segments',
  standalone: true,
  imports: [CommonModule, DatePipe, AdminFormSegmentComponent],
  templateUrl: './list-segments.component.html',
  styleUrls: ['./list-segments.component.css']
})
export class ListSegmentsComponent implements OnInit {
  private segmentService = inject(SegmentService);

  segments: any[] = [];
  
  // Variables pour gérer l'affichage de la modale enfant
  afficherFormulaire = false;
  segmentSelectionne: any = null;

  ngOnInit() {
    this.chargerSegments();
  }

  chargerSegments() {
    this.segmentService.getTous().subscribe({
      next: (data) => this.segments = data,
      error: (err) => console.error("Erreur de chargement", err)
    });
  }

  supprimer(id: number) {
    if (confirm("Supprimer définitivement ce segment ?")) {
      this.segmentService.supprimer(id).subscribe({
        next: () => this.chargerSegments(),
        error: () => alert("Impossible de supprimer ce segment.")
      });
    }
  }

  // --- Gestion de la modale enfant ---

  ouvrirCreation() {
    this.segmentSelectionne = null;
    this.afficherFormulaire = true;
  }

  ouvrirModification(segment: any) {
    this.segmentSelectionne = segment;
    this.afficherFormulaire = true;
  }

  // Se déclenche quand l'enfant a fini son travail
  onSauvegardeReussie() {
    this.afficherFormulaire = false;
    this.chargerSegments(); // On rafraîchit le tableau
  }
}