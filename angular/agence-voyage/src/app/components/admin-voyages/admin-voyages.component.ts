import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; 
import { VoyageService } from '../../services/voyage.service';

@Component({
  selector: 'app-admin-voyages',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-voyages.component.html',
  styleUrls: ['./admin-voyages.component.css'] 
})
export class AdminVoyagesComponent implements OnInit {
  private voyageService = inject(VoyageService);
  private router = inject(Router);

  voyages: any[] = [];
  
  // 👉 OUTILS DE FILTRAGE
  texteRecherche: string = '';
  filtreDepart: string = '';
  filtreArrivee: string = '';
  filtreDate: string = '';
  filtreDureeMax: number | null = null; 
  filtreEscales: number | null = null;
  filtreNoteMin: number | null = null;
  filtreDureeExacte: number | null = null;
  
  // 👉 NOUVEAU : Filtre par statut (Vide par défaut = Tous)
  filtreStatut: string = ''; 
  
  critereTri: string = 'id';
  triAscendant: boolean = true;

  ngOnInit() {
    this.chargerVoyages();
  }

  chargerVoyages() {
    this.voyageService.getTousLesVoyages().subscribe({
      next: (data: any) => {
        const donneesBrutes = data?.results || data?.content || data?._embedded?.voyages || data;
        this.voyages = Array.isArray(donneesBrutes) ? donneesBrutes : [];
      },
      error: (err) => console.error("Erreur chargement voyages", err)
    });
  }

  supprimerOuAnnulerVoyage(voyage: any) {
    const choixSoftDelete = window.confirm(
      `Voyage #${voyage.id} : ${voyage.villeDepart || voyage.ville_depart} ➔ ${voyage.villeArrivee || voyage.ville_arrivee}\n\n` +
      `[OK] = ANNULER le voyage.\n` +
      `[Annuler] = Tenter une SUPPRESSION définitive.`
    );

    if (choixSoftDelete) {
      const voyageAnnule = { 
        ...voyage, 
        statut: 'ANNULE',
        nombrePlacesTotal: voyage.nombrePlacesTotal || voyage.nombre_places_total || 0,
        prixTotal: voyage.prixTotal || voyage.prix_total || 0
      };

      this.voyageService.modifierVoyage(voyage.id, voyageAnnule).subscribe({
        next: () => { alert('✅ Voyage annulé avec succès.'); this.chargerVoyages(); },
        error: () => alert('❌ Erreur lors de l\'annulation.')
      });
    } else {
      const confirmationHard = window.confirm("⚠️ Tenter la suppression ? Cela sera bloqué si des clients ont déjà réservé ce voyage.");
      if (confirmationHard) {
        this.voyageService.supprimerVoyage(voyage.id).subscribe({
          next: () => { alert('✅ Voyage supprimé définitivement.'); this.chargerVoyages(); },
          error: () => alert("❌ IMPOSSIBLE : Ce voyage possède des réservations ou des avis liés. Veuillez l'annuler à la place.")
        });
      }
    }
  }

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

  changerTri(critere: string) {
    if (this.critereTri === critere) {
      this.triAscendant = !this.triAscendant;
    } else {
      this.critereTri = critere;
      this.triAscendant = true;
    }
  }

  getDureeMinutes(v: any): number {
    if (!v.segments || v.segments.length === 0) return 0;
    const d1 = new Date(v.segments[0].heureDepart || v.segments[0].heure_depart).getTime();
    const d2 = new Date(v.segments[v.segments.length - 1].heureArrivee || v.segments[v.segments.length - 1].heure_arrivee).getTime();
    return Math.floor((d2 - d1) / 60000);
  }

  getDureeFormattee(v: any): string {
    const totalMinutes = this.getDureeMinutes(v);
    if (totalMinutes <= 0) return 'N/A';
    
    const jours = Math.floor(totalMinutes / 1440);
    const heures = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    
    let result = '';
    if (jours > 0) result += `${jours}j `;
    if (heures > 0 || jours > 0) result += `${heures}h `;
    result += `${minutes}m`;
    
    return result.trim();
  }

  get voyagesFiltres() {
    let resultats = this.voyages.filter(v => {
      const depart = (v.villeDepart || v.ville_depart || '').toLowerCase();
      const arrivee = (v.villeArrivee || v.ville_arrivee || '').toLowerCase();
      const statutStr = (v.statut || '').toLowerCase();
      const rechercheGlobale = this.texteRecherche.toLowerCase();

      // 1. Recherche globale
      const matchGlobal = !this.texteRecherche || 
                          depart.includes(rechercheGlobale) || 
                          arrivee.includes(rechercheGlobale) || 
                          statutStr.includes(rechercheGlobale) || 
                          v.id.toString().includes(rechercheGlobale);

      // 2. Villes
      const matchDepart = !this.filtreDepart || depart.includes(this.filtreDepart.toLowerCase());
      const matchArrivee = !this.filtreArrivee || arrivee.includes(this.filtreArrivee.toLowerCase());
      
      // 3. Date
      let matchDate = true;
      if (this.filtreDate) {
        matchDate = false;
        if (v.segments && v.segments.length > 0) {
          const heureDep = v.segments[0].heureDepart || v.segments[0].heure_depart || '';
          if (heureDep.startsWith(this.filtreDate)) matchDate = true;
        }
      }

      // 4. Durée Maximale
      let matchDureeMax = true;
      if (this.filtreDureeMax !== null) {
        matchDureeMax = this.getDureeMinutes(v) <= (this.filtreDureeMax * 60);
      }

      // 5. Escales exactes
      let matchEscales = true;
      if (this.filtreEscales !== null) {
        const nbEscales = v.segments && v.segments.length > 0 ? v.segments.length - 1 : 0;
        matchEscales = nbEscales === this.filtreEscales;
      }

      // 6. Note minimum
      let matchNote = true;
      if (this.filtreNoteMin !== null) {
        const note = parseFloat(v.noteMoyenne || v.note_moyenne || '0');
        matchNote = note >= this.filtreNoteMin;
      }

      // 7. Durée exacte
      let matchDureeExacte = true;
      if (this.filtreDureeExacte !== null) {
        const heuresTotales = Math.floor(this.getDureeMinutes(v) / 60);
        matchDureeExacte = heuresTotales === this.filtreDureeExacte;
      }

      // 👉 8. NOUVEAU : Le match exact sur le Statut
      let matchStatutFiltre = true;
      if (this.filtreStatut !== '') {
        const statutDuVoyage = (v.statut || 'A_VENIR').toUpperCase();
        matchStatutFiltre = statutDuVoyage === this.filtreStatut;
      }

      return matchGlobal && matchDepart && matchArrivee && matchDate && matchDureeMax && matchEscales && matchNote && matchDureeExacte && matchStatutFiltre;
    });

    resultats.sort((a, b) => {
      let valA: any, valB: any;
      if (this.critereTri === 'duree') {
        valA = this.getDureeMinutes(a);
        valB = this.getDureeMinutes(b);
      } else {
        valA = a[this.critereTri] || a['ville_depart']; 
        valB = b[this.critereTri] || b['ville_depart'];
      }
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      
      if (valA < valB) return this.triAscendant ? -1 : 1;
      if (valA > valB) return this.triAscendant ? 1 : -1;
      return 0;
    });

    return resultats;
  }
}