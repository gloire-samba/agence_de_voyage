import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms'; // 👈 NOUVEAU
import { Voyage } from '../../models/voyage';

@Component({
  selector: 'app-catalogue',
  standalone: true,
  imports: [CommonModule, DatePipe, CurrencyPipe, FormsModule], // 👈 NOUVEAU
  templateUrl: './catalogue.component.html',
  styleUrls: ['./catalogue.component.css']
})
export class CatalogueComponent {
  @Input() voyages: Voyage[] = [];
  @Output() reserver = new EventEmitter<Voyage>();

  onReserver(voyage: Voyage) {
    this.reserver.emit(voyage);
  }

  // ==========================================
  // 👉 SYSTÈME DE TRI
  // ==========================================
  critereTri: string = '';

  trierVoyages() {
    if (!this.critereTri) return;

    this.voyages.sort((a, b) => {
      let valA: any, valB: any;

      switch (this.critereTri) {
        case 'prix_asc':
        case 'prix_desc':
          valA = this.getPrix(a);
          valB = this.getPrix(b);
          break;
        case 'note_asc':
        case 'note_desc':
          // On convertit "N/A" en 0 pour le tri
          valA = parseFloat(this.getNoteMoyenne(a)) || 0;
          valB = parseFloat(this.getNoteMoyenne(b)) || 0;
          break;
        case 'escales_asc':
        case 'escales_desc':
          valA = this.getNbEscales(a);
          valB = this.getNbEscales(b);
          break;
        case 'date_asc':
        case 'date_desc':
          valA = new Date(this.getDateDepart(a)).getTime() || 0;
          valB = new Date(this.getDateDepart(b)).getTime() || 0;
          break;
      }

      if (this.critereTri.endsWith('_desc')) {
        return valB > valA ? 1 : valB < valA ? -1 : 0;
      } else {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      }
    });
  }

  // ==========================================
  // 👉 GESTION DES MODALES DE CONSULTATION
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

  // 🛡️ --- MÉTHODES DE LECTURE UNIVERSELLES (Spring / Django) --- 🛡️

  getVilleDepart(v: Voyage): string {
    return v.villeDepart || (v as any).ville_depart || 'Inconnu';
  }

  getVilleArrivee(v: Voyage): string {
    return v.villeArrivee || (v as any).ville_arrivee || 'Inconnu';
  }

  getPrix(v: Voyage): number {
    return v.prixTotal || (v as any).prix_total || 0;
  }

  getDateDepart(v: Voyage): string {
    if (v.segments && v.segments.length > 0) {
      return v.segments[0].heureDepart || (v.segments[0] as any).heure_depart || '';
    }
    return '';
  }

  getNbEscales(v: Voyage): number {
    if (v.segments) {
      return v.segments.length - 1;
    }
    return 0;
  }

  getNoteMoyenne(v: Voyage): string {
    const note = v.noteMoyenne || (v as any).note_moyenne;
    return note !== undefined && note !== null ? Number(note).toFixed(1) : 'N/A';
  }

  getNombreAvis(v: Voyage): number {
    if (v.avis && Array.isArray(v.avis)) {
      return v.avis.length;
    }
    return 0;
  }

  getStatut(v: Voyage): string {
    return v.statut || 'A_VENIR';
  }
}