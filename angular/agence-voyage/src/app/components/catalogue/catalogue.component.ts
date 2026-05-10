import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { Voyage } from '../../models/voyage';

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [CommonModule, DatePipe, CurrencyPipe, FormsModule], 
  templateUrl: './catalogue.component.html',
  styleUrls: ['./catalogue.component.css']
})
export class CatalogueComponent implements OnChanges {
  @Input() voyages: Voyage[] = [];
  
  // 👉 NOUVEAU : On n'émet plus juste un Voyage, mais aussi le nombre de places demandées !
  @Output() reserver = new EventEmitter<{voyage: Voyage, nbPlaces: number}>();

  // Dictionnaire pour stocker le nombre de places choisies pour chaque voyage (ex: { 1: 3, 2: 1 })
  placesSelectionnees: { [voyageId: number]: number } = {};

  // Quand la liste des voyages est mise à jour (via la recherche), on initialise les compteurs à 1
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

  getCapaciteTotale(v: Voyage): number {
    return v.nombrePlacesTotal || (v as any).nombre_places_total || 0;
  }

  getPlacesRestantes(v: Voyage): number {
    // Si la donnée vient de la recherche IA (qui calcule les places restantes)
    const restantes = (v as any).placesRestantes || (v as any).places_restantes;
    if (restantes !== undefined && restantes !== null) return restantes;
    
    // Fallback : Si la route classique ne le renvoie pas encore, on affiche la capacité max
    return this.getCapaciteTotale(v);
  }

  incrementerPlace(voyage: Voyage) {
    const max = this.getPlacesRestantes(voyage);
    const actuel = this.placesSelectionnees[voyage.id] || 1;
    if (actuel < max) {
      this.placesSelectionnees[voyage.id] = actuel + 1;
    }
  }

  decrementerPlace(voyage: Voyage) {
    const actuel = this.placesSelectionnees[voyage.id] || 1;
    if (actuel > 1) {
      this.placesSelectionnees[voyage.id] = actuel - 1;
    }
  }

  onReserver(voyage: Voyage) {
    const nbPlaces = this.placesSelectionnees[voyage.id] || 1;
    this.reserver.emit({ voyage, nbPlaces }); // On envoie le "pack" au parent
  }

  // ==========================================
  // 👉 SYSTÈME DE TRI (Conservé)
  // ==========================================
  critereTri: string = '';

  trierVoyages() {
    if (!this.critereTri) return;
    this.voyages.sort((a, b) => {
      let valA: any, valB: any;
      switch (this.critereTri) {
        case 'prix_asc':
        case 'prix_desc':
          valA = this.getPrix(a); valB = this.getPrix(b); break;
        case 'note_asc':
        case 'note_desc':
          valA = parseFloat(this.getNoteMoyenne(a)) || 0; valB = parseFloat(this.getNoteMoyenne(b)) || 0; break;
        case 'escales_asc':
        case 'escales_desc':
          valA = this.getNbEscales(a); valB = this.getNbEscales(b); break;
        case 'date_asc':
        case 'date_desc':
          valA = new Date(this.getDateDepart(a)).getTime() || 0; valB = new Date(this.getDateDepart(b)).getTime() || 0; break;
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

  ouvrirModal(type: 'SEGMENTS' | 'AVIS', voyage: Voyage) { this.voyageSelectionne = voyage; this.modalActive = type; }
  fermerModal() { this.modalActive = null; this.voyageSelectionne = null; }

  getVilleDepart(v: Voyage): string { return v.villeDepart || (v as any).ville_depart || 'Inconnu'; }
  getVilleArrivee(v: Voyage): string { return v.villeArrivee || (v as any).ville_arrivee || 'Inconnu'; }
  getPrix(v: Voyage): number { return v.prixTotal || (v as any).prix_total || 0; }
  getDateDepart(v: Voyage): string {
    if (v.segments && v.segments.length > 0) return v.segments[0].heureDepart || (v.segments[0] as any).heure_depart || '';
    return '';
  }
  getNbEscales(v: Voyage): number { return v.segments ? v.segments.length - 1 : 0; }
  getNoteMoyenne(v: Voyage): string {
    const note = v.noteMoyenne || (v as any).note_moyenne;
    return note !== undefined && note !== null ? Number(note).toFixed(1) : 'N/A';
  }
  getNombreAvis(v: Voyage): number { return v.avis && Array.isArray(v.avis) ? v.avis.length : 0; }
  getStatut(v: Voyage): string { return v.statut || 'A_VENIR'; }
}