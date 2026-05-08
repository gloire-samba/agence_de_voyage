import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; // Indispensable pour la navigation vers le formulaire
import { VoyageService } from '../../services/voyage.service';

@Component({
  selector: 'app-admin-voyages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-voyages.component.html',
  styleUrls: ['./admin-voyages.component.css'] // 👉 CORRECTION : On pointe vers son propre CSS
})
export class AdminVoyagesComponent implements OnInit {
  private voyageService = inject(VoyageService);
  private router = inject(Router);

  voyages: any[] = [];
  
  // Outils de filtrage et tri
  texteRecherche: string = '';
  critereTri: string = 'id';
  triAscendant: boolean = true;

  ngOnInit() {
    this.chargerVoyages();
  }

  chargerVoyages() {
    this.voyageService.getTousLesVoyages().subscribe({
      next: (data) => this.voyages = data,
      error: (err) => console.error("Erreur chargement voyages", err)
    });
  }

  // 👉 LA LOGIQUE DU SOFT DELETE (Annuler vs Supprimer)
  supprimerOuAnnulerVoyage(voyage: any) {
    const choixSoftDelete = window.confirm(
      `Voyage #${voyage.id} : ${voyage.villeDepart || voyage.ville_depart} ➔ ${voyage.villeArrivee || voyage.ville_arrivee}\n\n` +
      `[OK] = ANNULER le voyage (Il passe au statut "Annulé" mais reste en base pour les historiques clients).\n` +
      `[Annuler] = Tenter une SUPPRESSION définitive de la base de données.`
    );

    if (choixSoftDelete) {
      // 1. L'Admin annule (Soft Delete)
      this.voyageService.modifierVoyage(voyage.id, { statut: 'ANNULE' }).subscribe({
        next: () => {
          alert('✅ Voyage annulé avec succès.');
          this.chargerVoyages();
        },
        error: () => alert('❌ Erreur lors de l\'annulation.')
      });
    } else {
      // 2. L'Admin force la suppression
      const confirmationHard = window.confirm("⚠️ Tenter la suppression ? Cela échouera et sera bloqué par le serveur si des clients ont déjà réservé ce voyage.");
      if (confirmationHard) {
        this.voyageService.supprimerVoyage(voyage.id).subscribe({
          next: () => {
            alert('✅ Voyage supprimé définitivement.');
            this.chargerVoyages();
          },
          error: () => alert("❌ IMPOSSIBLE : Ce voyage possède des réservations ou des avis liés. Veuillez l'annuler à la place.")
        });
      }
    }
  }

  // Navigation propre via les Routes
  allerVersFormulaire(id?: number) {
    if (id) {
      this.router.navigate(['/admin/voyages', id]);
    } else {
      this.router.navigate(['/admin/voyages/nouveau']);
    }
  }

  voirAvisVoyage(voyageId: number) {
    this.router.navigate(['/admin/voyages', voyageId, 'avis']);
  }

  // Système de Tri
  changerTri(critere: string) {
    if (this.critereTri === critere) {
      this.triAscendant = !this.triAscendant;
    } else {
      this.critereTri = critere;
      this.triAscendant = true;
    }
  }

  // Filtrage et Tri combinés appliqués au tableau
  get voyagesFiltres() {
    // 1. Filtrage dynamique
    let resultats = this.voyages.filter(v => {
      const recherche = this.texteRecherche.toLowerCase();
      const depart = (v.villeDepart || v.ville_depart || '').toLowerCase();
      const arrivee = (v.villeArrivee || v.ville_arrivee || '').toLowerCase();
      const statut = (v.statut || '').toLowerCase();
      return depart.includes(recherche) || arrivee.includes(recherche) || 
             statut.includes(recherche) || v.id.toString().includes(recherche);
    });

    // 2. Tri dynamique
    resultats.sort((a, b) => {
      let valA = a[this.critereTri] || a['ville_depart']; // Fallback au cas où
      let valB = b[this.critereTri] || b['ville_depart'];
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return this.triAscendant ? -1 : 1;
      if (valA > valB) return this.triAscendant ? 1 : -1;
      return 0;
    });

    return resultats;
  }
}