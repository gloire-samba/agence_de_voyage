import { Avis } from "./avis";
import { Segment } from "./segment";

export interface Voyage {
  id: number;
  
  villeDepart: string; 
  ville_depart?: string; // Pour Django
  
  villeArrivee: string;
  ville_arrivee?: string; // Pour Django
  
  prixTotal: number;
  prix_total?: number; // Pour Django
  
  noteMoyenne: number;
  note_moyenne?: number; // Pour Django
  
  // 👉 NOUVEAU : La capacité totale
  nombrePlacesTotal?: number; // Pour Spring
  nombre_places_total?: number; // Pour Django
  
  statut?: string; 
  
  segments: Segment[];
  avis: Avis[];
}