import { Voyage } from "./voyage";


export interface RechercheIntelligenteResponse {
  texteReconnu: string; // Ce que l'IA a entendu/compris
  resultats: Voyage[];  // Le catalogue filtré
  erreur?: string;      // En cas de code 503 / 429
}