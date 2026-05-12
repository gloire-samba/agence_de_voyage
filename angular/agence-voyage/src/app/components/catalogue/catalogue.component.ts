import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Voyage } from '../../models/voyage';

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule], 
  templateUrl: './catalogue.component.html',
  styleUrls: ['./catalogue.component.css']
})
export class CatalogueComponent implements OnChanges {
  @Input() voyages: Voyage[] = [];
  
  @Output() reserver = new EventEmitter<{voyage: Voyage, nbPlaces: number}>();

  // Dictionnaire pour stocker le nombre de places choisies pour chaque voyage
  placesSelectionnees: { [voyageId: number]: number } = {};

  // Quand la liste des voyages est mise à jour, on initialise les compteurs à 1
  ngOnChanges(changes: SimpleChanges) {
    if (changes['voyages']) {
      this.voyages.forEach(v => {
        if (!this.placesSelectionnees[v.id]) {
          this.placesSelectionnees[v.id] = 1;
        }
      });
    }
  }

  // ==========================================
  // 👉 GESTION DES PLACES ET COMPTEURS
  // ==========================================

  getPlacesDisponibles(v: Voyage): number {
    const capacite = v.nombrePlacesTotal || (v as any).nombre_places_total || 0;
    if ((v as any).placesRestantes !== undefined && (v as any).placesRestantes !== null) {
      return (v as any).placesRestantes;
    } else if ((v as any).places_restantes !== undefined && (v as any).places_restantes !== null) {
      return (v as any).places_restantes;
    }
    return capacite;
  }

  incrementerPlace(v: Voyage) {
    const max = this.getPlacesDisponibles(v);
    if (!this.placesSelectionnees[v.id]) this.placesSelectionnees[v.id] = 1;
    if (this.placesSelectionnees[v.id] < max) {
      this.placesSelectionnees[v.id]++;
    }
  }

  decrementerPlace(v: Voyage) {
    if (!this.placesSelectionnees[v.id]) this.placesSelectionnees[v.id] = 1;
    if (this.placesSelectionnees[v.id] > 1) {
      this.placesSelectionnees[v.id]--;
    }
  }

  onReserver(voyage: Voyage) {
    const nbPlaces = this.placesSelectionnees[voyage.id] || 1;
    this.reserver.emit({ voyage, nbPlaces });
  }

  // ==========================================
  // 👉 SYSTÈME DE TRI
  // ==========================================
  critereTri: string = '';

  trierVoyages() {
    if (!this.critereTri) return;
    
    this.voyages.sort((a, b) => {
      let valA: any, valB: any;

      if (this.critereTri.startsWith('prix')) {
        valA = this.getPrix(a);
        valB = this.getPrix(b);
      } else if (this.critereTri.startsWith('date')) {
        valA = new Date(this.getDateDepart(a)).getTime();
        valB = new Date(this.getDateDepart(b)).getTime();
      } else if (this.critereTri.startsWith('escales')) {
        valA = this.getNbEscales(a);
        valB = this.getNbEscales(b);
      } else if (this.critereTri.startsWith('note')) {
        valA = parseFloat(this.getNoteMoyenne(a)) || 0;
        valB = parseFloat(this.getNoteMoyenne(b)) || 0;
      } else if (this.critereTri.startsWith('duree')) {
        valA = this.getDureeMinutes(a);
        valB = this.getDureeMinutes(b);
      }

      if (this.critereTri.endsWith('_desc')) return valB > valA ? 1 : valB < valA ? -1 : 0;
      else return valA > valB ? 1 : valA < valB ? -1 : 0;
    });
  }

  // ==========================================
  // 👉 MODALES ET LECTURES UNIVERSELLES
  // ==========================================
  voyageSelectionne: Voyage | null = null;
  modalActive: 'SEGMENTS' | 'AVIS' | null = null;

  ouvrirModal(type: 'SEGMENTS' | 'AVIS', voyage: Voyage) { 
    this.voyageSelectionne = voyage; 
    this.modalActive = type; 
  }
  
  fermerModal() { 
    this.modalActive = null; 
    this.voyageSelectionne = null; 
  }

  getVilleDepart(v: Voyage): string { return v.villeDepart || (v as any).ville_depart || 'Inconnu'; }
  getVilleArrivee(v: Voyage): string { return v.villeArrivee || (v as any).ville_arrivee || 'Inconnu'; }
  getPrix(v: Voyage): number { return v.prixTotal || (v as any).prix_total || 0; }
  
  getDateDepart(v: Voyage): string {
    if (v.segments && v.segments.length > 0) return v.segments[0].heureDepart || (v.segments[0] as any).heure_depart || '';
    return '';
  }
  
  getNbEscales(v: Voyage): number { return (v.segments && v.segments.length > 0) ? v.segments.length - 1 : 0;}
  
  getNoteMoyenne(v: Voyage): string {
    const note = v.noteMoyenne || (v as any).note_moyenne;
    return note !== undefined && note !== null ? Number(note).toFixed(1) : 'N/A';
  }
  
  getNombreAvis(v: Voyage): number { return v.avis && Array.isArray(v.avis) ? v.avis.length : 0; }
  getStatut(v: Voyage): string { return v.statut || 'A_VENIR'; }

  // ==========================================
  // 👉 GESTION DU CALCUL DE LA DURÉE
  // ==========================================
  getDureeMinutes(v: Voyage): number {
    if (!v.segments || v.segments.length === 0) return 0;
    const datesDep = v.segments.map(s => new Date(s.heureDepart || (s as any).heure_depart).getTime());
    const datesArr = v.segments.map(s => new Date(s.heureArrivee || (s as any).heure_arrivee).getTime());
    const minDep = Math.min(...datesDep);
    const maxArr = Math.max(...datesArr);
    return Math.floor((maxArr - minDep) / (1000 * 60)); 
  }

  getDureeFormattee(v: Voyage): string {
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
}