export interface Segment {
  id: number;
  ordre: number;
  villeDepart: string;
  villeArrivee: string;
  heureDepart: string;
  heureArrivee: string;
  ville_depart?: string;
  ville_arrivee?: string;
  heure_depart?: string;
  heure_arrivee?: string;
}