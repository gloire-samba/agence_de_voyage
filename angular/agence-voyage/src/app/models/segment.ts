export interface Segment {
  id: number;
  ordre: number;
  
  // Versions Spring (camelCase)
  villeDepart: string;
  villeArrivee: string;
  heureDepart: string;
  heureArrivee: string;

  // 👉 NOUVEAU : Versions Django (snake_case) tolérées par TypeScript
  ville_depart?: string;
  ville_arrivee?: string;
  heure_depart?: string;
  heure_arrivee?: string;
}