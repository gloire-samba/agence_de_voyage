import { Injectable } from '@angular/core';

export type BackendType = 'spring' | 'django';

@Injectable({
  providedIn: 'root'
})
export class ServeurService {
  private readonly STORAGE_KEY = 'serveur_actif';
  
  // Par défaut, on choisit Spring
  private backendActif: BackendType = 'spring';

  constructor() {
    // Si l'utilisateur avait déjà choisi un serveur avant de rafraîchir la page, on le récupère
    const sauvegarde = localStorage.getItem(this.STORAGE_KEY) as BackendType;
    if (sauvegarde) {
      this.backendActif = sauvegarde;
    }
  }

  getBackend(): BackendType {
    return this.backendActif;
  }

  setBackend(backend: BackendType): void {
    this.backendActif = backend;
    localStorage.setItem(this.STORAGE_KEY, backend);
    // Recharger la page pour forcer les services à prendre la nouvelle URL
    window.location.reload(); 
  }
}