import { Avis } from "./avis";
import { Segment } from "./segment";


export interface Voyage {
  id: number;
  villeDepart: string; // Fais attention au camelCase côté Angular !
  villeArrivee: string;
  prixTotal: number;
  noteMoyenne: number;
  statut?: string; // 👉 NOUVEAU : Le statut commercial du voyageœ
  segments: Segment[];
  avis: Avis[];
}