import type{ Avis } from "./avis";
import type{ Segment } from "./segment";

export interface Voyage {
  id: number;
  villeDepart: string; 
  ville_depart?: string; 
  villeArrivee: string;
  ville_arrivee?: string; 
  prixTotal: number;
  prix_total?: number; 
  noteMoyenne: number;
  note_moyenne?: number; 
  nombrePlacesTotal?: number; 
  nombre_places_total?: number; 
  placesRestantes?: number;
  places_restantes?: number;
  statut?: string; 
  segments: Segment[];
  avis: Avis[];
}