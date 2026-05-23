import type { Voyage } from "./voyage";

export interface RechercheIntelligenteResponse {
  texteReconnu: string; 
  resultats: Voyage[];  
  erreur?: string;      
}