import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { VoyageService } from '../../../services/voyage.service';
import { SegmentService } from '../../../services/segment.service';
import { AdminFormVoyageComponent } from '../admin-form-voyage/admin-form-voyage.component';
// 👉 IMPORT DE L'ENFANT


@Component({
  selector: 'app-list-voyages',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, AdminFormVoyageComponent],
  templateUrl: './list-voyages.component.html',
  styleUrls: ['./list-voyages.component.css']
})
export class ListVoyagesComponent implements OnInit {
  private voyageService = inject(VoyageService);
  private segmentService = inject(SegmentService);

  voyages: any[] = [];
  segmentsDisponibles: any[] = [];
  
  afficherFormulaire = false;
  voyageSelectionne: any = null;

  ngOnInit() {
    this.chargerVoyages();
    // On charge les segments en arrière-plan pour que la modale les ait à disposition
    this.chargerSegments(); 
  }

  chargerVoyages() {
    this.voyageService.getTousLesVoyages().subscribe({
      next: (data) => this.voyages = data,
      error: (err) => console.error("Erreur de chargement", err)
    });
  }

  chargerSegments() {
    this.segmentService.getTous().subscribe({
      next: (data) => this.segmentsDisponibles = data
    });
  }

  supprimer(id: number) {
    if (confirm("Supprimer ce voyage ? (Les segments attachés ne seront pas supprimés).")) {
      this.voyageService.supprimerVoyage(id).subscribe({
        next: () => this.chargerVoyages(),
        error: () => alert("Impossible de supprimer ce voyage.")
      });
    }
  }

  ouvrirCreation() {
    this.voyageSelectionne = null;
    this.afficherFormulaire = true;
  }

  ouvrirModification(voyage: any) {
    this.voyageSelectionne = voyage;
    this.afficherFormulaire = true;
  }

  onSauvegardeReussie() {
    this.afficherFormulaire = false;
    this.chargerVoyages(); // Rafraîchit le tableau
  }
}